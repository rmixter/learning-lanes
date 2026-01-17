/**
 * BadgeNotification - Shows a celebratory popup when a new badge is earned
 */

import { useEffect, useState } from 'react';
import type { EarnedBadge } from '../types';
import { BADGE_DEFINITIONS } from '../types';

interface BadgeNotificationProps {
  badges: EarnedBadge[];
  onClose: () => void;
}

export default function BadgeNotification({ badges, onClose }: BadgeNotificationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const currentBadge = badges[currentIndex];
  const badgeDefinition = BADGE_DEFINITIONS.find(b => b.type === currentBadge?.badgeType);

  const handleNext = () => {
    if (currentIndex < badges.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  if (!currentBadge || !badgeDefinition) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4
                 bg-black/80 backdrop-blur-sm transition-opacity duration-300
                 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div 
        className={`relative max-w-sm w-full bg-gradient-to-b from-gray-800 to-gray-900 
                   rounded-3xl border border-amber-500/30 shadow-2xl shadow-amber-500/20
                   overflow-hidden transform transition-all duration-500
                   ${isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-10'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Confetti Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-2 h-2 bg-amber-400 rounded-full animate-confetti-1" />
          <div className="absolute top-0 left-1/2 w-2 h-2 bg-purple-400 rounded-full animate-confetti-2" />
          <div className="absolute top-0 left-3/4 w-2 h-2 bg-green-400 rounded-full animate-confetti-3" />
          <div className="absolute top-0 left-1/3 w-2 h-2 bg-pink-400 rounded-full animate-confetti-4" />
          <div className="absolute top-0 left-2/3 w-2 h-2 bg-blue-400 rounded-full animate-confetti-5" />
        </div>

        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10 animate-pulse" />

        <div className="relative p-8 text-center">
          {/* Star burst behind badge */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl" />
          
          {/* Badge Icon */}
          <div className="relative mb-6">
            <div className="text-7xl animate-bounce-slow">{badgeDefinition.icon}</div>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-amber-400 text-2xl animate-spin-slow">
              ✨
            </div>
          </div>

          {/* Achievement Text */}
          <p className="text-amber-400 text-sm font-bold uppercase tracking-widest mb-2">
            🎉 Badge Earned! 🎉
          </p>
          
          <h2 className="text-3xl font-bold text-white mb-2">
            {badgeDefinition.name}
          </h2>
          
          <p className="text-gray-400 mb-6">
            {badgeDefinition.description}
          </p>

          {/* Progress indicator for multiple badges */}
          {badges.length > 1 && (
            <div className="flex justify-center gap-2 mb-4">
              {badges.map((_, idx) => (
                <div 
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentIndex ? 'bg-amber-500' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 
                     text-gray-900 font-bold rounded-xl
                     hover:from-amber-400 hover:to-orange-400 
                     transform hover:scale-105 transition-all shadow-lg"
          >
            {currentIndex < badges.length - 1 ? 'Next Badge' : 'Awesome!'}
          </button>
        </div>
      </div>
    </div>
  );
}
