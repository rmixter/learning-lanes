/**
 * Firestore Helper Functions
 * CRUD operations for profiles, lanes, and items
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Profile, Lane, LaneItem, LaneWithItems, WatchRecord, EarnedBadge, BadgeType, LaneCategory } from '../types';
import { v4 as uuidv4 } from 'uuid';

// ============ PROFILES ============

export async function getAllProfiles(): Promise<Profile[]> {
  const profilesRef = collection(db, 'profiles');
  const snapshot = await getDocs(profilesRef);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Profile[];
}

export async function getProfile(profileId: string): Promise<Profile | null> {
  const docRef = doc(db, 'profiles', profileId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Profile;
}

// ============ LANES ============

export async function getLanesForProfile(profileId: string, includeInactive = false): Promise<Lane[]> {
  const lanesRef = collection(db, 'lanes');
  
  // Simple query without orderBy to avoid composite index requirement
  const lanesQuery = query(
    lanesRef,
    where('profileId', '==', profileId)
  );
  
  try {
    const snapshot = await getDocs(lanesQuery);
    let lanes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Lane[];
    
    // Filter inactive lanes if needed
    if (!includeInactive) {
      lanes = lanes.filter(lane => lane.isActive);
    }
    
    // Sort by sortOrder client-side
    lanes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    return lanes;
  } catch (error) {
    console.error('Error fetching lanes for profile:', profileId, error);
    return [];
  }
}

export async function getLaneWithItems(laneId: string): Promise<LaneWithItems | null> {
  const laneRef = doc(db, 'lanes', laneId);
  const laneSnapshot = await getDoc(laneRef);
  
  if (!laneSnapshot.exists()) return null;
  
  const lane = { id: laneSnapshot.id, ...laneSnapshot.data() } as Lane;
  
  const itemsRef = collection(db, 'lanes', laneId, 'items');
  const itemsSnapshot = await getDocs(itemsRef);
  const items = itemsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as LaneItem[];
  
  return { ...lane, items };
}

export async function createLane(lane: Omit<Lane, 'id'>): Promise<Lane> {
  const id = `lane-${uuidv4()}`;
  const laneWithId = { ...lane, id };
  await setDoc(doc(db, 'lanes', id), laneWithId);
  return laneWithId as Lane;
}

export async function updateLane(laneId: string, updates: Partial<Lane>): Promise<void> {
  const laneRef = doc(db, 'lanes', laneId);
  await updateDoc(laneRef, updates);
}

export async function deleteLane(laneId: string): Promise<void> {
  // First delete all items in the lane
  const itemsRef = collection(db, 'lanes', laneId, 'items');
  const itemsSnapshot = await getDocs(itemsRef);
  
  const batch = writeBatch(db);
  itemsSnapshot.docs.forEach((itemDoc) => {
    batch.delete(itemDoc.ref);
  });
  
  // Then delete the lane
  batch.delete(doc(db, 'lanes', laneId));
  await batch.commit();
}

// ============ ITEMS ============

export async function getItemsForLane(laneId: string): Promise<LaneItem[]> {
  const itemsRef = collection(db, 'lanes', laneId, 'items');
  const snapshot = await getDocs(itemsRef);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as LaneItem[];
}

export async function createItem(laneId: string, item: Omit<LaneItem, 'id'>): Promise<LaneItem> {
  const id = `item-${uuidv4()}`;
  const itemWithId = { ...item, id };
  await setDoc(doc(db, 'lanes', laneId, 'items', id), itemWithId);
  return itemWithId as LaneItem;
}

export async function updateItem(laneId: string, itemId: string, updates: Partial<LaneItem>): Promise<void> {
  const itemRef = doc(db, 'lanes', laneId, 'items', itemId);
  await updateDoc(itemRef, updates);
}

export async function deleteItem(laneId: string, itemId: string): Promise<void> {
  const itemRef = doc(db, 'lanes', laneId, 'items', itemId);
  await deleteDoc(itemRef);
}

// ============ HELPERS ============

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Get YouTube thumbnail URL from video ID
 */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// ============ WATCH HISTORY ============

/**
 * Update watch progress for an item (creates if doesn't exist)
 * Returns the updated record and whether it was newly completed
 */
