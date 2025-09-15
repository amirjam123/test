# Vercel + Telegram Bot Setup Instructions

## Step 1: Create a Telegram Bot

1. Open Telegram and search for "@BotFather"
2. Start a chat with BotFather and send `/newbot`
3. Choose a name for your bot (e.g., "Cook Islands Credit Bot")
4. Choose a username for your bot (must end with "bot", e.g., "cookislandscreditbot")
5. BotFather will give you a token like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
6. Save this token - you'll need it later

## Step 2: Get Your Chat ID

1. Send a message to your bot (any message)
2. Go to this URL in your browser (replace TOKEN with your bot token):
   ```
   https://api.telegram.org/botTOKEN/getUpdates
   ```
3. Look for "chat":{"id": in the response - this number is your chat ID
4. Save this chat ID - you'll need it later

## Step 3: Deploy to Vercel

1. Create a Vercel account at https://vercel.com
2. Install Vercel CLI: `npm i -g vercel`
3. In your project directory, run: `vercel`
4. Follow the prompts to link your project
5. Go to your Vercel dashboard and find your project

## Step 4: Set Environment Variables

1. In your Vercel project dashboard, go to Settings > Environment Variables
2. Add these variables:
   - `TELEGRAM_BOT_TOKEN`: Your bot token from Step 1
   - `TELEGRAM_CHAT_ID`: Your chat ID from Step 2

## Step 5: Set up reCAPTCHA

1. Go to https://www.google.com/recaptcha/admin
2. Click "+" to create a new site
3. Choose reCAPTCHA v3
4. Add your domain (your Vercel app URL)
5. Get your site key and secret key
6. Your site key (6LdprckrAAAAAK0erhlXi_oiNO1IZSmbOCVvis-S) is already configured
7. Add `RECAPTCHA_SECRET_KEY` as an environment variable in Vercel with your secret key

## Step 6: Deploy Updates

1. Run `vercel --prod` to deploy your updated code
2. Your bot should now receive messages when users submit data

## Testing

1. Visit your deployed Vercel URL
2. Complete the form
3. Check your Telegram bot for received messages

## Important Security Notes

- Keep your bot token secure and never commit it to version control
- Use environment variables for all sensitive data
- Consider implementing rate limiting to prevent spam
- Validate all input data before processing

## Troubleshooting

- If messages aren't being received, check your environment variables
- Make sure your bot token and chat ID are correct
- Check Vercel function logs for any errors
- Test the Telegram API manually using the getUpdates endpoint