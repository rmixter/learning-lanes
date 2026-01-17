/**
 * Profile Store - Nano Stores for cross-component state management
 * Manages the current profile with localStorage persistence
 */

import { atom, computed } from 'nanostores';
import type { Profile } from '../types';

// Storage key for persistence
const STORAGE_KEY = 'learning-lanes-profile';

/**
 * Load profile from localStorage
 */
function loadPersistedProfile(): Profile | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Profile;
    }
  } catch (error) {
    console.error('Failed to load persisted profile:', error);
  }
  return null;
}

/**
 * Save profile to localStorage
 */
function persistProfile(profile: Profile | null): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (profile) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error('Failed to persist profile:', error);
  }
}

/**
 * Current profile atom - the main state
 */
export const $currentProfile = atom<Profile | null>(null);

/**
 * Computed: Is a profile currently selected?
 */
export const $isProfileSelected = computed($currentProfile, (profile) => profile !== null);

/**
 * Computed: Is the current user an admin?
 */
export const $isAdmin = computed($currentProfile, (profile) => profile?.role === 'admin');

/**
 * Initialize the store - call this on app mount
 * Hydrates from localStorage
 */
export function initializeProfileStore(): void {
  const persisted = loadPersistedProfile();
  if (persisted) {
    $currentProfile.set(persisted);
  }
}

/**
 * Set the current profile (login as a family member)
 */
export function setProfile(profile: Profile): void {
  $currentProfile.set(profile);
  persistProfile(profile);
}

/**
 * Clear the current profile (logout)
 */
export function clearProfile(): void {
  $currentProfile.set(null);
  persistProfile(null);
}

/**
 * Check if PIN is valid for admin access
 */
export function verifyAdminPin(profile: Profile, pin: string): boolean {
  return profile.role === 'admin' && profile.pin === pin;
}
