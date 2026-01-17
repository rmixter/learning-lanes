// AI Provider abstraction types - makes it easy to swap between Gemini, OpenAI, Claude, etc.

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AIProvider {
  name: string;
  generate(prompt: string, options?: AIGenerateOptions): Promise<string>;
  generateJSON<T>(prompt: string, options?: AIGenerateOptions): Promise<T>;
}

// Lane generation specific types
export interface VideoSuggestion {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration?: string;
  relevanceScore: number;
  reason: string;
}

export interface LaneSuggestion {
  title: string;
  description: string;
  category: 'Learning' | 'Entertainment' | 'Creativity' | 'Music' | 'Science' | 'Math' | 'Reading' | 'Other';
  videos: VideoSuggestion[];
  searchQueries: string[];
}

export interface GenerateLaneRequest {
  prompt: string;
  targetAge?: number;
  maxVideos?: number;
  profileName?: string;
}
