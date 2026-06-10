# Receipt Assistant 🧾

AI-powered expense tracker that turns photos of paper receipts into structured,
queryable data. Upload a photo — Gemini extracts the store, date, line items,
total and category as strict JSON — everything lands in PostgreSQL and shows up
on an analytics dashboard.

![Receipt Assistant — responsive showcase](docs/showcase.png)

## Why this project

Built as a production-style pet project to practice real-world patterns, not
tutorial code:

- **LLM Structured Outputs** — Gemini is forced to return schema-valid JSON
  (`responseSchema` + JSON mode), then the response is re-validated with Zod.
  Never trust an external service, even when it promises a format.
- **Failure-aware retry strategy** — the AI client distinguishes failure types:
  exponential backoff on `503` (model overload), instant fallback to a lighter
  model on `429` (daily quota exhausted — waiting is pointless), fail-fast on
  `401/404` (config errors that retries can't fix).
- **Atomic writes** — a receipt and its line items are inserted in a single
  PostgreSQL transaction; no orphaned data on partial failure.
- **Layered backend** — routes → controllers → services → repositories.
  SQL lives only in repositories; the AI service knows nothing about Express.
- **Defensive data handling** — parameterized queries everywhere (text the AI
  reads off a photo is untrusted input), `NUMERIC` for money, DB-level `CHECK`
  constraint on categories as the last line of defense.
- **Responsive by structure, not by shrinking** — on mobile the receipts table
  reflows into cards via CSS grid areas; touch devices get always-visible
  actions (`@media (hover: none)`), `prefers-reduced-motion` is respected.

## Stack

**Frontend:** React 18, Vite · **Backend:** Node.js, Express, Multer ·
**AI:** Google Gemini API (`@google/genai`), Zod ·
**DB:** PostgreSQL (Supabase) · **UI language:** Finnish 🇫🇮

## How it works

````
photo upload → Express (multer, in-memory buffer)
            → Gemini (structured output, Finnish system prompt)
            → Zod validation
            → PostgreSQL transaction (receipt + line items)
            → React dashboard (per-currency totals, category analytics)
````

## Running locally

````bash
# 1. Backend
cd server
npm install
cp .env.example .env        # add your GEMINI_API_KEY and DATABASE_URL
# run migrations from src/db/migrations/ against your database (in order)
node server.js

# 2. Frontend (separate terminal)
cd client
npm install
npm run dev                 # Vite proxies /api to the backend
````

Get a free Gemini API key at [Google AI Studio](https://aistudio.google.com).

## Features

- 📷 Drag-and-drop receipt upload (JPEG/PNG/WebP, 10 MB limit)
- 🤖 Extraction of store, date, line items (incl. fractional weights), total,
  currency and category — tested on real Finnish receipts (K-Market, Prisma,
  R-Kioski: YHTEENSÄ totals, PANTTI deposits, ALV breakdowns)
- 💱 Multi-currency aware: totals are aggregated per currency, never mixed
- 📊 Dashboard: totals, average receipt, color-coded category breakdown
- 🗑️ Receipt deletion (full-stack CRUD, cascade removal of line items)
- 🌙 Dark fintech UI, mobile card layout, accessibility-minded
  (keyboard focus, reduced motion, touch-visible actions)
- 🗄️ Raw AI responses stored as `JSONB` — debugging without re-spending tokens

## Known limitations & roadmap

- One category per receipt (a receipt with coffee + a bus ticket gets the
  dominant category). Planned: per-line-item categories.
- No duplicate detection yet — the same photo can be uploaded twice.
  Planned: image hash or store+date+total matching.
- Receipt images are not persisted (`image_path` column is ready).
- Planned: date-range filters, EN/FI language toggle, CSV export, live demo.

## License

MIT