export async function updateWatchProgress(
  profileId: string, 
  laneId: string, 
  itemId: string,
  currentPosition: number,
  duration: number
): Promise<{ record: WatchRecord; newlyCompleted: boolean }> {
  const id = `${profileId}_${itemId}`;
  const docRef = doc(db, 'watchHistory', id);
  const now = new Date();
  
  // Calculate progress
  const progressPercent = duration > 0 ? Math.round((currentPosition / duration) * 100) : 0;
  const completed = progressPercent >= 90;
  
  // Check if record exists
  const existing = await getDoc(docRef);
  let newlyCompleted = false;
  
  if (existing.exists()) {
    // Update existing record
    const existingData = existing.data();
    const wasCompleted = existingData.completed || false;
    newlyCompleted = completed && !wasCompleted;
    
    const updates: Record<string, unknown> = {
      lastPosition: currentPosition,
      duration,
      progressPercent,
      completed,
      updatedAt: now.toISOString(),
    };
    
    // Only set completedAt if newly completed
    if (newlyCompleted) {
      updates.completedAt = now.toISOString();
    }
    
    await updateDoc(docRef, updates);
    
    return {
      record: {
        id,
        profileId,
        laneId,
        itemId,
        lastPosition: currentPosition,
        duration,
        progressPercent,
        completed,
        startedAt: new Date(existingData.startedAt),
        updatedAt: now,
        completedAt: newlyCompleted ? now : (existingData.completedAt ? new Date(existingData.completedAt) : undefined),
      },
      newlyCompleted,
    };
  } else {
    // Create new record
    newlyCompleted = completed;
    
    const watchRecord: WatchRecord = {
      id,
      profileId,
      laneId,
      itemId,
      lastPosition: currentPosition,
      duration,
      progressPercent,
      completed,
      startedAt: now,
      updatedAt: now,
    };
    
    if (completed) {
      watchRecord.completedAt = now;
    }
    
    const dataToSave: Record<string, unknown> = {
      ...watchRecord,
      startedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    
    if (completed) {
      dataToSave.completedAt = now.toISOString();
    }
    
    await setDoc(docRef, dataToSave);
    
    return { record: watchRecord, newlyCompleted };
  }
}

/**
 * Get watch record for a specific item
 */
export async function getWatchRecord(profileId: string, itemId: string): Promise<WatchRecord | null> {
  const id = `${profileId}_${itemId}`;
  const docRef = doc(db, 'watchHistory', id);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) return null;
  
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    startedAt: new Date(data.startedAt),
    updatedAt: new Date(data.updatedAt),
    completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
  } as WatchRecord;
}

/**
 * Get all watch records for a profile
 */
export async function getWatchHistory(profileId: string): Promise<WatchRecord[]> {
  const watchRef = collection(db, 'watchHistory');
  const watchQuery = query(watchRef, where('profileId', '==', profileId));
  
  try {
    const snapshot = await getDocs(watchQuery);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        startedAt: new Date(data.startedAt),
        updatedAt: new Date(data.updatedAt),
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      } as WatchRecord;
    });
  } catch (error) {
    console.error('Error fetching watch history:', error);
    return [];
  }
}

/**
 * Get completed item IDs for a profile (for badge calculations)
 */
export async function getCompletedItemIds(profileId: string): Promise<Set<string>> {
  const history = await getWatchHistory(profileId);
  return new Set(history.filter(w => w.completed).map(w => w.itemId));
}

/**
 * Get watch progress map for a profile (itemId -> WatchRecord)
 */
export async function getWatchProgressMap(profileId: string): Promise<Map<string, WatchRecord>> {
  const history = await getWatchHistory(profileId);
  return new Map(history.map(w => [w.itemId, w]));
}

// ============ BADGES ============

/**
 * Get earned badges for a profile
 */
export async function getEarnedBadges(profileId: string): Promise<EarnedBadge[]> {
  const badgesRef = collection(db, 'earnedBadges');
  const badgesQuery = query(badgesRef, where('profileId', '==', profileId));
  
  try {
    const snapshot = await getDocs(badgesQuery);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        earnedAt: new Date(data.earnedAt),
      } as EarnedBadge;
    });
  } catch (error) {
    console.error('Error fetching badges:', error);
    return [];
  }
}

/**
 * Award a badge to a profile
 */
