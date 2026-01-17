/**
 * LaneCard - Individual content card within a Lane
 * Large touch targets (44px minimum) suitable for tablets
 * Shows progress bar for partially watched videos
 */

import type { LaneItem, WatchRecord } from '../types';

interface LaneCardProps {
  item: LaneItem;
  watchProgress?: WatchRecord; // Full progress data for this item
  onSelect: (item: LaneItem) => void;
}

export default function LaneCard({ item, watchProgress, onSelect }: LaneCardProps) {
  const handleClick = () => {
    onSelect(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(item);
    }
  };

  // Derive status from progress
  const isCompleted = watchProgress?.completed ?? false;
  const hasProgress = watchProgress && watchProgress.progressPercent > 0 && !isCompleted;
  const progressPercent = watchProgress?.progressPercent ?? 0;

  // Type indicator icons
  const typeIndicator = {
    youtube_video: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    web_link: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
    static_image: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  };

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group flex-shrink-0 w-56 md:w-64 rounded-xl overflow-hidden 
                 bg-gray-800/60 backdrop-blur-sm border
                 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-900
                 transition-all duration-300 ease-out
                 hover:scale-[1.02] hover:shadow-xl cursor-pointer text-left
                 ${isCompleted 
                   ? 'border-green-500/50 hover:border-green-400/70 hover:shadow-green-500/10' 
                   : 'border-gray-700/50 hover:border-amber-500/50 hover:shadow-amber-500/10'}`}
      aria-label={`Open ${item.title}${isCompleted ? ' (completed)' : hasProgress ? ` (${progressPercent}% watched)` : ''}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={item.thumbnailUrl}
          alt=""
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 
                     ${isCompleted ? 'opacity-80' : ''}`}
          loading="lazy"
        />
        
        {/* Type indicator badge */}
        <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white/90">
          {typeIndicator[item.type]}
        </div>
        
        {/* Completed indicator */}
        {isCompleted && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg 
                         bg-green-500 backdrop-blur-sm text-white text-xs font-medium shadow-lg">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            <span>Done</span>
          </div>
        )}
        
        {/* In-progress indicator */}
        {hasProgress && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg 
                         bg-amber-500/90 backdrop-blur-sm text-gray-900 text-xs font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{progressPercent}%</span>
          </div>
        )}
        
        {/* Play overlay for videos */}
        {item.type === 'youtube_video' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center 
                          opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100
                          transition-all duration-300 shadow-lg
                          ${isCompleted ? 'bg-green-500' : 'bg-amber-500'}`}>
              {isCompleted ? (
                // Replay icon for completed videos
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : hasProgress ? (
                // Continue icon for in-progress videos
                <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              ) : (
                // Play icon for new videos
                <svg className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </div>
          </div>
        )}
        
        {/* Progress bar at bottom of thumbnail (for partially watched) */}
        {hasProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div 
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
        
        {/* Full green bar for completed */}
        {isCompleted && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500" />
        )}
      </div>
      
      {/* Title & Resume info */}
      <div className="p-4">
        <h3 className={`font-medium text-sm md:text-base leading-tight line-clamp-2 transition-colors
                       ${isCompleted 
                         ? 'text-green-400 group-hover:text-green-300' 
                         : 'text-white group-hover:text-amber-400'}`}>
          {item.title}
        </h3>
        {hasProgress && watchProgress && (
          <p className="text-amber-500/80 text-xs mt-1">
            Continue from {formatTime(watchProgress.lastPosition)}
          </p>
        )}
      </div>
    </button>
  );
}

// Helper to format seconds to MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

