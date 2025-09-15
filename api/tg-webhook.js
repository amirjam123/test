export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!TG_TOKEN || !UPSTASH_URL || !UPSTASH_TOKEN || !WEBHOOK_SECRET) { res.status(500).json({ error: 'Server not configured' }); return; }

  const secretHeader = req.headers['x-telegram-bot-api-secret-token'] || req.headers['X-Telegram-Bot-Api-Secret-Token'];
  if (secretHeader !== WEBHOOK_SECRET) { res.status(403).json({ error: 'Forbidden' }); return; }

  const kvSet = async (key, val, ttlSec) => {
    const ex = ttlSec ? `?EX=${ttlSec}` : '';
    const r = await fetch(`${UPSTASH_URL}/SET/${encodeURIComponent(key)}/${encodeURIComponent(val)}${ex}`, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } });
    const j = await r.json(); return j.result === 'OK';
  };
  const kvGet = async (key) => {
    const r = await fetch(`${UPSTASH_URL}/GET/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } });
    const j = await r.json(); return j.result ?? null;
  };
  const TG_API = (t) => `https://api.telegram.org/bot${t}`;

  try {
    const update = req.body || {};
    const callback = update.callback_query;
    const message = update.message;

    if (callback?.data) {
      const [action, sessionId] = String(callback.data).split('|');
      if (sessionId) {
        if (action === 'approve') {
          await kvSet(`status:${sessionId}`, 'approved', 3600);
          await fetch(`${TG_API(TG_TOKEN)}/answerCallbackQuery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callback_query_id: callback.id, text: 'Approved ✅' }) });
        } else if (action === 'reject') {
          await kvSet(`status:${sessionId}`, 'rejected', 3600);
          await fetch(`${TG_API(TG_TOKEN)}/answerCallbackQuery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callback_query_id: callback.id, text: 'Rejected ❌' }) });
        }
      }
    }

    if (message?.photo?.length) {
      let sessionId = null;
      const repliedId = message?.reply_to_message?.message_id;
      if (repliedId) sessionId = await kvGet(`msg_session:${repliedId}`);
      if (!sessionId && message?.caption) {
        const m = String(message.caption).match(/session[:\s#-]?([A-Za-z0-9_-]{10,})/i);
        if (m) sessionId = m[1];
      }
      if (sessionId) {
        const largest = message.photo[message.photo.length - 1];
        const fileId = largest.file_id;
        const r = await fetch(`${TG_API(TG_TOKEN)}/getFile?file_id=${encodeURIComponent(fileId)}`);
        const j = await r.json();
        const filePath = j?.result?.file_path;
        if (filePath) {
          const publicUrl = `https://api.telegram.org/file/bot${TG_TOKEN}/${filePath}`;
          await kvSet(`image:${sessionId}`, publicUrl, 3600);
          await fetch(`${TG_API(TG_TOKEN)}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: message.chat.id, text: `Image saved for session ${sessionId} ✅` }) });
        }
      }
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
}
