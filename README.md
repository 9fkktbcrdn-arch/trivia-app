# Family Trivia

A polished, AI-powered family trivia app for dinner table play. Two modes: competitive **Game Time** (teams, steal mechanic, confetti winner reveal) and relaxed **Practice** (open-ended, no pressure).

Built with Next.js 16 · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion · Claude AI.

---

## Quick Start

### 1. Set up your API key

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at [console.anthropic.com](https://console.anthropic.com).

### 2. Install dependencies

```bash
npm install
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — works best on a phone or tablet held at the dinner table.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
/app
  /api
    /questions        → POST: generate trivia questions via Claude
    /categories       → GET/POST: category storage (recent + custom)
    /choose-category  → POST: Claude picks a random category
  layout.tsx          → Root layout (Geist font, dark class)
  page.tsx            → App entry point → AppShell

/components
  AppShell.tsx        → Screen router + GameProvider wrapper
  PageWrapper.tsx     → Shared layout + heading components
  /screens
    LandingScreen.tsx
    SetupModeScreen.tsx
    SetupTeamsScreen.tsx
    SetupCategoriesScreen.tsx
    SetupReviewScreen.tsx
    LoadingScreen.tsx   → Pre-generates full question pool
    GameScreen.tsx      → Alternating turns, steal mechanic, tiebreaker
    PracticeScreen.tsx  → Casual streaming questions
    ResultsScreen.tsx   → Winner reveal + confetti + recap

/lib
  types.ts            → All TypeScript interfaces
  utils.ts            → Helpers, scoring, PRESET_CATEGORIES list
  game-context.tsx    → React context + reducer (all game state)
  storage.ts          → JSON file reads/writes (swap for DB later)

/data
  categories.json     → Persists recent + custom categories across sessions
```

---

## How to Play

### Game Time
1. Choose **Game Time** → enter team names (typically Kids vs Parents)
2. Pick 4 categories + difficulty for each (Easy=100pts, Medium=200pts, Hard=300pts)
3. Slot 5 is a **Mystery** — category revealed at game start
4. Choose game length (10 or 20 questions per team)
5. Questions are generated in parallel and shuffled across all categories
6. Teams alternate answering. Wrong answer → other teams get a **steal attempt** (worth half points, but costs half points if wrong!)
7. Winner is declared with confetti. Tie → sudden death tiebreaker.

### Practice
1. Choose **Practice** → pick one category
2. Questions stream indefinitely; answer at your own pace
3. Correct answer + fun fact revealed after each question
4. Hit **End session** whenever you're done

---

## Swapping to a Database

All persistence is in `lib/storage.ts`. It reads/writes `data/categories.json`.
To move to a hosted DB (Postgres, Supabase, etc.), replace only the four exported functions in that file:
- `getCategories()`
- `recordCategoryPlayed(name)`
- `removeRecentCategory(name)`
- `addCustomCategory(name)`

The rest of the app is unaffected.

---

## Deploying to Vercel

1. Push this repo to GitHub
2. Import into Vercel
3. Add `ANTHROPIC_API_KEY` as an environment variable in the Vercel dashboard
4. Note: `data/categories.json` won't persist on Vercel's serverless functions — swap for a DB before deploying (see above)
