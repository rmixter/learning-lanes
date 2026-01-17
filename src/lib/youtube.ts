// YouTube Data API v3 integration

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  thumbnailUrl: string;
  publishedAt: string;
}

export interface YouTubeVideoDetails {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  thumbnailUrl: string;
  duration: string; // ISO 8601 duration format (PT4M13S)
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  tags?: string[];
}

export interface YouTubeSearchOptions {
  maxResults?: number;
  safeSearch?: 'none' | 'moderate' | 'strict';
  videoDuration?: 'any' | 'short' | 'medium' | 'long'; // short < 4min, medium 4-20min, long > 20min
  relevanceLanguage?: string;
  type?: 'video' | 'channel' | 'playlist';
  order?: 'relevance' | 'date' | 'rating' | 'viewCount' | 'title';
}

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Format seconds to human-readable duration
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export class YouTubeAPI {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, options: YouTubeSearchOptions = {}): Promise<YouTubeSearchResult[]> {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      key: this.apiKey,
      type: options.type || 'video',
      maxResults: String(options.maxResults || 10),
      safeSearch: options.safeSearch || 'strict',
      relevanceLanguage: options.relevanceLanguage || 'en',
      order: options.order || 'relevance',
    });

    if (options.videoDuration && options.videoDuration !== 'any') {
      params.set('videoDuration', options.videoDuration);
    }

    const response = await fetch(`${this.baseUrl}/search?${params}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`YouTube API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    return data.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      publishedAt: item.snippet.publishedAt,
    }));
  }

  async getVideoDetails(videoIds: string[]): Promise<YouTubeVideoDetails[]> {
    if (videoIds.length === 0) return [];

    const params = new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      id: videoIds.join(','),
      key: this.apiKey,
    });

    const response = await fetch(`${this.baseUrl}/videos?${params}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`YouTube API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    return data.items.map((item: any) => ({
      videoId: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
      duration: item.contentDetails.duration,
      durationSeconds: parseDuration(item.contentDetails.duration),
      viewCount: parseInt(item.statistics.viewCount || '0', 10),
      likeCount: parseInt(item.statistics.likeCount || '0', 10),
      tags: item.snippet.tags,
    }));
  }

  // Search and get full details in one call
  async searchWithDetails(query: string, options: YouTubeSearchOptions = {}): Promise<YouTubeVideoDetails[]> {
    const searchResults = await this.search(query, options);
    const videoIds = searchResults.map(r => r.videoId);
    return this.getVideoDetails(videoIds);
  }
}
