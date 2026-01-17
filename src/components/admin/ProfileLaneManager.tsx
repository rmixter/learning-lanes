/**
 * ProfileLaneManager - Manages lanes for a specific profile
 */

import { useState, useEffect } from 'react';
import type { Profile, Lane, LaneWithItems, LaneCategory } from '../../types';
import { getLanesForProfile, getLaneWithItems, createLane, updateLane, deleteLane } from '../../lib/firestore';
import LaneItemManager from './LaneItemManager';
import AILaneCreator from './AILaneCreator';

interface ProfileLaneManagerProps {
  profile: Profile;
}

const CATEGORIES: LaneCategory[] = [
  'School', 'Music', 'Fun', 'Creativity', 
  'Learning', 'Entertainment', 'Science', 'Math', 'Reading', 'Other'
];

const categoryColors: Record<LaneCategory, string> = {
  School: 'from-blue-500 to-blue-600',
  Music: 'from-purple-500 to-pink-500',
  Fun: 'from-orange-500 to-red-500',
  Creativity: 'from-green-500 to-teal-500',
  Learning: 'from-cyan-500 to-blue-500',
  Entertainment: 'from-pink-500 to-rose-500',
  Science: 'from-emerald-500 to-green-500',
  Math: 'from-indigo-500 to-violet-500',
  Reading: 'from-amber-500 to-yellow-500',
  Other: 'from-gray-500 to-gray-600',
};

export default function ProfileLaneManager({ profile }: ProfileLaneManagerProps) {
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [selectedLane, setSelectedLane] = useState<LaneWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewLaneForm, setShowNewLaneForm] = useState(false);
  const [showAICreator, setShowAICreator] = useState(false);
  const [newLane, setNewLane] = useState({ title: '', category: 'School' as LaneCategory });
  const [saving, setSaving] = useState(false);

  // Load lanes for this profile
  useEffect(() => {
    async function loadLanes() {
      setLoading(true);
      try {
        const profileLanes = await getLanesForProfile(profile.id, true); // Include inactive
        setLanes(profileLanes);
      } catch (error) {
        console.error('Failed to load lanes:', error);
      } finally {
        setLoading(false);
      }
    }
    loadLanes();
  }, [profile.id]);

  // Load selected lane with items
  const handleSelectLane = async (lane: Lane) => {
    try {
      const laneWithItems = await getLaneWithItems(lane.id);
      setSelectedLane(laneWithItems);
    } catch (error) {
      console.error('Failed to load lane items:', error);
    }
  };

  // Create new lane
  const handleCreateLane = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLane.title.trim()) return;

    setSaving(true);
    try {
      const createdLane = await createLane({
        profileId: profile.id,
        title: newLane.title.trim(),
        category: newLane.category,
        isActive: true,
        sortOrder: lanes.length + 1,
      });
      setLanes([...lanes, createdLane]);
      setNewLane({ title: '', category: 'School' });
      setShowNewLaneForm(false);
    } catch (error) {
      console.error('Failed to create lane:', error);
    } finally {
      setSaving(false);
    }
  };

  // Toggle lane active status
  const handleToggleActive = async (lane: Lane) => {
    try {
      await updateLane(lane.id, { isActive: !lane.isActive });
      setLanes(lanes.map(l => l.id === lane.id ? { ...l, isActive: !l.isActive } : l));
      if (selectedLane?.id === lane.id) {
        setSelectedLane({ ...selectedLane, isActive: !selectedLane.isActive });
      }
    } catch (error) {
      console.error('Failed to toggle lane:', error);
    }
  };

  // Delete lane
  const handleDeleteLane = async (lane: Lane) => {
    if (!confirm(`Delete "${lane.title}" and all its items? This cannot be undone.`)) return;

    try {
      await deleteLane(lane.id);
      setLanes(lanes.filter(l => l.id !== lane.id));
      if (selectedLane?.id === lane.id) {
        setSelectedLane(null);
      }
    } catch (error) {
      console.error('Failed to delete lane:', error);
    }
  };

  // Refresh lane items after changes
  const handleItemsChanged = async () => {
    if (selectedLane) {
      const updated = await getLaneWithItems(selectedLane.id);
      setSelectedLane(updated);
    }
  };

  // Handle AI lane creation success
  const handleAILaneSuccess = async () => {
    setShowAICreator(false);
    // Refresh the lanes list
    const profileLanes = await getLanesForProfile(profile.id, true);
    setLanes(profileLanes);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Lanes List */}
      <div className="lg:col-span-1">
        <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 overflow-hidden">
          <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {profile.displayName}'s Lanes
            </h2>
            <div className="flex items-center gap-2">
              {/* AI Lane Creator Button */}
              <button
                onClick={() => setShowAICreator(true)}
                className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white 
                         hover:from-purple-400 hover:to-pink-400 transition-all shadow-lg shadow-purple-500/20"
                title="Generate Lane with AI"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </button>
              {/* Manual Add Lane Button */}
              <button
                onClick={() => setShowNewLaneForm(true)}
                className="p-2 rounded-lg bg-amber-500 text-gray-900 hover:bg-amber-400 transition-colors"
                title="Add Lane Manually"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          {/* New Lane Form */}
          {showNewLaneForm && (
            <form onSubmit={handleCreateLane} className="p-4 border-b border-gray-700/50 bg-gray-800/60">
              <input
                type="text"
                value={newLane.title}
                onChange={(e) => setNewLane({ ...newLane, title: e.target.value })}
                placeholder="Lane title..."
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white 
                         placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3"
                autoFocus
              />
              <select
                value={newLane.category}
                onChange={(e) => setNewLane({ ...newLane, category: e.target.value as LaneCategory })}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white 
                         focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || !newLane.title.trim()}
                  className="flex-1 px-4 py-2 bg-amber-500 text-gray-900 font-medium rounded-lg
                           hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Creating...' : 'Create Lane'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewLaneForm(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Lanes List */}
          <div className="divide-y divide-gray-700/50">
            {lanes.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No lanes yet. Create one to get started!
              </div>
            ) : (
              lanes.map((lane) => (
                <div
                  key={lane.id}
                  className={`p-4 cursor-pointer transition-colors
                    ${selectedLane?.id === lane.id 
                      ? 'bg-amber-500/10 border-l-4 border-l-amber-500' 
                      : 'hover:bg-gray-800/60 border-l-4 border-l-transparent'
                    }
                    ${!lane.isActive ? 'opacity-50' : ''}`}
                  onClick={() => handleSelectLane(lane)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${categoryColors[lane.category]}`} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{lane.title}</h3>
                      <p className="text-xs text-gray-500">{lane.category}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleActive(lane); }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          lane.isActive 
                            ? 'text-green-400 hover:bg-green-500/20' 
                            : 'text-gray-500 hover:bg-gray-700'
                        }`}
                        title={lane.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {lane.isActive ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          )}
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteLane(lane); }}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Lane Items Editor */}
      <div className="lg:col-span-2">
        {selectedLane ? (
          <LaneItemManager 
            lane={selectedLane} 
            onItemsChanged={handleItemsChanged}
          />
        ) : (
          <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <h3 className="text-xl font-medium text-gray-400 mb-2">Select a Lane</h3>
            <p className="text-gray-500">Choose a lane from the list to manage its content</p>
          </div>
        )}
      </div>

      {/* AI Lane Creator Modal */}
      {showAICreator && (
        <AILaneCreator
          profile={profile}
          onClose={() => setShowAICreator(false)}
          onSuccess={handleAILaneSuccess}
        />
      )}
    </div>
  );
}
