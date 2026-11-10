import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  console.log("Received prompt:", prompt);

  const apiKey = process.env.COHERE_API_KEY;

  if (!apiKey) {
    console.error("Missing Cohere API key");
    return res.status(500).json({ error: 'Missing Cohere API key in server environment variables' });
  }

  try {
    const genZPrompt = `Convert this sentence into Gen Z slang: ${prompt}`;
    const millennialPrompt = `Convert this sentence into Millennial slang: ${prompt}`;
    const boomerPrompt = `Convert this sentence into Boomer slang: ${prompt}`;

    const [genZRes, millennialRes, boomerRes] = await Promise.all([
      fetch("https://api.cohere.ai/v1/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "command",
          prompt: genZPrompt,
          max_tokens: 60,
          temperature: 0.7,
        }),
      }),
      fetch("https://api.cohere.ai/v1/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "command",
          prompt: millennialPrompt,
          max_tokens: 60,
          temperature: 0.7,
        }),
      }),
      fetch("https://api.cohere.ai/v1/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "command",
          prompt: boomerPrompt,
          max_tokens: 60,
          temperature: 0.7,
        }),
      })
    ]);

    if (!genZRes.ok) {
      const errorText = await genZRes.text();
      console.error("GenZ API error:", errorText);
      return res.status(500).json({ error: 'Error generating Gen Z text' });
    }
    if (!millennialRes.ok) {
      const errorText = await millennialRes.text();
      console.error("Millennial API error:", errorText);
      return res.status(500).json({ error: 'Error generating Millennial text' });
    }
    if (!boomerRes.ok) {
      const errorText = await boomerRes.text();
      console.error("Boomer API error:", errorText);
      return res.status(500).json({ error: 'Error generating Boomer text' });
    }

    const genZData = await genZRes.json();
    const millennialData = await millennialRes.json();
    const boomerData = await boomerRes.json();

    console.log("GenZ response:", genZData.generations?.[0]?.text);
    console.log("Millennial response:", millennialData.generations?.[0]?.text);
    console.log("Boomer response:", boomerData.generations?.[0]?.text);

    return res.status(200).json({
      genZ: genZData.generations?.[0]?.text.trim() || "",
      millennial: millennialData.generations?.[0]?.text.trim() || "",
      boomer: boomerData.generations?.[0]?.text.trim() || ""
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error("Cohere request failed");
    return res.status(500).json({ error: message });
  }
}
