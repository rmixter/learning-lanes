// API endpoint for AI lane generation
// This runs server-side to keep API keys secure
import type { APIRoute } from 'astro';
import { LaneGenerator } from '../../lib/laneGenerator';

// Disable prerendering - this must be server-rendered
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { prompt, profileName, targetAge, maxVideos } = body;

    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get API keys from environment
    const youtubeApiKey = import.meta.env.YOUTUBE_API_KEY;
    const geminiApiKey = import.meta.env.GEMINI_API_KEY;

    if (!youtubeApiKey || !geminiApiKey) {
      console.error('Missing API keys:', { 
        hasYouTube: !!youtubeApiKey, 
        hasGemini: !!geminiApiKey 
      });
      return new Response(JSON.stringify({ 
        error: 'Server configuration error: Missing API keys' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const generator = new LaneGenerator(youtubeApiKey, geminiApiKey);
    
    const result = await generator.generate({
      prompt,
      profileName,
      targetAge: targetAge ? parseInt(targetAge, 10) : undefined,
      maxVideos: maxVideos ? parseInt(maxVideos, 10) : 8,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Lane generation error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to generate lane' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
