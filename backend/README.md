# KIP Backend Framework

Pluggable backend for onboarding company K8s / GPU / LLM stacks into KIP.

Inspired by **k8sgpt** (provider/analyzer plugins), **Backstage** (provider registry), and **OpenTelemetry Collector** (capability pipelines). Missions never call Prometheus, DCGM, or Kubernetes directly — they call **capability interfaces**. You bring your own providers.

## Architecture

```
UI ──SSE──► Next.js API ──► MissionOrchestrator ──► Capability interfaces
                                                         │
                                              ProviderRegistry.resolve(StackManifest)
                                                         │
                              ┌──────────────┬───────────┴────────────┐
                           demo          kubernetes              your-provider
```

## Quick start (demo stack)

The default stack `demo-prod-gpu-west-2` uses the built-in `demo` provider for every capability. No cluster required.

```bash
npm run dev
# POST /api/missions { "missionId": "rag-incident", "stackId": "demo-prod-gpu-west-2" }
# GET  /api/missions/<runId>/stream   (SSE MissionState)
```

Stack manifests live in [`stacks/`](../stacks/). See [`demo.yaml`](../stacks/demo.yaml).

## Onboard your infrastructure (BYO)

### 1. Implement a capability

```ts
import type { GpuTelemetry, GpuNodeMetrics } from "@/backend/src/capabilities/gpu";

export class AcmeDcgmProvider implements GpuTelemetry {
  readonly name = "acme-dcgm";

  constructor(private config: { prometheusUrl: string }) {}

  async getFleetMetrics(): Promise<GpuNodeMetrics[]> {
    // query your DCGM / Prometheus exporter
    return [];
  }

  async getNodeMetrics(nodeId: string) {
    return null;
  }

  async estimateModelRequirements({ modelParamsB, concurrentUsers }) {
    return {
      modelSize: `${modelParamsB}B`,
      vramGb: modelParamsB * 2,
      concurrentUsers,
      recommendedGpus: 4,
      gpuType: "H100",
    };
  }
}
```

### 2. Register the provider

In [`providers/register-builtins.ts`](./src/providers/register-builtins.ts) (or your own bootstrap module):

```ts
registry.register("acme-dcgm", ["gpu"], (config) =>
  new AcmeDcgmProvider({ prometheusUrl: String(config?.prometheusUrl ?? "") })
);
```

### 3. Point the Stack Manifest at it

```yaml
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
        kubeconfigPath: /var/run/secrets/kip/kubeconfig
        # or: inCluster: true
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

Drop the file in `backend/stacks/` and restart. Missions keep working — only the GPU capability switches to your stack.

### 4. Kubernetes stub

`type: kubernetes` implements `ClusterInventory` with configure hooks:

| Config | Meaning |
|--------|---------|
| `kubeconfigPath` | Path to kubeconfig |
| `inCluster` | Use in-cluster service account |
| `namespace` | Default namespace scope |
| `clusterName` | Display name |

Methods are stubbed (empty returns) until you wire `@kubernetes/client-node` — see TODOs in [`providers/kubernetes/index.ts`](./src/providers/kubernetes/index.ts).

## Capability contracts

| Capability | Used by | Typical BYO source |
|------------|---------|-------------------|
| `cluster` | Kubernetes Agent | Kubernetes API |
| `gpu` | GPU Agent | NVIDIA DCGM / DCGM exporter |
| `observability` | Runtime / Cost | Prometheus, Mimir, Loki, Grafana |
| `cost` | Cost Agent | OpenCost, Kubecost, custom |
| `policy` | Policy Agent | OPA, Kyverno, custom |
| `runtime` | Runtime Agent | vLLM / Triton / inference metrics |
| `remediation` | Approve/Reject | kubectl / GitOps / custom actuator |

## Missions

| ID | Category | Ends |
|----|----------|------|
| `gpu-fleet` | fleet | `complete` |
| `rag-incident` | incident | `awaiting-approval` |
| `gpu-provision` | capacity | `awaiting-approval` |

Plans live in [`src/missions/`](./src/missions/) and call capabilities only.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/stacks` | List onboarded stacks |
| GET | `/api/missions` | Mission catalog |
| POST | `/api/missions` | Start run `{ missionId?, prompt?, stackId? }` |
| GET | `/api/missions/:runId/stream` | SSE `MissionState` snapshots |
| POST | `/api/missions/:runId/approve` | Apply pending remediation |
| POST | `/api/missions/:runId/reject` | Reject pending remediation |

## Local UI without API

Set `NEXT_PUBLIC_USE_LOCAL_SIM=true` to use the legacy client-side simulator in `lib/mission-simulator.ts`.
