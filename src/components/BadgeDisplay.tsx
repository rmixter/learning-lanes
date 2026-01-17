/**
 * BadgeDisplay - Shows all earned and available badges
 */

import { useStore } from '@nanostores/react';
import { $badgesWithStatus, $totalCompleted } from '../stores/progressStore';
import { $currentProfile } from '../stores/profileStore';

interface BadgeDisplayProps {
  onClose: () => void;
}

export default function BadgeDisplay({ onClose }: BadgeDisplayProps) {
  const badgesWithStatus = useStore($badgesWithStatus);
  const totalCompleted = useStore($totalCompleted);
  const currentProfile = useStore($currentProfile);
  
  const earnedCount = badgesWithStatus.filter(b => b.earned).length;
  const totalCount = badgesWithStatus.length;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4
                 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative max-w-lg w-full max-h-[90vh] overflow-y-auto
                   bg-gradient-to-b from-gray-800 to-gray-900 
                   rounded-3xl border border-purple-500/30 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-800/95 backdrop-blur-sm p-6 border-b border-gray-700/50">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 
                           flex items-center justify-center text-3xl shadow-lg">
              🏆
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{currentProfile?.displayName}'s Badges</h2>
              <p className="text-gray-400">
                {earnedCount} of {totalCount} badges earned • {totalCompleted} videos completed
              </p>
            </div>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            {badgesWithStatus.map((badge) => (
              <div 
                key={badge.type}
                className={`relative p-4 rounded-2xl border transition-all
                           ${badge.earned 
                             ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10' 
                             : 'bg-gray-800/50 border-gray-700/50 opacity-50'}`}
              >
                {/* Badge Icon */}
                <div className={`text-4xl mb-3 ${badge.earned ? '' : 'grayscale'}`}>
                  {badge.earned ? badge.icon : '🔒'}
                </div>
                
                {/* Badge Info */}
                <h3 className={`font-bold mb-1 ${badge.earned ? 'text-white' : 'text-gray-500'}`}>
                  {badge.name}
                </h3>
                <p className={`text-sm ${badge.earned ? 'text-gray-400' : 'text-gray-600'}`}>
                  {badge.description}
                </p>
                
                {/* Earned date */}
                {badge.earned && badge.earnedAt && (
                  <p className="text-xs text-amber-500/70 mt-2">
                    Earned {badge.earnedAt.toLocaleDateString()}
                  </p>
                )}
                
                {/* Earned checkmark */}
                {badge.earned && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-green-500 
                                 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Progress Hint */}
          {earnedCount < totalCount && (
            <div className="mt-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <p className="text-purple-300 text-sm text-center">
                💡 Keep watching videos and exploring different categories to earn more badges!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
