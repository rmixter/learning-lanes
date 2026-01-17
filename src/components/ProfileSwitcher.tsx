/**
 * ProfileSwitcher - Modal/Grid for selecting family member profiles
 * Large touch targets for tablet use
 */

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { setProfile, verifyAdminPin } from '../stores/profileStore';
import type { Profile } from '../types';

interface ProfileSwitcherProps {
  onProfileSelected?: () => void;
}

export default function ProfileSwitcher({ onProfileSelected }: ProfileSwitcherProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<Profile | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Fetch profiles from Firestore
  useEffect(() => {
    async function fetchProfiles() {
      try {
        const profilesRef = collection(db, 'profiles');
        const snapshot = await getDocs(profilesRef);
        const profilesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Profile[];
        setProfiles(profilesData);
      } catch (err) {
        console.error('Failed to fetch profiles:', err);
        setError('Failed to load profiles. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchProfiles();
  }, []);

  const handleProfileClick = (profile: Profile) => {
    if (profile.role === 'admin') {
      // Show PIN input for admin profiles
      setSelectedAdmin(profile);
      setPin('');
      setPinError(false);
    } else {
      // Directly select child profiles
      setProfile(profile);
      onProfileSelected?.();
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAdmin && verifyAdminPin(selectedAdmin, pin)) {
      setProfile(selectedAdmin);
      onProfileSelected?.();
    } else {
      setPinError(true);
      setPin('');
    }
  };

  const handlePinCancel = () => {
    setSelectedAdmin(null);
    setPin('');
    setPinError(false);
  };

  // Generate a nice avatar color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'from-blue-400 to-blue-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-orange-400 to-orange-600',
      'from-green-400 to-green-600',
      'from-teal-400 to-teal-600',
      'from-red-400 to-red-600',
      'from-indigo-400 to-indigo-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-lg">Loading profiles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-amber-500 text-gray-900 font-semibold rounded-lg hover:bg-amber-400 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // PIN Entry Modal
  if (selectedAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-2xl">
            {/* Back Button */}
            <button
              onClick={handlePinCancel}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            {/* Admin Avatar */}
            <div className="flex flex-col items-center mb-8">
              <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${getAvatarColor(selectedAdmin.displayName)} 
                              flex items-center justify-center text-white text-3xl font-bold shadow-xl mb-4`}>
                {selectedAdmin.avatarUrl ? (
                  <img src={selectedAdmin.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  selectedAdmin.displayName.charAt(0).toUpperCase()
                )}
              </div>
              <h2 className="text-2xl font-bold text-white">{selectedAdmin.displayName}</h2>
              <p className="text-amber-500 text-sm font-medium">Admin Account</p>
            </div>

            {/* PIN Form */}
            <form onSubmit={handlePinSubmit}>
              <label className="block text-gray-400 text-sm mb-2">Enter PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setPinError(false);
                }}
                className={`w-full px-4 py-4 text-center text-2xl tracking-[0.5em] font-mono
                           bg-gray-900/50 border-2 rounded-xl text-white
                           focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all
                           ${pinError ? 'border-red-500 shake' : 'border-gray-700 focus:border-amber-500'}`}
                placeholder="••••"
                autoFocus
              />
              {pinError && (
                <p className="text-red-400 text-sm mt-2 text-center">Incorrect PIN. Please try again.</p>
              )}
              <button
                type="submit"
                disabled={pin.length < 4}
                className="w-full mt-6 px-6 py-4 bg-amber-500 text-gray-900 font-semibold text-lg rounded-xl
                         hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Profile Selection Grid
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
      {/* Logo/Title */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 
                         flex items-center justify-center shadow-lg shadow-amber-500/30">
            <svg className="w-7 h-7 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-2">
          Learning Lanes
        </h1>
        <p className="text-gray-400 text-lg">Who's learning?</p>
      </div>

      {/* Profiles Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-4xl">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => handleProfileClick(profile)}
            className="group flex flex-col items-center p-6 rounded-2xl
                       bg-gray-800/40 border border-gray-700/30
                       hover:bg-gray-800/70 hover:border-amber-500/50
                       focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-900
                       transition-all duration-300 transform hover:scale-105"
          >
            {/* Avatar */}
            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br ${getAvatarColor(profile.displayName)}
                           flex items-center justify-center text-white text-2xl md:text-3xl font-bold
                           shadow-lg group-hover:shadow-xl group-hover:shadow-amber-500/20
                           transition-all duration-300 mb-4`}>
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                profile.displayName.charAt(0).toUpperCase()
              )}
            </div>
            
            {/* Name */}
            <span className="text-white font-semibold text-lg group-hover:text-amber-400 transition-colors">
              {profile.displayName}
            </span>
            
            {/* Role Badge */}
            {profile.role === 'admin' && (
              <span className="mt-2 px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                Admin
              </span>
            )}
          </button>
        ))}
      </div>

      {profiles.length === 0 && (
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">No profiles found.</p>
          <p className="text-gray-500 text-sm">Run the seed script to create sample profiles.</p>
        </div>
      )}
    </div>
  );
}
