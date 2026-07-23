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
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

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

No environment variables required. All data is simulated client-side.

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
Orchestrator (simulated)
    ↓
Specialized Agents (K8s, GPU, Runtime, Cost, Policy)
    ↓
Structured A2UI Cards (Root Cause, Heatmap, Approval, etc.)
    ↓
Human Approval Gate
    ↓
Execute (simulated)
```

## Project Structure

```
app/                    # Next.js app router
components/
  agents/               # Agent activity panel, timeline
  cards/                # A2UI dynamic card renderer
  layout/               # Shell, nav, workload list
  mission/              # Mission workspace
lib/
  mission-simulator.ts  # Progressive agent simulation
  mock-data.ts          # Sample cluster/workload data
  types.ts              # A2UI schema types
```

## License

Private — internal demo prototype.
