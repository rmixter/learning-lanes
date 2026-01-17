/**
 * Lane - Horizontal scrolling container for content items
 * Netflix-style lane with snap scrolling and progress tracking
 */

import { useRef } from 'react';
import type { LaneItem, LaneCategory, WatchRecord } from '../types';
import { openContent } from '../stores/contentStore';
import LaneCard from './LaneCard';

interface LaneProps {
  id: string;
  title: string;
  category: LaneCategory;
  items: LaneItem[];
  watchProgressMap?: Map<string, WatchRecord>; // itemId -> WatchRecord
}

// Category colors for visual distinction
const categoryColors: Record<LaneCategory, string> = {
  School: 'from-blue-500 to-blue-600',
  Music: 'from-purple-500 to-pink-500',
  Fun: 'from-orange-500 to-red-500',
  Creativity: 'from-green-500 to-teal-500',
};

const categoryIcons: Record<LaneCategory, JSX.Element> = {
  School: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Music: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  ),
  Fun: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Creativity: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
};

export default function Lane({ id, title, category, items, watchProgressMap = new Map() }: LaneProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleItemSelect = (item: LaneItem) => {
    openContent(item, id, title);
  };
  
  // Calculate progress - only count COMPLETED items
  const completedCount = items.filter(item => {
    const progress = watchProgressMap.get(item.id);
    return progress?.completed ?? false;
  }).length;
  
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const isComplete = completedCount === items.length && items.length > 0;

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = scrollContainerRef.current.clientWidth * 0.75;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="relative py-4">
      {/* Lane Header */}
      <div className="flex items-center gap-3 px-6 md:px-12 mb-4">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${categoryColors[category]} shadow-lg ${isComplete ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-gray-900' : ''}`}>
          {isComplete ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            categoryIcons[category]
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {title}
            </h2>
            {isComplete && (
              <span className="px-2 py-0.5 text-xs font-bold bg-green-500/20 text-green-400 rounded-full">
                COMPLETE!
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2 mt-1">
            <div className="w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ease-out rounded-full ${isComplete ? 'bg-green-500' : 'bg-amber-500'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {completedCount}/{items.length} completed
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Container */}
      <div className="relative group">
        {/* Scroll Buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10
                     w-12 h-12 rounded-full bg-gray-900/90 backdrop-blur-sm
                     flex items-center justify-center
                     text-white hover:bg-amber-500 hover:text-gray-900
                     opacity-0 group-hover:opacity-100 transition-all duration-300
                     focus:outline-none focus:ring-2 focus:ring-amber-500
                     disabled:opacity-0 shadow-xl"
          aria-label="Scroll left"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10
                     w-12 h-12 rounded-full bg-gray-900/90 backdrop-blur-sm
                     flex items-center justify-center
                     text-white hover:bg-amber-500 hover:text-gray-900
                     opacity-0 group-hover:opacity-100 transition-all duration-300
                     focus:outline-none focus:ring-2 focus:ring-amber-500
                     disabled:opacity-0 shadow-xl"
          aria-label="Scroll right"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Items Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory
                     px-6 md:px-12 pb-4
                     scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700
                     hover:scrollbar-thumb-gray-600"
          style={{
            scrollbarWidth: 'thin',
            msOverflowStyle: 'none',
          }}
        >
          {items.map((item) => (
            <div key={item.id} className="snap-start">
              <LaneCard 
                item={item} 
                watchProgress={watchProgressMap.get(item.id)}
                onSelect={handleItemSelect} 
              />
            </div>
          ))}
        </div>

        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-4 w-6 md:w-12 bg-gradient-to-r from-gray-900 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-4 w-6 md:w-12 bg-gradient-to-l from-gray-900 to-transparent pointer-events-none" />
      </div>
    </section>
  );
}
