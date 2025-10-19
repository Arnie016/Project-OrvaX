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

## App screenshot

<img alt="Webapp Screenshot" src="./public/images/Screenshot%202025-10-19%20at%207.51.02%E2%80%AFAM.png" />

## Training dataset

- Source: [Hugging Face — periodontal-reasoning-40k](https://huggingface.co/datasets/Wildstash/periodontal-reasoning-40k)
- License: CC BY 4.0
- Format: JSONL rows with `prompt`, `completion`, `label ∈ {1, -1}`

Quick load example (Python):

```python
from datasets import load_dataset

ds = load_dataset("Wildstash/periodontal-reasoning-40k", split="train")

# Each row: {"prompt": str, "completion": str, "label": 1 or -1}
print(ds[0])
```

DPO/KTO prep (optional):

```python
pos = ds.filter(lambda x: x["label"] == 1)
neg = ds.filter(lambda x: x["label"] == -1)
```

---

## 1️⃣ Overview

- Orva is the PerioCharting Agent responsible for periodontal dictation, structured data logging, and webhook persistence.
- Position in system: ElevenLabs (voice) → n8n (routing) → Supabase (storage) → App (visualization).
- Purpose: Converts clinical voice dictation into JSON payloads in real time.

## 2️⃣ Personality & Behavior

- Tone: calm, professional; pace ~120–140 wpm; concise confirmations only.
- Responses limited to confirmations/errors; no small talk.
- Confirmation style: one-line ack; brief 1s pause between prompts.

```text
Dentist: "Pocket depths buccal one seven three-one-two..."
Orva: "Got it, logged successfully." (pause 1s)
```

## 3️⃣ Session Goal

- Collect full-mouth PD and REC in a fixed sequence.
- Capture flags per site: bleeding, plaque; and per tooth: mobility, furcation.
- High-pocket summary rule: any site with PD > 4 mm is flagged.
- Integrates with missingMap renumbering for omitted teeth.

## 4️⃣ Tool Calling Logic

| Tool | Type | Trigger | Notes |
|------|------|---------|-------|
| addPocketDepth2 | Webhook | After PD dictation | source of truth |
| addRecession2 | Webhook | After REC dictation |  |
| addBleeding2 | Webhook | When bleeding flagged |  |
| addPlaque2 | Webhook | When plaque flagged |  |
| addMobility2 | Webhook | When mobility flagged |  |
| addFurcation2 | Webhook | When furcation flagged |  |
| addMissingTeeth2 | Webhook | On missing tooth announcement | renumbering |
| storePatientMemory2 | Webhook | Non‑clinical remark | mem0/Gemini opt‑in |
| scheduleAppointment | Webhook | Appointment intent |  |
| identifyHighPockets | Client | After final REC | generates summary |

## 5️⃣ Dictation Parsing Rules

- Triplets: "3 3 3" → [3,3,3]
- "Same" → reuse previous triplet
- "Skip" → `{ skipped: true }`
- Site overwrite: "Mesial is four" → last triplet[Mesial]=4
- Edge cases: invalid counts → ask once → skip; missing tooth uses renumbering.

## 6️⃣ Example Input–Output

Input
```text
"Buccal one seven three-one-two two-three-one three-two-two..."
```
Output
```json
{
  "surface": "buccal",
  "quadrant": 1,
  "teeth": [{ "tooth": 7, "depths": [3,1,2] }]
}
```

## 7️⃣ Prompt Sequence

- 16 steps: UR buccal PD → UL buccal PD → UR buccal REC → UL palatal REC → … → LL lingual REC.
- Flags (BOP/plaque/mobility/furcation) prompted after each PD/REC segment.
- First PD entry calls `logFirstBuccalData` with the same payload.

## 8️⃣ Confirmation Protocol

| Event | Response |
|-------|----------|
| PD or REC success | "Got it, logged successfully." |
| Bleeding | "Got it, bleeding logged." |
| Mobility | "Got it, mobility graded." |
| Plaque | "Got it, plaque logged." |
| Furcation | "Got it, furcation logged." |
| Error | "Please repeat." / "Skipping." |

## 9️⃣ Correction & Revision Protocol

- In-place replacement of tooth/site values.
- Rebuild quadrant and resend if numbering changes.
- Late missing-tooth correction adjusts renumbering and replays affected steps.
- Flag corrections repost updated webhook; ask at most twice for clarification.

## 🔟 High-Pocket Analysis

- Runs after last REC via `identifyHighPockets`.
- Rule: site PD > 4 mm → flagged.
- Example: "High pockets detected on teeth 17 and 26."

## 11️⃣ Memory Integration

- Detects non‑clinical notes; posts `storePatientMemory2` payload (Mem0/Gemini optional).
- Recalls prior notes next session to personalize briefings.

## 12️⃣ Webhook Communication & Security

- Convex URL: `https://glorious-mosquito-126.convex.site/...`
- HMAC: `ELEVENLABS_WEBHOOK_SECRET`
- Flow: Tool → n8n → Supabase → 2xx → Orva confirmation.

## 13️⃣ Handoff Logic

| Trigger | Action |
|---------|--------|
| Mentions other specialty | `<handoff_to_triage>` |
| "back", "main menu" | `<handoff_to_triage>` |
| Appointment intent | `scheduleAppointment` |
| Memory remark | `storePatientMemory2` |

## 14️⃣ Guardrails

- No unsolicited talk; no medical interpretation.
- Always confirm after success; always follow step order.
- Retry once on webhook delay.

## 15️⃣ Completion & Reset

- "Charting complete — summary delivered. Let me know if you need anything else."
- Reset transient buffers; keep persistent `{ allPD }`; wait silently.

## ✅ Optional add‑ons

- Internal state machine: Listen → Parse → Call tool → Confirm → Await → Next prompt.
- Example session log; JSON schemas for payload validation.

