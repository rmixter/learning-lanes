/**
 * LaneItemManager - Manages items within a lane
 */

import { useState } from 'react';
import type { LaneWithItems, LaneItem, ContentType, YouTubeData, WebLinkData } from '../../types';
import { createItem, updateItem, deleteItem, extractYouTubeVideoId, getYouTubeThumbnail } from '../../lib/firestore';

interface LaneItemManagerProps {
  lane: LaneWithItems;
  onItemsChanged: () => void;
}

const categoryColors: Record<string, string> = {
  School: 'from-blue-500 to-blue-600',
  Music: 'from-purple-500 to-pink-500',
  Fun: 'from-orange-500 to-red-500',
  Creativity: 'from-green-500 to-teal-500',
};

type ItemForm = {
  title: string;
  type: ContentType;
  youtubeUrl: string;
  webUrl: string;
  startTime: string;
  endTime: string;
  loop: boolean;
  allowNavigation: boolean;
  canEmbed: boolean;
};

const defaultForm: ItemForm = {
  title: '',
  type: 'youtube_video',
  youtubeUrl: '',
  webUrl: '',
  startTime: '',
  endTime: '',
  loop: false,
  allowNavigation: false,
  canEmbed: true, // Default to true - most sites allow embedding
};

export default function LaneItemManager({ lane, onItemsChanged }: LaneItemManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<LaneItem | null>(null);
  const [form, setForm] = useState<ItemForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = editingItem !== null;

  // Open form for adding new item
  const handleAddNew = () => {
    setEditingItem(null);
    setForm(defaultForm);
    setError(null);
    setShowForm(true);
  };

  // Open form for editing existing item
  const handleEdit = (item: LaneItem) => {
    setEditingItem(item);
    setError(null);
    
    // Populate form with item data
    if (item.type === 'youtube_video') {
      const ytData = item.data as YouTubeData;
      setForm({
        title: item.title,
        type: 'youtube_video',
        youtubeUrl: ytData.videoId,
        webUrl: '',
        startTime: ytData.startTime?.toString() || '',
        endTime: ytData.endTime?.toString() || '',
        loop: ytData.loop || false,
        allowNavigation: false,
        canEmbed: true,
      });
    } else if (item.type === 'web_link') {
      const webData = item.data as WebLinkData;
      setForm({
        title: item.title,
        type: 'web_link',
        youtubeUrl: '',
        webUrl: webData.url,
        startTime: '',
        endTime: '',
        loop: false,
        allowNavigation: webData.allowNavigation || false,
        canEmbed: webData.canEmbed !== false, // Default true if not specified
      });
    }
    
    setShowForm(true);
  };

  // Close form
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setForm(defaultForm);
    setError(null);
  };

  // Submit form (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError('Please enter a title');
      return;
    }

    setSaving(true);
    try {
      let itemData: Omit<LaneItem, 'id'>;

      if (form.type === 'youtube_video') {
        const videoId = extractYouTubeVideoId(form.youtubeUrl);
        if (!videoId) {
          setError('Invalid YouTube URL or video ID');
          setSaving(false);
          return;
        }

        // Build data object - only include optional fields if they have values
        // Firestore doesn't accept undefined values
        const data: YouTubeData = {
          videoId,
          loop: form.loop,
        };
        
        // Only add startTime/endTime if they have values
        if (form.startTime) {
          data.startTime = parseInt(form.startTime);
        }
        if (form.endTime) {
          data.endTime = parseInt(form.endTime);
        }

        itemData = {
          title: form.title.trim(),
          thumbnailUrl: getYouTubeThumbnail(videoId),
          type: 'youtube_video',
          data,
        };
      } else if (form.type === 'web_link') {
        if (!form.webUrl.trim()) {
          setError('Please enter a URL');
          setSaving(false);
          return;
        }

        const data: WebLinkData = {
          url: form.webUrl.trim(),
          allowNavigation: form.allowNavigation,
        };
        
        // Only add canEmbed if it's false (to avoid storing undefined in Firestore)
        if (!form.canEmbed) {
          data.canEmbed = false;
        }

        itemData = {
          title: form.title.trim(),
          thumbnailUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(form.webUrl)}&sz=128`,
          type: 'web_link',
          data,
        };
      } else {
        setError('Unsupported content type');
        setSaving(false);
        return;
      }

      if (isEditing && editingItem) {
        // Update existing item
        await updateItem(lane.id, editingItem.id, itemData);
      } else {
        // Create new item
        await createItem(lane.id, itemData);
      }
      
      handleCloseForm();
      onItemsChanged();
    } catch (err) {
      console.error('Failed to save item:', err);
      setError(`Failed to ${isEditing ? 'update' : 'create'} item. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (item: LaneItem) => {
    if (!confirm(`Delete "${item.title}"?`)) return;

    try {
      await deleteItem(lane.id, item.id);
      onItemsChanged();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  return (
    <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${categoryColors[lane.category]}`} />
            <div>
              <h2 className="text-xl font-semibold text-white">{lane.title}</h2>
              <p className="text-sm text-gray-500">
                {lane.items.length} {lane.items.length === 1 ? 'item' : 'items'}
                {!lane.isActive && <span className="text-amber-500 ml-2">(Hidden)</span>}
              </p>
            </div>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-gray-900 font-medium rounded-lg
                     hover:bg-amber-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Content
          </button>
        </div>
      </div>

      {/* Add/Edit Item Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-gray-700/50 bg-gray-800/60">
          <h3 className="text-lg font-medium text-white mb-4">
            {isEditing ? 'Edit Content' : 'Add New Content'}
          </h3>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Content title..."
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white 
                       placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Content Type - disabled when editing */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => !isEditing && setForm({ ...form, type: 'youtube_video' })}
                disabled={isEditing}
                className={`flex-1 px-4 py-3 rounded-lg border transition-all flex items-center justify-center gap-2
                  ${form.type === 'youtube_video'
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600'
                  }
                  ${isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                YouTube
              </button>
              <button
                type="button"
                onClick={() => !isEditing && setForm({ ...form, type: 'web_link' })}
                disabled={isEditing}
                className={`flex-1 px-4 py-3 rounded-lg border transition-all flex items-center justify-center gap-2
                  ${form.type === 'web_link'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                    : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600'
                  }
                  ${isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Website
              </button>
            </div>
            {isEditing && (
              <p className="text-xs text-gray-500 mt-1">Content type cannot be changed when editing</p>
            )}
          </div>

          {/* YouTube Fields */}
          {form.type === 'youtube_video' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">YouTube URL or Video ID</label>
                <input
                  type="text"
                  value={form.youtubeUrl}
                  onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                  placeholder="https://youtube.com/watch?v=... or video ID"
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white 
                           placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Start Time (seconds)</label>
                  <input
                    type="number"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white 
                             placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">End Time (seconds)</label>
                  <input
                    type="number"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    placeholder="Optional"
                    min="0"
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white 
                             placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.loop}
                  onChange={(e) => setForm({ ...form, loop: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900/50 text-amber-500 
                           focus:ring-amber-500 focus:ring-offset-gray-900"
                />
                <span className="text-gray-400">Loop video</span>
              </label>
            </>
          )}

          {/* Web Link Fields */}
          {form.type === 'web_link' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Website URL</label>
                <input
                  type="url"
                  value={form.webUrl}
                  onChange={(e) => setForm({ ...form, webUrl: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white 
                           placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.canEmbed}
                  onChange={(e) => setForm({ ...form, canEmbed: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900/50 text-amber-500 
                           focus:ring-amber-500 focus:ring-offset-gray-900"
                />
                <span className="text-gray-400">Site allows embedding</span>
              </label>
              {!form.canEmbed && (
                <p className="text-xs text-amber-500/80 -mt-2 mb-4 ml-6">
                  Will show "Open Website" button instead of iframe (for sites like PBS Kids)
                </p>
              )}
              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allowNavigation}
                  onChange={(e) => setForm({ ...form, allowNavigation: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900/50 text-amber-500 
                           focus:ring-amber-500 focus:ring-offset-gray-900"
                />
                <span className="text-gray-400">Allow navigation within site</span>
              </label>
            </>
          )}

          {/* Form Actions */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-amber-500 text-gray-900 font-medium rounded-lg
                       hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Content'}
            </button>
            <button
              type="button"
              onClick={handleCloseForm}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Items List */}
      <div className="divide-y divide-gray-700/50">
        {lane.items.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            <p className="text-gray-500">No content in this lane yet</p>
            <button
              onClick={handleAddNew}
              className="mt-4 text-amber-500 hover:text-amber-400 font-medium"
            >
              Add your first item
            </button>
          </div>
        ) : (
          lane.items.map((item) => (
            <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-gray-800/40 transition-colors">
              {/* Thumbnail */}
              <div className="w-24 h-14 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                <img
                  src={item.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23666"><path d="M4 4h16v16H4z"/></svg>';
                  }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium truncate">{item.title}</h4>
                <p className="text-xs text-gray-500 flex items-center gap-2">
                  {item.type === 'youtube_video' && (
                    <>
                      <span className="text-red-400">YouTube</span>
                      {(item.data as YouTubeData).loop && <span className="text-amber-500">• Looping</span>}
                      {(item.data as YouTubeData).startTime && (
                        <span className="text-gray-500">• Starts at {(item.data as YouTubeData).startTime}s</span>
                      )}
                    </>
                  )}
                  {item.type === 'web_link' && <span className="text-blue-400">Website</span>}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-2 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/20 transition-colors"
                  title="Edit"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteItem(item)}
                  className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
