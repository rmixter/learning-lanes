/**
 * Admin Dashboard - Main admin interface for managing lanes and content
 */

import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $currentProfile, $isAdmin, initializeProfileStore } from '../../stores/profileStore';
import { getAllProfiles, clearWatchHistoryForProfile, clearBadgesForProfile } from '../../lib/firestore';
import type { Profile } from '../../types';
import ProfileLaneManager from './ProfileLaneManager';
import { clearProgress } from '../../stores/progressStore';

export default function AdminDashboard() {
  const currentProfile = useStore($currentProfile);
  const isAdmin = useStore($isAdmin);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [devMessage, setDevMessage] = useState<string | null>(null);

  // Initialize profile store from localStorage
  useEffect(() => {
    initializeProfileStore();
    setInitialized(true);
  }, []);

  // Load profiles after initialization
  useEffect(() => {
    if (!initialized) return;
    
    async function loadProfiles() {
      try {
        const allProfiles = await getAllProfiles();
        setProfiles(allProfiles);
        // Default to first non-admin profile or first profile
        const defaultProfile = allProfiles.find(p => p.role === 'child') || allProfiles[0];
        if (defaultProfile) {
          setSelectedProfileId(defaultProfile.id);
        }
      } catch (error) {
        console.error('Failed to load profiles:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProfiles();
  }, [initialized]);

  // Redirect to home if not admin (must be before any early returns!)
  useEffect(() => {
    if (initialized && !isAdmin) {
      window.location.href = '/';
    }
  }, [initialized, isAdmin]);

  // Show loading while initializing or if not admin (redirecting)
  if (!initialized || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-gray-800/50">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 
                             flex items-center justify-center shadow-lg shadow-amber-500/30">
                <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </a>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">Manage lanes and content</p>
            </div>
          </div>

          {/* User Info & Back Button */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-white font-medium">{currentProfile?.displayName}</p>
              <p className="text-amber-500 text-sm">Admin</p>
            </div>
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-xl
                        bg-gray-800/60 border border-gray-700/50
                        text-gray-300 hover:text-white hover:bg-gray-800
                        hover:border-amber-500/50 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Back to Dashboard</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {/* Profile Selector */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-400 mb-3">
                Managing content for:
              </label>
              <div className="flex flex-wrap gap-3">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
                      ${selectedProfileId === profile.id
                        ? 'bg-amber-500/20 border-amber-500 text-white'
                        : 'bg-gray-800/40 border-gray-700/50 text-gray-400 hover:bg-gray-800/60 hover:text-white'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                      ${selectedProfileId === profile.id
                        ? 'bg-amber-500 text-gray-900'
                        : 'bg-gray-700 text-white'
                      }`}
                    >
                      {profile.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{profile.displayName}</p>
                      <p className="text-xs text-gray-500">
                        {profile.role === 'admin' ? 'Admin' : 'Child'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dev Tools */}
            {selectedProfile && selectedProfile.role === 'child' && (
              <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-red-400 font-bold">Dev Tools</h3>
                  <span className="text-red-400/60 text-xs">(for {selectedProfile.displayName})</span>
                </div>
                
                {devMessage && (
                  <div className="mb-3 p-2 rounded-lg bg-green-500/20 text-green-400 text-sm">
                    {devMessage}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={async () => {
                      if (!confirm(`Clear ALL watch history for ${selectedProfile.displayName}?`)) return;
                      const count = await clearWatchHistoryForProfile(selectedProfile.id);
                      clearProgress(); // Clear local state too
                      setDevMessage(`✅ Cleared ${count} watch records for ${selectedProfile.displayName}`);
                      setTimeout(() => setDevMessage(null), 3000);
                    }}
                    className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 
                             text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all
                             flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Watch History
                  </button>
                  
                  <button
                    onClick={async () => {
                      if (!confirm(`Clear ALL badges for ${selectedProfile.displayName}?`)) return;
                      const count = await clearBadgesForProfile(selectedProfile.id);
                      clearProgress(); // Clear local state too
                      setDevMessage(`✅ Cleared ${count} badges for ${selectedProfile.displayName}`);
                      setTimeout(() => setDevMessage(null), 3000);
                    }}
                    className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 
                             text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all
                             flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    Clear Badges
                  </button>
                  
                  <button
                    onClick={async () => {
                      if (!confirm(`Clear ALL progress (watches + badges) for ${selectedProfile.displayName}?`)) return;
                      const watchCount = await clearWatchHistoryForProfile(selectedProfile.id);
                      const badgeCount = await clearBadgesForProfile(selectedProfile.id);
                      clearProgress(); // Clear local state too
                      setDevMessage(`✅ Cleared ${watchCount} watches and ${badgeCount} badges for ${selectedProfile.displayName}`);
                      setTimeout(() => setDevMessage(null), 3000);
                    }}
                    className="px-4 py-2 rounded-lg bg-red-600/30 border border-red-500/50 
                             text-red-300 hover:bg-red-600/40 hover:text-red-200 transition-all
                             flex items-center gap-2 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset All Progress
                  </button>
                </div>
              </div>
            )}

            {/* Lane Manager */}
            {selectedProfile && (
              <ProfileLaneManager 
                profile={selectedProfile} 
                key={selectedProfile.id} 
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
