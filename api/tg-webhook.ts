import type { VercelRequest, VercelResponse } from '@vercel/node';

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN as string;
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL as string;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN as string;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET as string;

async function kvSet(key: string, val: string, ttlSec?: number) {
  const ex = ttlSec ? `?EX=${ttlSec}` : '';
  const r = await fetch(
    `${UPSTASH_URL}/SET/${encodeURIComponent(key)}/${encodeURIComponent(val)}${ex}`,
    { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } }
  );
  const j = await r.json();
  return j.result === 'OK';
}

const TG_API = (token: string) => `https://api.telegram.org/bot${token}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!TG_TOKEN || !UPSTASH_URL || !UPSTASH_TOKEN || !WEBHOOK_SECRET) {
    res.status(500).json({ error: 'Server not configured' });
    return;
  }

  const secretHeader = (req.headers['x-telegram-bot-api-secret-token'] || req.headers['X-Telegram-Bot-Api-Secret-Token']) as string | undefined;
  if (secretHeader !== WEBHOOK_SECRET) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const update = req.body as any;
    const callback = update?.callback_query;
    if (callback?.data) {
      const [action, sessionId] = String(callback.data).split('|');
      if (sessionId) {
        if (action === 'approve') {
          await kvSet(`status:${sessionId}`, 'approved', 3600);
          await fetch(`${TG_API(TG_TOKEN)}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callback.id, text: 'Approved ✅' }),
          });
        } else if (action === 'reject') {
          await kvSet(`status:${sessionId}`, 'rejected', 3600);
          await fetch(`${TG_API(TG_TOKEN)}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callback.id, text: 'Rejected ❌' }),
          });
        }
      }
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
}