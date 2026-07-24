# KIP Backend (Python)

Pluggable FastAPI backend for onboarding company K8s / GPU / LLM stacks into KIP.

Inspired by **k8sgpt** (provider plugins), **Backstage** (provider registry), and **OpenTelemetry Collector** (capability pipelines). Missions call **capability interfaces** only — never Prometheus/DCGM/Kubernetes directly.

## Quick start

```bash
cd backend
# Prefer Python 3.11+
python3.11 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn kip.main:app --reload --port 8000
```

From the repo root (separate terminal):

```bash
npm run dev
```

Next.js proxies `/api/*` → `http://127.0.0.1:8000` (see `next.config.ts`).

Or: `npm run dev:api` for the API alone.

## Architecture

```
UI ──/api──► Next rewrite ──► FastAPI ──► MissionOrchestrator
                                              │
                                   ProviderRegistry.resolve(StackManifest)
                                              │
                         demo · kubernetes · your BYO providers
```

## Onboard your infrastructure (BYO)

### 1. Implement a capability

```python
from kip.capabilities import GpuTelemetry, GpuNodeMetrics

class AcmeDcgmProvider:
    name = "acme-dcgm"

    def __init__(self, prometheus_url: str):
        self.prometheus_url = prometheus_url

    async def get_fleet_metrics(self) -> list[GpuNodeMetrics]:
        # query your DCGM / Prometheus exporter
        return []

    async def get_node_metrics(self, node_id: str):
        return None

    async def estimate_model_requirements(self, *, model_params_b: float, concurrent_users: int):
        ...
```

### 2. Register the provider

In `kip/providers/register_builtins.py` (or your bootstrap module):

```python
registry.register(
    "acme-dcgm",
    ["gpu"],
    lambda config, kind: AcmeDcgmProvider(str((config or {}).get("prometheusUrl", ""))),
)
```

### 3. Point the Stack Manifest at it

```yaml
# backend/stacks/acme.yaml
apiVersion: kip.ai/v1
kind: StackManifest
metadata:
  name: acme-prod
spec:
  displayName: acme-prod-gpu
  providers:
    cluster:
      type: kubernetes
      config:
        kubeconfigPath: ~/.kube/config
    gpu:
      type: acme-dcgm
      config:
        prometheusUrl: https://prometheus.acme.internal
    observability: { type: demo }
    cost: { type: demo }
    policy: { type: demo }
    runtime: { type: demo }
    remediation: { type: demo }
```

Restart uvicorn — missions keep working without UI changes.

### 4. Kubernetes stub

`type: kubernetes` implements `ClusterInventory` with `kubeconfigPath` / `inCluster` hooks. Methods return empty defaults until you wire the official Kubernetes Python client (see TODOs in `kip/providers/kubernetes.py`).

## Capability contracts

| Capability | Used by | Typical BYO source |
|------------|---------|-------------------|
| `cluster` | Kubernetes Agent | Kubernetes API |
| `gpu` | GPU Agent | NVIDIA DCGM |
| `observability` | Runtime / Cost | Prometheus, Loki |
| `cost` | Cost Agent | OpenCost / custom |
| `policy` | Policy Agent | OPA / Kyverno |
| `runtime` | Runtime Agent | vLLM / Triton metrics |
| `remediation` | Approve/Reject | kubectl / GitOps |

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/stacks` | List stacks |
| GET | `/api/missions` | Mission catalog |
| POST | `/api/missions` | Start run |
| GET | `/api/missions/{runId}/stream` | SSE `MissionState` |
| POST | `/api/missions/{runId}/approve` | Apply remediation |
| POST | `/api/missions/{runId}/reject` | Reject remediation |
| GET | `/health` | Health check |

## Local UI without Python

Set `NEXT_PUBLIC_USE_LOCAL_SIM=true` to use the client-side simulator in `lib/mission-simulator.ts`.
