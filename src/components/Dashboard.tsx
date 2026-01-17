/**
 * Dashboard - Main app view showing lanes for the selected profile
 */

import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { $currentProfile, clearProfile, initializeProfileStore } from '../stores/profileStore';
import { $watchProgressMap, $earnedBadges, $totalCompleted, $newBadges, loadProgress, clearProgress, clearNewBadges } from '../stores/progressStore';
import ProfileSwitcher from './ProfileSwitcher';
import Lane from './Lane';
import ContentModal from './ContentModal';
import BadgeNotification from './BadgeNotification';
import BadgeDisplay from './BadgeDisplay';
import type { Lane as LaneType, LaneItem, LaneWithItems } from '../types';

export default function Dashboard() {
  const currentProfile = useStore($currentProfile);
  const watchProgressMap = useStore($watchProgressMap);
  const earnedBadges = useStore($earnedBadges);
  const totalCompleted = useStore($totalCompleted);
  const newBadges = useStore($newBadges);
  const [lanes, setLanes] = useState<LaneWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [showBadges, setShowBadges] = useState(false);

  // Initialize profile store on mount (hydrate from localStorage)
  useEffect(() => {
    initializeProfileStore();
    setInitialized(true);
  }, []);
  
  // Load progress when profile changes
  useEffect(() => {
    if (currentProfile) {
      loadProgress(currentProfile.id);
    } else {
      clearProgress();
    }
  }, [currentProfile?.id]);

  // Fetch lanes when profile changes
  useEffect(() => {
    if (!initialized) return;
    
    async function fetchLanes() {
      if (!currentProfile) {
        setLanes([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Query lanes for this profile (simple query to avoid composite index)
        const lanesRef = collection(db, 'lanes');
        const lanesQuery = query(
          lanesRef,
          where('profileId', '==', currentProfile.id)
        );
        
        const lanesSnapshot = await getDocs(lanesQuery);
        
        // Filter to active lanes and sort client-side
        const activeLaneDocs = lanesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }) as LaneType)
          .filter(lane => lane.isActive)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        
        // Fetch items for each lane
        const lanesWithItems: LaneWithItems[] = await Promise.all(
          activeLaneDocs.map(async (laneData) => {
            // Get items sub-collection
            const itemsRef = collection(db, 'lanes', laneData.id, 'items');
            const itemsSnapshot = await getDocs(itemsRef);
            const items = itemsSnapshot.docs.map((itemDoc) => ({
              id: itemDoc.id,
              ...itemDoc.data(),
            })) as LaneItem[];

            return {
              ...laneData,
              items,
            };
          })
        );

        setLanes(lanesWithItems);
      } catch (error) {
        console.error('Failed to fetch lanes:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLanes();
  }, [currentProfile, initialized]);

  // Show loading while initializing
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show profile switcher if no profile selected
  if (!currentProfile) {
    return <ProfileSwitcher />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-gray-800/50">
        <div className="flex items-center justify-between px-6 md:px-12 py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 
                           flex items-center justify-center shadow-lg shadow-amber-500/30">
              <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight hidden sm:block">
              Learning Lanes
            </h1>
          </div>

          {/* Profile Info & Actions */}
          <div className="flex items-center gap-3">
            {/* Admin Button - only for admins */}
            {currentProfile.role === 'admin' && (
              <a
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 rounded-xl
                          bg-amber-500/20 border border-amber-500/50
                          text-amber-400 hover:bg-amber-500/30 hover:text-amber-300
                          transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">Admin</span>
              </a>
            )}

            {/* Badges Button */}
            {currentProfile.role === 'child' && (
              <button
                onClick={() => setShowBadges(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl
                          bg-purple-500/20 border border-purple-500/50
                          text-purple-400 hover:bg-purple-500/30 hover:text-purple-300
                          transition-all"
              >
                <span className="text-lg">🏆</span>
                <span className="hidden sm:inline">Badges</span>
                <span className="px-1.5 py-0.5 text-xs font-bold bg-purple-500/30 rounded-full">
                  {earnedBadges.length}
                </span>
              </button>
            )}

            {/* Profile Info */}
            <div className="text-right hidden sm:block">
              <p className="text-white font-medium">{currentProfile.displayName}</p>
              <p className="text-gray-500 text-sm flex items-center justify-end gap-2">
                {currentProfile.role === 'admin' ? (
                  'Admin'
                ) : (
                  <>
                    <span>{totalCompleted} videos completed</span>
                  </>
                )}
              </p>
            </div>

            {/* Switch Profile Button */}
            <button
              onClick={() => clearProfile()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl
                        bg-gray-800/60 border border-gray-700/50
                        text-gray-300 hover:text-white hover:bg-gray-800
                        hover:border-amber-500/50 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 
                             flex items-center justify-center text-gray-900 font-bold text-sm">
                {currentProfile.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline">Switch</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400">Loading your lanes...</p>
            </div>
          </div>
        ) : lanes.length > 0 ? (
          <div className="space-y-8">
            {lanes.map((lane) => (
              <Lane
                key={lane.id}
                id={lane.id}
                title={lane.title}
                category={lane.category}
                items={lane.items}
                watchProgressMap={watchProgressMap}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-24 h-24 mb-6 rounded-full bg-gray-800/50 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Lanes Yet</h2>
            <p className="text-gray-400 max-w-md">
              {currentProfile.role === 'admin' 
                ? "You haven't created any learning lanes yet. Add some content to get started!"
                : "No learning content has been set up for you yet. Ask a parent to add some lanes!"}
            </p>
          </div>
        )}
      </main>

      {/* Content Modal */}
      <ContentModal lanes={lanes} />
      
      {/* Badge Notification */}
      {newBadges.length > 0 && (
        <BadgeNotification badges={newBadges} onClose={clearNewBadges} />
      )}
      
      {/* Badges Display Modal */}
      {showBadges && (
        <BadgeDisplay onClose={() => setShowBadges(false)} />
      )}
    </div>
  );
}
