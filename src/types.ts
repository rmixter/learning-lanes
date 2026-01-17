/**
 * Learning Lanes - Type Definitions
 * Defines the core data models for the walled garden learning application
 */

// Profile roles
export type ProfileRole = 'admin' | 'child';

// Lane categories
export type LaneCategory = 
  | 'School' 
  | 'Music' 
  | 'Fun' 
  | 'Creativity'
  | 'Learning'
  | 'Entertainment'
  | 'Science'
  | 'Math'
  | 'Reading'
  | 'Other';

// Content item types
export type ContentType = 'youtube_video' | 'web_link' | 'static_image';

/**
 * Profile - Represents a family member user
 */
export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string;
  role: ProfileRole;
  pin: string | null; // Required for admin access, null for children
}

/**
 * Lane - A horizontal category/playlist of content
 */
export interface Lane {
  id: string;
  profileId: string;
  title: string;
  category: LaneCategory;
  isActive: boolean;
  sortOrder: number;
}

/**
 * YouTube Video Data Payload
 */
export interface YouTubeData {
  videoId: string;
  startTime?: number; // Start time in seconds
  endTime?: number;   // End time in seconds
  loop?: boolean;     // Whether to loop the video
}

/**
 * Web Link Data Payload
 */
export interface WebLinkData {
  url: string;
  allowNavigation?: boolean; // Whether to allow clicking links within the iframe
  canEmbed?: boolean; // Whether site allows iframe embedding (default: true, set to false for sites like pbskids.org)
}

/**
 * Static Image Data Payload
 */
export interface StaticImageData {
  imageUrl: string;
  altText?: string;
}

/**
 * Content data union type
 */
export type ContentData = YouTubeData | WebLinkData | StaticImageData;

/**
 * LaneItem - Individual content piece within a Lane
 */
export interface LaneItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  type: ContentType;
  data: ContentData;
}

/**
 * Lane with its items - used for rendering
 */
export interface LaneWithItems extends Lane {
  items: LaneItem[];
}

/**
 * Type guards for content data
 */
export function isYouTubeData(data: ContentData): data is YouTubeData {
  return 'videoId' in data;
}

export function isWebLinkData(data: ContentData): data is WebLinkData {
  return 'url' in data && !('imageUrl' in data);
}

export function isStaticImageData(data: ContentData): data is StaticImageData {
  return 'imageUrl' in data;
}

/**
 * Active content state - what's currently being viewed
 */
export interface ActiveContent {
  item: LaneItem;
  laneId: string;
  laneTitle: string;
}

// ============ PROGRESS TRACKING ============

/**
 * Watch Record - Tracks user's progress watching an item
 */
export interface WatchRecord {
  id: string;
  profileId: string;
  laneId: string;
  itemId: string;
  // Progress tracking
  lastPosition: number;    // Current position in seconds
  duration: number;        // Total duration in seconds
  progressPercent: number; // 0-100 percentage watched
  completed: boolean;      // True if >= 90% watched
  // Timestamps
  startedAt: Date;         // When they first started watching
  updatedAt: Date;         // Last progress update
  completedAt?: Date;      // When they completed it (if completed)
}

/**
 * Lane with items and watch status
 */
export interface LaneWithProgress extends LaneWithItems {
  watchedItemIds: Set<string>;
  progress: {
    watched: number;
    total: number;
    percentage: number;
  };
}

// ============ BADGES ============

/**
 * Badge types
 */
export type BadgeType = 
  | 'first_watch'      // Watch your first video
  | 'lane_master'      // Complete all items in a lane
  | 'explorer'         // Watch from all 4 categories
  | 'five_videos'      // Watch 5 videos
  | 'ten_videos'       // Watch 10 videos
  | 'twenty_five_videos'; // Watch 25 videos

/**
 * Badge definition
 */
export interface BadgeDefinition {
  type: BadgeType;
  name: string;
  description: string;
  icon: string; // Emoji or icon name
}

/**
 * Earned badge record
 */
export interface EarnedBadge {
  id: string;
  profileId: string;
  badgeType: BadgeType;
  earnedAt: Date;
  metadata?: Record<string, string>; // e.g., { laneId: '...' } for lane_master
}

/**
 * Badge definitions - all available badges
 */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    type: 'first_watch',
    name: 'First Steps',
    description: 'Watched your first video',
    icon: '🌟',
  },
  {
    type: 'five_videos',
    name: 'Getting Started',
    description: 'Watched 5 videos',
    icon: '📚',
  },
  {
    type: 'ten_videos',
    name: 'Dedicated Learner',
    description: 'Watched 10 videos',
    icon: '🎯',
  },
  {
    type: 'twenty_five_videos',
    name: 'Knowledge Seeker',
    description: 'Watched 25 videos',
    icon: '🏆',
  },
  {
    type: 'lane_master',
    name: 'Lane Master',
    description: 'Completed all items in a lane',
    icon: '⭐',
  },
  {
    type: 'explorer',
    name: 'Explorer',
    description: 'Watched content from all categories',
    icon: '🧭',
  },
];
