# Kubernetes Intelligence Platform (KIP)

A mission-first, agentic AI Operations Control Center for Kubernetes, GPU, and LLM infrastructure. Built as a demo-ready prototype deployable to Vercel in one step.

## Features

- **Mission-first interaction model** — state an operational goal, not a chat query
- **Progressive agent collaboration** — watch specialized agents investigate in real time
- **A2UI-inspired dynamic cards** — mission-specific UI components rendered from structured schemas
- **Auditable agent activity** — timeline, tool calls, evidence, and confidence scores
- **Human approval gates** — remediation and provisioning require explicit approval
- **Dynatrace-inspired dark enterprise theme** — dense, professional, trustworthy

## Three Demo Missions

1. **GPU Fleet Intelligence** — "Show me unhealthy or underutilized GPUs across production."
2. **LLM Memory Incident** — "Why is the RAG inference service failing?"
3. **GPU Provisioning** — "Provision capacity for a 70B model with 2,000 concurrent users."

## Quick Start

```bash
# Terminal 1 — Python API (requires Python 3.11+)
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn kip.main:app --reload --port 8000

# Terminal 2 — UI
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Next.js proxies `/api/*` to the FastAPI backend.

Optional: `NEXT_PUBLIC_USE_LOCAL_SIM=true` runs the old client-side simulator (no Python needed).

## Deploy to Vercel

### Option A: Vercel CLI

```bash
npm install -g vercel
vercel
```

### Option B: GitHub + Vercel Dashboard

1. Push this folder to a GitHub repository
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Vercel auto-detects Next.js — click Deploy

**Note:** The Python API must be hosted separately (Fly.io, Railway, Render, Cloud Run, etc.). Set `KIP_PYTHON_API_URL` on Vercel to that origin so Next.js rewrites `/api/*` correctly. For a pure static demo without Python, set `NEXT_PUBLIC_USE_LOCAL_SIM=true`.

See [`backend/README.md`](backend/README.md) to bring your own K8s/GPU stack.


## Tech Stack

- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4
- Framer Motion (progressive rendering)
- Recharts (GPU/utilization charts)
- Lucide React (icons)

## Architecture

```
Mission Prompt
    ↓
Next.js (/api rewrite) → Python FastAPI
    ↓
MissionOrchestrator + capability providers (demo | kubernetes | BYO)
    ↓
Specialized Agents (K8s, GPU, Runtime, Cost, Policy)
    ↓
Structured A2UI Cards → Human Approval → RemediationExecutor
```

Onboard real infrastructure via Stack Manifests — see [`backend/README.md`](backend/README.md).

## Project Structure

```
app/                    # Next.js UI
backend/                # Python FastAPI pluggable framework
  kip/
    capabilities.py     # Capability Protocols
    core/               # Registry, orchestrator, run store
    missions/           # Mission plans
    providers/          # demo + kubernetes stubs
    main.py             # FastAPI app
  stacks/               # Stack Manifest YAMLs
components/
lib/
  use-mission-simulation.ts  # UI ↔ SSE API client
  mission-simulator.ts       # Optional local sim fallback
```

## License

Private — internal demo prototype.
