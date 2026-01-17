// AI Provider factory - easily swap between different AI providers
import type { AIProvider } from './types';
import { GeminiProvider } from './gemini';

export type ProviderType = 'gemini' | 'openai' | 'claude';

export function createAIProvider(
  type: ProviderType = 'gemini',
  apiKey: string
): AIProvider {
  switch (type) {
    case 'gemini':
      return new GeminiProvider(apiKey);
    
    case 'openai':
      // Future: import and return OpenAI provider
      throw new Error('OpenAI provider not yet implemented. Add @openai/api package and create openai.ts');
    
    case 'claude':
      // Future: import and return Claude provider
      throw new Error('Claude provider not yet implemented. Add @anthropic-ai/sdk package and create claude.ts');
    
    default:
      throw new Error(`Unknown AI provider: ${type}`);
  }
}

// Re-export types
export * from './types';