export async function awardBadge(
  profileId: string, 
  badgeType: BadgeType, 
  metadata?: Record<string, string>
): Promise<EarnedBadge | null> {
  // Check if already earned
  const id = `${profileId}_${badgeType}`;
  const existingRef = doc(db, 'earnedBadges', id);
  const existing = await getDoc(existingRef);
  
  if (existing.exists()) {
    return null; // Already has this badge
  }
  
  const badge: EarnedBadge = {
    id,
    profileId,
    badgeType,
    earnedAt: new Date(),
  };
  
  // Only add metadata if provided (Firestore doesn't accept undefined)
  if (metadata) {
    badge.metadata = metadata;
  }
  
  await setDoc(existingRef, {
    ...badge,
    earnedAt: badge.earnedAt.toISOString(),
  });
  
  return badge;
}

/**
 * Check and award badges based on COMPLETED videos only
 * Returns array of newly earned badges
 */
export async function checkAndAwardBadges(
  profileId: string,
  watchHistory: WatchRecord[],
  lanes: LaneWithItems[]
): Promise<EarnedBadge[]> {
  const newBadges: EarnedBadge[] = [];
  
  // Only count COMPLETED videos for badges
  const completedRecords = watchHistory.filter(w => w.completed);
  const totalCompleted = completedRecords.length;
  const completedItemIds = new Set(completedRecords.map(w => w.itemId));
  
  console.log(`Badge check: ${totalCompleted} completed videos out of ${watchHistory.length} total`);
  
  // First Watch badge - complete your first video
  if (totalCompleted >= 1) {
    const badge = await awardBadge(profileId, 'first_watch');
    if (badge) newBadges.push(badge);
  }
  
  // 5 Videos badge
  if (totalCompleted >= 5) {
    const badge = await awardBadge(profileId, 'five_videos');
    if (badge) newBadges.push(badge);
  }
  
  // 10 Videos badge
  if (totalCompleted >= 10) {
    const badge = await awardBadge(profileId, 'ten_videos');
    if (badge) newBadges.push(badge);
  }
  
  // 25 Videos badge
  if (totalCompleted >= 25) {
    const badge = await awardBadge(profileId, 'twenty_five_videos');
    if (badge) newBadges.push(badge);
  }
  
  // Lane Master badge - check if any lane is fully completed
  for (const lane of lanes) {
    if (lane.items.length > 0) {
      const allCompleted = lane.items.every(item => completedItemIds.has(item.id));
      if (allCompleted) {
        const badge = await awardBadge(profileId, 'lane_master', { laneId: lane.id, laneTitle: lane.title });
        if (badge) newBadges.push(badge);
        break; // Only award once
      }
    }
  }
  
  // Explorer badge - completed videos from all 4 categories
  const categoriesCompleted = new Set<LaneCategory>();
  for (const record of completedRecords) {
    const lane = lanes.find(l => l.id === record.laneId);
    if (lane) {
      categoriesCompleted.add(lane.category);
    }
  }
  if (categoriesCompleted.size >= 4) {
    const badge = await awardBadge(profileId, 'explorer');
    if (badge) newBadges.push(badge);
  }
  
  return newBadges;
}

// ============ DEV TOOLS ============

/**
 * Clear all watch history for a profile (DEV ONLY)
 */
export async function clearWatchHistoryForProfile(profileId: string): Promise<number> {
  const watchRef = collection(db, 'watchHistory');
  const watchQuery = query(watchRef, where('profileId', '==', profileId));
  
  const snapshot = await getDocs(watchQuery);
  const batch = writeBatch(db);
  
  snapshot.docs.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref);
  });
  
  await batch.commit();
  console.log(`Cleared ${snapshot.docs.length} watch records for profile ${profileId}`);
  return snapshot.docs.length;
}

/**
 * Clear all badges for a profile (DEV ONLY)
 */
export async function clearBadgesForProfile(profileId: string): Promise<number> {
  const badgesRef = collection(db, 'earnedBadges');
  const badgesQuery = query(badgesRef, where('profileId', '==', profileId));
  
  const snapshot = await getDocs(badgesQuery);
  const batch = writeBatch(db);
  
  snapshot.docs.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref);
  });
  
  await batch.commit();
  console.log(`Cleared ${snapshot.docs.length} badges for profile ${profileId}`);
  return snapshot.docs.length;
}
