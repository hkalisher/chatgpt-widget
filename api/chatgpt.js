// File: api/chatgpt.js
// Works on Vercel Serverless Functions (Node 18/20). No SDK needed.

module.exports = async (req, res) => {
  // Basic CORS so you can call this from anywhere (Hoppscotch, your site, etc.)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS,GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Simple health-check (handy for quick tests in the browser)
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      hasKey: Boolean(process.env.OPENAI_API_KEY)
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY on server' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { prompt } = body;
    if (!prompt) {
      return res.status(400).json({ error: 'Missing "prompt" in JSON body' });
    }

    // Call OpenAI directly via HTTPS (no SDK). Node 18/20 has global fetch.
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Use a widely-available, cheaper chat model to reduce access issues.
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant for an e-commerce website.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      // Log full details to Vercel function logs, but return a safe message to the client
      console.error('OpenAI API error:', upstream.status, data);
      return res.status(502).json({
        error: 'OpenAI API error',
        status: upstream.status,
        details: data
      });
    }

    const reply = data?.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
