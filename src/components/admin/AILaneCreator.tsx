// AI Lane Creator Component
import { useState, useRef, useEffect } from 'react';
import { createLane, createItem } from '../../lib/firestore';
import type { Profile, LaneCategory } from '../../types';

interface GeneratedItem {
  title: string;
  thumbnailUrl: string;
  type: 'youtube_video';
  data: {
    videoId: string;
    startTime?: number;
    endTime?: number;
    loop: boolean;
  };
  relevanceScore: number;
  reason: string;
  duration: string;
  channelTitle: string;
  selected: boolean;
}

interface GeneratedLane {
  title: string;
  description: string;
  category: LaneCategory;
  items: GeneratedItem[];
}

interface AILaneCreatorProps {
  profile: Profile;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AILaneCreator({ profile, onClose, onSuccess }: AILaneCreatorProps) {
  const [prompt, setPrompt] = useState('');
  const [maxVideos, setMaxVideos] = useState(6);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLane, setGeneratedLane] = useState<GeneratedLane | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !generating && !saving) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, generating, saving]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current && !generating && !saving) {
      onClose();
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedLane(null);

    try {
      const response = await fetch('/api/generate-lane', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          profileName: profile.displayName,
          ageLevel: profile.ageLevel || 'elementary',
          maxVideos,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate lane');
      }

      const data = await response.json();
      
      // Add selected property to each item
      const laneWithSelections: GeneratedLane = {
        ...data,
        items: data.items.map((item: any) => ({ ...item, selected: true })),
      };
      
      setGeneratedLane(laneWithSelections);
      setEditedTitle(laneWithSelections.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate lane');
    } finally {
      setGenerating(false);
    }
  };

  const toggleItemSelection = (index: number) => {
    if (!generatedLane) return;
    
    setGeneratedLane({
      ...generatedLane,
      items: generatedLane.items.map((item, i) => 
        i === index ? { ...item, selected: !item.selected } : item
      ),
    });
  };

  const handleSave = async () => {
    if (!generatedLane) return;

    const selectedItems = generatedLane.items.filter(item => item.selected);
    if (selectedItems.length === 0) {
      setError('Please select at least one video');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Create the lane
      const createdLane = await createLane({
        profileId: profile.id,
        title: editedTitle || generatedLane.title,
        category: generatedLane.category,
        isActive: true,
        sortOrder: 100, // Will be at the end
      });

      // Add each selected item
      for (const item of selectedItems) {
        await createItem(createdLane.id, {
          title: item.title,
          thumbnailUrl: item.thumbnailUrl,
          type: item.type,
          data: item.data,
        });
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lane');
      setSaving(false);
    }
  };

  return (
    <div
      ref={modalRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/90 backdrop-blur-sm animate-fadeIn overflow-y-auto"
    >
      <div className="w-full max-w-4xl bg-gradient-to-b from-gray-800 to-gray-900 
                      rounded-2xl border border-gray-700/50 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 
                          flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Lane Creator</h2>
              <p className="text-sm text-gray-400">
                Generate a curated lane for {profile.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={generating || saving}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 
                     transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Input Section */}
          {!generatedLane && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What would you like {profile.name} to learn?
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Guitar basics for beginners, Introduction to dinosaurs, Learning to draw animals..."
                  className="w-full h-24 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl
                           text-white placeholder-gray-500 focus:outline-none focus:ring-2 
                           focus:ring-purple-500 focus:border-transparent resize-none"
                  disabled={generating}
                />
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Number of videos
                  </label>
                  <select
                    value={maxVideos}
                    onChange={(e) => setMaxVideos(parseInt(e.target.value, 10))}
                    className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg
                             text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={generating}
                  >
                    {[4, 6, 8, 10, 12].map(n => (
                      <option key={n} value={n}>{n} videos</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white 
                         font-bold text-lg rounded-xl hover:from-purple-400 hover:to-pink-400
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all
                         flex items-center justify-center gap-3"
              >
                {generating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating lane with AI...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Lane
                  </>
                )}
              </button>

              {generating && (
                <div className="text-center">
                  <p className="text-gray-400 text-sm animate-pulse">
                    🔍 Searching YouTube for safe, educational content...
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    This may take 10-20 seconds
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Preview Section */}
          {generatedLane && (
            <div className="space-y-6">
              {/* Lane Info */}
              <div className="flex items-start gap-4 p-4 bg-gray-900/50 rounded-xl border border-gray-700/50">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Lane Title</label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                             text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                  <span className="inline-block px-3 py-2 bg-purple-500/20 text-purple-300 
                                 text-sm font-medium rounded-lg border border-purple-500/30">
                    {generatedLane.category}
                  </span>
                </div>
              </div>

              {/* Selected count */}
              <div className="flex items-center justify-between">
                <p className="text-gray-400">
                  <span className="text-white font-medium">
                    {generatedLane.items.filter(i => i.selected).length}
                  </span>
                  {' '}of {generatedLane.items.length} videos selected
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGeneratedLane({
                      ...generatedLane,
                      items: generatedLane.items.map(i => ({ ...i, selected: true })),
                    })}
                    className="text-sm text-purple-400 hover:text-purple-300"
                  >
                    Select all
                  </button>
                  <span className="text-gray-600">|</span>
                  <button
                    onClick={() => setGeneratedLane({
                      ...generatedLane,
                      items: generatedLane.items.map(i => ({ ...i, selected: false })),
                    })}
                    className="text-sm text-gray-400 hover:text-gray-300"
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              {/* Video Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                {generatedLane.items.map((item, index) => (
                  <div
                    key={item.data.videoId}
                    onClick={() => toggleItemSelection(index)}
                    className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-all
                              ${item.selected 
                                ? 'bg-purple-500/10 border-purple-500/50' 
                                : 'bg-gray-900/30 border-gray-700/30 opacity-50'}`}
                  >
                    {/* Checkbox */}
                    <div className="flex-shrink-0 pt-1">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center
                                    ${item.selected 
                                      ? 'bg-purple-500 border-purple-500' 
                                      : 'border-gray-600'}`}>
                        {item.selected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Thumbnail */}
                    <div className="flex-shrink-0 relative">
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        className="w-24 h-14 object-cover rounded-lg"
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 
                                     text-white text-xs rounded">
                        {item.duration}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-sm font-medium line-clamp-2">
                        {item.title}
                      </h4>
                      <p className="text-gray-500 text-xs mt-1 truncate">
                        {item.channelTitle}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded
                                       ${item.relevanceScore >= 90 ? 'bg-green-500/20 text-green-400' :
                                         item.relevanceScore >= 70 ? 'bg-yellow-500/20 text-yellow-400' :
                                         'bg-gray-500/20 text-gray-400'}`}>
                          {item.relevanceScore}% match
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-700/50">
                <button
                  onClick={() => {
                    setGeneratedLane(null);
                    setError(null);
                  }}
                  disabled={saving}
                  className="px-6 py-3 bg-gray-700 text-white font-medium rounded-xl
                           hover:bg-gray-600 disabled:opacity-50 transition-colors"
                >
                  ← Start Over
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || generatedLane.items.filter(i => i.selected).length === 0}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white 
                           font-bold rounded-xl hover:from-green-400 hover:to-emerald-400
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all
                           flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating lane...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create Lane ({generatedLane.items.filter(i => i.selected).length} videos)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
