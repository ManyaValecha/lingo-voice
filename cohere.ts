// pages/api/translate-slang.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const COHERE_API_URL = "https://api.cohere.ai/v1/generate";

async function fetchSlang(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(COHERE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "command",
      prompt,
      max_tokens: 60,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to generate response from Cohere API.");
  }

  const data = await response.json();
  return data.generations?.[0]?.text?.trim() || "";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: 'Prompt is required and must be a string.' });
  }

  const apiKey = process.env.COHERE_API_KEY;

  if (!apiKey) {
    console.error("Missing Cohere API key");
    return res.status(500).json({ error: 'Missing Cohere API key in server environment variables.' });
  }

  try {
    const prompts = {
      genZ: `Convert this sentence into Gen Z slang: ${prompt}`,
      millennial: `Convert this sentence into Millennial slang: ${prompt}`,
      boomer: `Convert this sentence into Boomer slang: ${prompt}`,
    };

    const [genZText, millennialText, boomerText] = await Promise.all([
      fetchSlang(prompts.genZ, apiKey),
      fetchSlang(prompts.millennial, apiKey),
      fetchSlang(prompts.boomer, apiKey)
    ]);

    return res.status(200).json({
      original: prompt,
      genZ: genZText,
      millennial: millennialText,
      boomer: boomerText
    });
  } catch (error: any) {
    console.error("Catch error:", error.message || error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
