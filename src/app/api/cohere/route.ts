import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    const apiKey = process.env.COHERE_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Cohere API key in server environment variables' }),
        { status: 500 }
      );
    }

    const response = await fetch("https://api.cohere.ai/v1/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "command",
        prompt: `Convert this sentence into Gen Z slang: ${prompt}`,
        max_tokens: 60,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.message || "Unknown error from Cohere API" }), { status: response.status });
    }

    return new Response(JSON.stringify({ text: data.generations[0].text.trim() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

