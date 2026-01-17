// Lane Generator - Orchestrates AI and YouTube to create curated lanes
import { createAIProvider, type GenerateLaneRequest, type LaneSuggestion, type VideoSuggestion } from './ai';
import { YouTubeAPI, type YouTubeVideoDetails, formatDuration } from './youtube';

// Trusted channels that are known to be kid-friendly and high-quality
const TRUSTED_CHANNELS = [
  'Numberblocks',
  'Art for Kids Hub',
  'National Geographic Kids',
  'SciShow Kids',
  'Crash Course Kids',
  'PBS Kids',
  'Sesame Street',
  'Khan Academy',
  'Peekaboo Kidz',
  'Free School',
  'Fun Kids English',
  'Super Simple Songs',
  'Cocomelon',
  'BabyBus',
  'Little Baby Bum',
  'The Kids Picture Show',
  'Blippi',
  'StoryBots',
];

interface GeneratedLane {
  title: string;
  description: string;
  category: 'Learning' | 'Entertainment' | 'Creativity' | 'Music' | 'Science' | 'Math' | 'Reading' | 'Other';
  items: Array<{
    title: string;
    thumbnailUrl: string;
    type: 'youtube_video';
    data: {
      videoId: string;
      startTime?: number;
      endTime?: number;
      loop: boolean;
    };
    relevanceScore: number;
    reason: string;
    duration: string;
    channelTitle: string;
  }>;
}

export class LaneGenerator {
  private youtube: YouTubeAPI;
  private geminiApiKey: string;

  constructor(youtubeApiKey: string, geminiApiKey: string) {
    this.youtube = new YouTubeAPI(youtubeApiKey);
    this.geminiApiKey = geminiApiKey;
  }

  async generate(request: GenerateLaneRequest): Promise<GeneratedLane> {
    const { prompt, targetAge, maxVideos = 8, profileName } = request;

    // Step 1: Use AI to generate search queries and lane metadata
    const ai = createAIProvider('gemini', this.geminiApiKey);
    
    const planningPrompt = `You are helping create a curated educational video lane for a child${profileName ? ` named ${profileName}` : ''}${targetAge ? ` who is around ${targetAge} years old` : ''}.

The parent's request is: "${prompt}"

Generate a JSON response with:
1. A catchy, kid-friendly title for this lane (max 30 chars)
2. A brief description (max 100 chars)
3. The best category from: Learning, Entertainment, Creativity, Music, Science, Math, Reading, Other
4. 3-5 YouTube search queries that would find high-quality, age-appropriate educational videos for this topic

Focus on:
- Educational value
- Age-appropriate content
- Engaging presentation for kids
- Variety within the topic

Respond with this exact JSON structure:
{
  "title": "string",
  "description": "string", 
  "category": "string",
  "searchQueries": ["query1", "query2", "query3"]
}`;

    const plan = await ai.generateJSON<{
      title: string;
      description: string;
      category: string;
      searchQueries: string[];
    }>(planningPrompt, { temperature: 0.7 });

    // Step 2: Search YouTube with each query
    const allVideos: YouTubeVideoDetails[] = [];
    const seenVideoIds = new Set<string>();

    for (const query of plan.searchQueries.slice(0, 4)) {
      try {
        const videos = await this.youtube.searchWithDetails(
          `${query} for kids educational`,
          {
            maxResults: 5, // Reduced from 8 to get fewer total videos
            safeSearch: 'strict',
            videoDuration: 'medium', // 4-20 minutes - good for kids
            order: 'relevance',
          }
        );

        for (const video of videos) {
          if (!seenVideoIds.has(video.videoId)) {
            seenVideoIds.add(video.videoId);
            allVideos.push(video);
          }
        }
      } catch (error) {
        console.error(`Search failed for query "${query}":`, error);
      }
    }

    // Step 3: Use AI to filter and rank the videos
    const filterPrompt = `You are filtering YouTube videos for a children's educational lane about: "${prompt}"

Here are the candidate videos:
${allVideos.map((v, i) => `
${i + 1}. "${v.title}"
   Channel: ${v.channelTitle}
   Duration: ${formatDuration(v.durationSeconds)}
   Views: ${v.viewCount.toLocaleString()}
   Description: ${v.description.substring(0, 200)}...
`).join('\n')}

Select the ${maxVideos} best videos for this lane. Consider:
- Relevance to "${prompt}"
- Educational quality
- Age-appropriateness (avoid scary, violent, or inappropriate content)
- Production quality (prefer established educational channels)
- Variety (don't pick 5 videos on the exact same sub-topic)
- Duration (2-15 minutes is ideal for kids)

Trusted educational channels to prefer: ${TRUSTED_CHANNELS.slice(0, 10).join(', ')}

Respond with this exact JSON structure:
{
  "selectedVideos": [
    {
      "index": 1,
      "relevanceScore": 95,
      "reason": "One short sentence (max 15 words) why this is good"
    }
  ]
}

IMPORTANT: Keep each "reason" to ONE SHORT SENTENCE (max 15 words).
Only include videos that are truly appropriate and educational. If a video seems questionable, don't include it.`;

    const filterResult = await ai.generateJSON<{
      selectedVideos: Array<{
        index: number;
        relevanceScore: number;
        reason: string;
      }>;
    }>(filterPrompt, { temperature: 0.3 });

    // Step 4: Build the final lane
    const selectedItems = filterResult.selectedVideos
      .filter(s => s.index > 0 && s.index <= allVideos.length)
      .slice(0, maxVideos)
      .map(selection => {
        const video = allVideos[selection.index - 1];
        return {
          title: video.title,
          thumbnailUrl: video.thumbnailUrl,
          type: 'youtube_video' as const,
          data: {
            videoId: video.videoId,
            loop: false,
          },
          relevanceScore: selection.relevanceScore,
          reason: selection.reason,
          duration: formatDuration(video.durationSeconds),
          channelTitle: video.channelTitle,
        };
      });

    // Sort by relevance score
    selectedItems.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      title: plan.title,
      description: plan.description,
      category: plan.category as GeneratedLane['category'],
      items: selectedItems,
    };
  }
}
