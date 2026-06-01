# Wardrobe

AI-powered wardrobe catalog. Take photos of your clothes, tag them with locations, and generate selling listings with AI.

## Stack

- **Next.js 16** (App Router)
- **Supabase** (Auth, PostgreSQL, Storage)
- **Tailwind CSS**
- **OpenRouter** (AI vision for item analysis)

## Quick Start

### 1. Create Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In **SQL Editor**, paste and run `supabase-schema.sql`
3. In **Storage**, create a public bucket called `item-photos`

### 2. Set up environment

```bash
cp .env.local.example .env.local
```

Fill in your Supabase project URL and anon key from **Settings > API**.

Also add your OpenRouter API key (for AI vision):

```
OPENROUTER_API_KEY=sk-or-v1-...
```

### 3. Install & run

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`. Sign in with your email via magic link.

### 4. Deploy to Vercel

Push to GitHub, then import from Vercel — zero config for Next.js.

## Roadmap

- [x] Photo upload (camera + file)
- [x] Item catalog with grid view
- [x] Location tagging
- [x] AI selling description generation
- [ ] Video support
- [ ] Multiple locations / closet mapping
- [ ] Direct marketplace posting
- [ ] Barcode / tag scanning
- [ ] Outfit builder