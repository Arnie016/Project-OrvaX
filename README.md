<div align="center">
  <h1>Agentic Periodontal Digital Twin</h1>
  <p>Interactive 3D perio charting with GLB tooth models, voice-driven entry, and automation.</p>
  <img alt="Intro" src="public/images/iNTRO.png" />
</div>

## Quick Start

1. Install deps: `npm install`
2. Set `GEMINI_API_KEY` in a `.env.local` file (Vite will inject it)
3. Start dev server: `npm run dev` and open the app

Full 3D model guide and controls: see [TOOTH_MODELS_README.md](TOOTH_MODELS_README.md).

## What’s Inside

- 3D scene with Three.js (`components/PerioChart.tsx`)
- Per-tooth transforms with persistence and UI (`components/ToothTransformControls.tsx`)
- Tooth data entry and AI summary (`components/Tooth.tsx`)
- Model mapping + mirroring (`toothModelMapping.ts`)

## Charting Sequence

<img alt="Charting Sequence" src="public/images/Charting%20Sequence.png" />

## Voice + Tools

<img alt="ElevenLabs Tools" src="public/images/ELEVANLABS.png" />

## Automation Flow (n8n)

<img alt="n8n Flow" src="public/images/N8N.png" />
