/**
 * ContentModal - Global overlay for viewing content
 * Uses YouTube IFrame API for progress tracking
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { $activeContent, closeContent } from '../stores/contentStore';
import { $currentProfile } from '../stores/profileStore';
import { saveWatchProgress, $watchProgressMap } from '../stores/progressStore';
import { isYouTubeData, isWebLinkData, isStaticImageData } from '../types';
import type { YouTubeData, LaneWithItems, WebLinkData } from '../types';

// YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, config: YouTubePlayerConfig) => YouTubePlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerConfig {
  videoId: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YouTubePlayer }) => void;
    onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
    onError?: (event: { data: number }) => void;
  };
}

interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

interface ContentModalProps {
  lanes?: LaneWithItems[];
}

// Load YouTube IFrame API
let ytApiLoaded = false;
let ytApiLoading = false;
const ytApiCallbacks: (() => void)[] = [];

function loadYouTubeApi(): Promise<void> {
  return new Promise((resolve) => {
    if (ytApiLoaded) {
      resolve();
      return;
    }
    
    ytApiCallbacks.push(resolve);
    
    if (ytApiLoading) return;
    ytApiLoading = true;
    
    window.onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true;
      ytApiCallbacks.forEach(cb => cb());
      ytApiCallbacks.length = 0;
    };
    
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
}

export default function ContentModal({ lanes = [] }: ContentModalProps) {
  const activeContent = useStore($activeContent);
  const currentProfile = useStore($currentProfile);
  const watchProgressMap = useStore($watchProgressMap);
  const modalRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);

  // Save progress to Firestore
  const saveProgress = useCallback(async (position?: number, dur?: number) => {
    if (!activeContent || !currentProfile || currentProfile.role !== 'child') return;
    
    const { item, laneId } = activeContent;
    const pos = position ?? currentTime;
    const totalDur = dur ?? duration;
    
    if (totalDur <= 0) return;
    
    console.log(`Saving progress: ${pos}s / ${totalDur}s (${Math.round((pos/totalDur)*100)}%)`);
    
    await saveWatchProgress(
      currentProfile.id,
      laneId,
      item.id,
      pos,
      totalDur,
      lanes
    );
  }, [activeContent, currentProfile, currentTime, duration, lanes]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        // Player might already be destroyed
      }
      playerRef.current = null;
    }
  }, []);

  // Initialize YouTube player when content changes
  useEffect(() => {
    if (!activeContent) return;
    
    const data = activeContent.item.data;
    if (!isYouTubeData(data)) {
      setIsLoaded(true);
      return;
    }
    
    // Get saved progress for this item
    const savedProgress = watchProgressMap.get(activeContent.item.id);
    const startPosition = savedProgress?.lastPosition ?? data.startTime ?? 0;
    
    console.log('Loading video with start position:', startPosition);
    
    // Load YouTube API and create player
    loadYouTubeApi().then(() => {
      // Clean up any existing player
      cleanup();
      
      const playerConfig: YouTubePlayerConfig = {
        videoId: data.videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          start: Math.floor(startPosition),
          ...(data.endTime && { end: data.endTime }),
          ...(data.loop && { loop: 1, playlist: data.videoId }),
        },
        events: {
          onReady: (event) => {
            console.log('YouTube player ready');
            setIsLoaded(true);
            
            const player = event.target;
            const dur = player.getDuration();
            setDuration(dur);
            
            // Start progress tracking interval
            progressIntervalRef.current = setInterval(() => {
              if (player.getPlayerState() === window.YT.PlayerState.PLAYING) {
                const time = player.getCurrentTime();
                setCurrentTime(time);
                setProgressPercent(dur > 0 ? Math.round((time / dur) * 100) : 0);
              }
            }, 1000);
          },
          onStateChange: (event) => {
            const player = event.target;
            const state = event.data;
            
            if (state === window.YT.PlayerState.PAUSED) {
              // Save progress when paused
              const time = player.getCurrentTime();
              const dur = player.getDuration();
              saveProgress(time, dur);
            } else if (state === window.YT.PlayerState.ENDED) {
              // Save as completed when video ends
              const dur = player.getDuration();
              saveProgress(dur, dur); // Position = duration = 100%
            }
          },
          onError: (event) => {
            console.error('YouTube player error:', event.data);
          },
        },
      };
      
      playerRef.current = new window.YT.Player('youtube-player', playerConfig);
    });
    
    return () => {
      // Save progress when closing
      if (playerRef.current) {
        try {
          const time = playerRef.current.getCurrentTime();
          const dur = playerRef.current.getDuration();
          if (dur > 0) {
            saveProgress(time, dur);
          }
        } catch (e) {
          // Player might be in invalid state
        }
      }
      cleanup();
    };
  }, [activeContent?.item?.id]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContent();
      }
    };

    if (activeContent) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [activeContent]);

  // Handle clicking outside content to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      closeContent();
    }
  };
  
  // Handle close button - save progress first
  const handleClose = async () => {
    if (playerRef.current && activeContent) {
      try {
        const time = playerRef.current.getCurrentTime();
        const dur = playerRef.current.getDuration();
        if (dur > 0) {
          await saveProgress(time, dur);
        }
      } catch (e) {
        // Ignore errors
      }
    }
    closeContent();
  };

  if (!activeContent) return null;

  const { item, laneTitle } = activeContent;
  const data = item.data;
  const savedProgress = watchProgressMap.get(item.id);

  return (
    <div
      ref={modalRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8
                 bg-black/95 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="content-title"
    >
      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 p-3 rounded-full
                   bg-gray-800/80 text-white hover:bg-red-500 hover:text-white
                   transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
        aria-label="Close"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Header */}
      <div className="absolute top-4 left-4 z-10">
        <p className="text-amber-500 text-sm font-medium mb-1">{laneTitle}</p>
        <h2 id="content-title" className="text-white text-xl md:text-2xl font-bold">
          {item.title}
        </h2>
        {/* Progress indicator for videos */}
        {isYouTubeData(data) && duration > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 rounded-full ${progressPercent >= 90 ? 'bg-green-500' : 'bg-amber-500'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-gray-400 text-xs">{progressPercent}%</span>
            {progressPercent >= 90 && (
              <span className="text-green-400 text-xs">✓ Complete</span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="w-full max-w-6xl">
        {/* YouTube Video */}
        {isYouTubeData(data) && (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
            {/* Loading indicator */}
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400">Loading video...</p>
                  {savedProgress && savedProgress.progressPercent > 0 && (
                    <p className="text-amber-500 text-sm">
                      Resuming from {Math.round(savedProgress.lastPosition)}s ({savedProgress.progressPercent}%)
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* YouTube Player Container */}
            <div id="youtube-player" className="absolute inset-0 w-full h-full" />
            
            {/* Click-blocking overlays to prevent YouTube navigation */}
            <div 
              className="absolute top-0 left-0 right-0 h-16"
              style={{ zIndex: 9999 }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            />
            <div 
              className="absolute bottom-0 right-0 w-36 h-10"
              style={{ zIndex: 9999 }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            />
            
            {/* Looping indicator */}
            {data.loop && (
              <div className="absolute top-16 left-4 z-30 pointer-events-none">
                <span className="flex items-center gap-1 px-2 py-1 bg-black/60 text-white/80 text-sm rounded-full">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Looping
                </span>
              </div>
            )}
          </div>
        )}

        {/* Web Link - smart iframe with fallback */}
        {isWebLinkData(data) && (
          <SmartWebEmbed item={item} data={data} />
        )}

        {/* Static Image */}
        {isStaticImageData(data) && (
          <div className="flex items-center justify-center">
            <img
              src={data.imageUrl}
              alt={data.altText || item.title}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Smart Web Embed - Shows iframe if site allows embedding, otherwise shows "Open Website" card
 * Admin can set canEmbed: false for sites that block iframe embedding (like pbskids.org)
 */
function SmartWebEmbed({ item, data }: { item: { title: string; thumbnailUrl: string }; data: WebLinkData }) {
  const [isLoading, setIsLoading] = useState(true);
  const canEmbed = data.canEmbed !== false; // Default to true if not specified
  
  // If site is marked as not embeddable, show the "Open Website" card
  if (!canEmbed) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl border border-gray-700/50 shadow-2xl overflow-hidden">
          <div className="p-8 text-center">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
            <p className="text-gray-500 text-sm mb-4">
              {new URL(data.url).hostname}
            </p>
            
            {/* Info message */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-amber-200/80 text-sm text-left">
                  This website opens in a new window. Ask a parent to help you explore it safely!
                </p>
              </div>
            </div>
            
            <button
              onClick={() => window.open(data.url, '_blank', 'noopener,noreferrer')}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-lg rounded-xl hover:from-blue-400 hover:to-purple-500 transform hover:scale-[1.02] transition-all shadow-lg flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Website
            </button>
          </div>
          <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700/50">
            <p className="text-gray-500 text-xs text-center">
              🛡️ Parent tip: Stay nearby while your child explores external websites
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Site allows embedding - show iframe
  return (
    <div className="relative w-full h-[80vh] rounded-2xl overflow-hidden bg-gray-900 shadow-2xl">
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">Loading website...</p>
          </div>
        </div>
      )}
      
      <iframe
        src={data.url}
        title={item.title}
        className="w-full h-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}
