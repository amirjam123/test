import type { VercelRequest, VercelResponse } from '@vercel/node';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL as string;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN as string;

async function kvGet(key: string) {
  const r = await fetch(`${UPSTASH_URL}/GET/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  const j = await r.json();
  return j.result ?? null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const sessionId = (req.query.sessionId || req.query.session) as string | undefined;
  if (!sessionId) {
    res.status(400).json({ error: 'Missing sessionId' });
    return;
  }
  try {
    const status = await kvGet(`status:${sessionId}`);
    const image = await kvGet(`image:${sessionId}`);
    res.status(200).json({ status: status || 'pending', image: image || null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
}