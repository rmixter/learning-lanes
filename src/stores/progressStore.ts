/**
 * Progress Store - Manages watch history and badges
 */

import { atom, computed } from 'nanostores';
import type { WatchRecord, EarnedBadge } from '../types';
import { BADGE_DEFINITIONS } from '../types';
import { getWatchHistory, getEarnedBadges, updateWatchProgress, checkAndAwardBadges } from '../lib/firestore';
import type { LaneWithItems } from '../types';

/**
 * Watch history for current profile
 */
export const $watchHistory = atom<WatchRecord[]>([]);

/**
 * Earned badges for current profile
 */
export const $earnedBadges = atom<EarnedBadge[]>([]);

/**
 * Loading state
 */
export const $progressLoading = atom<boolean>(false);

/**
 * Computed: Map of item ID to watch record for quick lookup
 */
export const $watchProgressMap = computed($watchHistory, (history) => 
  new Map(history.map(w => [w.itemId, w]))
);

/**
 * Computed: Set of COMPLETED item IDs (90%+ watched)
 */
export const $completedItemIds = computed($watchHistory, (history) => 
  new Set(history.filter(w => w.completed).map(w => w.itemId))
);

/**
 * Computed: Total videos completed (for display)
 */
export const $totalCompleted = computed($watchHistory, (history) => 
  history.filter(w => w.completed).length
);

/**
 * Computed: Badge definitions with earned status
 */
export const $badgesWithStatus = computed($earnedBadges, (earned) => {
  const earnedTypes = new Set(earned.map(b => b.badgeType));
  return BADGE_DEFINITIONS.map(def => ({
    ...def,
    earned: earnedTypes.has(def.type),
    earnedAt: earned.find(e => e.badgeType === def.type)?.earnedAt,
  }));
});

/**
 * Newly earned badges (for showing notifications)
 */
export const $newBadges = atom<EarnedBadge[]>([]);

/**
 * Load progress data for a profile
 */
export async function loadProgress(profileId: string): Promise<void> {
  $progressLoading.set(true);
  
  try {
    const [history, badges] = await Promise.all([
      getWatchHistory(profileId),
      getEarnedBadges(profileId),
    ]);
    
    $watchHistory.set(history);
    $earnedBadges.set(badges);
  } catch (error) {
    console.error('Failed to load progress:', error);
  } finally {
    $progressLoading.set(false);
  }
}

/**
 * Update watch progress and check for badges if newly completed
 */
export async function saveWatchProgress(
  profileId: string,
  laneId: string,
  itemId: string,
  currentPosition: number,
  duration: number,
  lanes: LaneWithItems[]
): Promise<EarnedBadge[]> {
  try {
    // Update progress in Firestore
    const { record, newlyCompleted } = await updateWatchProgress(
      profileId, 
      laneId, 
      itemId, 
      currentPosition, 
      duration
    );
    
    // Update local state
    const currentHistory = $watchHistory.get();
    const existingIndex = currentHistory.findIndex(w => w.itemId === itemId);
    
    let updatedHistory: WatchRecord[];
    if (existingIndex >= 0) {
      // Update existing record
      updatedHistory = [...currentHistory];
      updatedHistory[existingIndex] = record;
    } else {
      // Add new record
      updatedHistory = [...currentHistory, record];
    }
    $watchHistory.set(updatedHistory);
    
    // Check for badges only if video was NEWLY completed
    if (newlyCompleted) {
      console.log('Video newly completed! Checking badges...');
      const newBadges = await checkAndAwardBadges(profileId, updatedHistory, lanes);
      
      if (newBadges.length > 0) {
        // Update earned badges
        $earnedBadges.set([...$earnedBadges.get(), ...newBadges]);
        // Set new badges for notification
        $newBadges.set(newBadges);
      }
      
      return newBadges;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to save watch progress:', error);
    return [];
  }
}

/**
 * Get watch progress for a specific item
 */
export function getItemProgress(itemId: string): WatchRecord | undefined {
  return $watchProgressMap.get().get(itemId);
}

/**
 * Clear new badges notification
 */
export function clearNewBadges(): void {
  $newBadges.set([]);
}

/**
 * Clear progress data (on profile switch)
 */
export function clearProgress(): void {
  $watchHistory.set([]);
  $earnedBadges.set([]);
  $newBadges.set([]);
}
