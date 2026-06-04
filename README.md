# Expense Tracker

A Singapore-focused expense tracker with AI-powered receipt scanning.

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create a local env file with your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

# 3. Start the dev server
npm run dev
```

> The dev server proxies `/api/*` requests automatically via Vite.
> Your key stays in `.env.local` and is never committed.

## Deploy to Vercel

### Option A — Vercel CLI

```bash
npm i -g vercel
vercel
```

Follow the prompts. When asked about environment variables, add `ANTHROPIC_API_KEY`.

### Option B — Vercel Dashboard (recommended for first deploy)

1. Push this folder to a GitHub / GitLab / Bitbucket repo.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel auto-detects Vite — no build settings needed.
4. Before deploying, go to **Settings → Environment Variables** and add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-...` (your key from [console.anthropic.com](https://console.anthropic.com))
5. Click **Deploy**.

### Getting an Anthropic API Key

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Go to **API Keys** and create a new key
3. Copy it and add it as the `ANTHROPIC_API_KEY` environment variable in Vercel

## Project Structure

```
expense-tracker/
├── api/
│   └── claude.js          # Serverless proxy — keeps your API key server-side
├── src/
│   ├── main.jsx            # React entry point
│   └── App.jsx             # Main app component
├── index.html              # HTML shell (includes Google Fonts)
├── vite.config.js
├── vercel.json
└── package.json
```

## How the API Proxy Works

Your Anthropic API key is **never exposed to the browser**. Instead:

- The React app calls `/api/claude` (a relative URL)
- Vercel routes that to `api/claude.js` (a serverless function)
- The serverless function reads `ANTHROPIC_API_KEY` from the environment and forwards the request to Anthropic

This means the key lives only in Vercel's secure environment variables store.
