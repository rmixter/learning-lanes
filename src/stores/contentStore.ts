/**
 * Content Store - Manages the currently active content being viewed
 */

import { atom, computed } from 'nanostores';
import type { ActiveContent, LaneItem } from '../types';

/**
 * Active content atom - what's currently displayed in the modal
 */
export const $activeContent = atom<ActiveContent | null>(null);

/**
 * Computed: Is there active content to display?
 */
export const $hasActiveContent = computed($activeContent, (content) => content !== null);

/**
 * Open content in the viewer modal
 */
export function openContent(item: LaneItem, laneId: string, laneTitle: string): void {
  $activeContent.set({ item, laneId, laneTitle });
}

/**
 * Close the content viewer modal
 */
export function closeContent(): void {
  $activeContent.set(null);
}
