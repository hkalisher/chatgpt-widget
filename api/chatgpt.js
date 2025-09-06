module.exports = async (req, res) => {
  // --- CORS (allow POST + OPTIONS) ---
  // For quick testing you can leave ALLOWED_ORIGINS unset to default to "*".
  // In production, set ALLOWED_ORIGINS in Vercel to a comma-separated list,
  // e.g. "https://your-site.com,https://hoppscotch.io"
  const allowedList = (process.env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const origin = req.headers.origin || '';
  const allowOrigin = allowedList.includes('*')
    ? '*'
    : (allowedList.includes(origin) ? origin : '');

  if (allowOrigin) res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  // --- end CORS ---

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch {} }
  const prompt = body?.prompt ? String(body.prompt) : 'Hello!';
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Missing OPENAI_API_KEY on server' }));
  }

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant for an e-commerce website.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    const data = await r.json();
    if (!r.ok) {
      res.statusCode = r.status;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: data?.error?.message || 'OpenAI error', details: data }));
    }

    const reply = data?.choices?.[0]?.message?.content || '';
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ reply }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Server error', details: String(e) }));
  }
};
