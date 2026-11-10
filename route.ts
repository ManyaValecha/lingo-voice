import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt: query } = await request.json();

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Cohere API key in environment variables' }, { status: 500 });
    }

    const prompt = `
Translate the following sentence into:
1. Gen Z slang
2. Millennial slang
3. Boomer slang

Sentence: "${query}"

Respond in the format:
Gen Z: ...
Millennial: ...
Boomer: ...
`;

    const response = await fetch("https://api.cohere.ai/v1/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "command-r-plus",
        prompt,
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || "Unknown error from Cohere API" }, { status: response.status });
    }

    const message = data.generations?.[0]?.text?.trim() || "Hmm... no slang decoded 😅";

    return NextResponse.json({ message });

  } catch (error: any) {
    console.error("Cohere API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
