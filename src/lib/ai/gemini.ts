// Gemini AI Provider implementation
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, AIGenerateOptions } from './types';

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-2.5-flash') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async generate(prompt: string, options?: AIGenerateOptions): Promise<string> {
    const model = this.client.getGenerativeModel({ 
      model: this.model,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 2048,
      },
    });

    const fullPrompt = options?.systemPrompt 
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    return response.text();
  }

  async generateJSON<T>(prompt: string, options?: AIGenerateOptions): Promise<T> {
    const model = this.client.getGenerativeModel({ 
      model: this.model,
      generationConfig: {
        temperature: options?.temperature ?? 0.3, // Lower temp for JSON
        maxOutputTokens: options?.maxTokens ?? 16384, // Maximum for most models
        responseMimeType: 'application/json',
      },
    });

    const fullPrompt = options?.systemPrompt 
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();
    
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      // Try to extract JSON from the response if it's wrapped in markdown
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]) as T;
      }
      throw new Error(`Failed to parse AI response as JSON: ${text.substring(0, 200)}`);
    }
  }
}

// Factory function for easy provider creation
export function createGeminiProvider(apiKey: string): AIProvider {
  return new GeminiProvider(apiKey);
}
