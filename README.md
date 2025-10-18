# Agentic Periodontal Digital Twin

<img alt="Intro" src="./public/images/iNTRO.png" />

## Run locally

- Install: `npm install`
- Start: `npm run dev` → open http://localhost:3000

Optional
- AI Summary: create `.env.local` with `GEMINI_API_KEY=...`
- Chat endpoint: add `LLM_ENDPOINT=your_url` (defaults to `http://216.81.248.15:8000/generate`)

## Use

- Single-click tooth to select, double-click to zoom
- “AI Summary” for a clinical note; “Chat” to ask questions about the selected tooth
- Transform panel: move/rotate/scale → Save to persist (localStorage)

## Models (optional)

- Put .glb files in `public/` (falls back to procedural teeth if missing)

## Charting sequence

<img alt="Charting Sequence" src="./public/images/Charting%20Sequence.png" />

## Voice + tools

<img alt="ElevenLabs Tools" src="./public/images/ELEVANLABS.png" />

## Automation flow (n8n)

<img alt="n8n Flow" src="./public/images/N8N.png" />

