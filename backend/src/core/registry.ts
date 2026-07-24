import type { CapabilityKind, ProviderRef, StackManifest } from "../types";
import type { ResolvedStack } from "../capabilities";
import type { ClusterInventory } from "../capabilities/cluster";
import type { GpuTelemetry } from "../capabilities/gpu";
import type { Observability } from "../capabilities/observability";
import type { CostModel } from "../capabilities/cost";
import type { PolicyGate } from "../capabilities/policy";
import type { InferenceRuntime } from "../capabilities/runtime";
import type { RemediationExecutor } from "../capabilities/remediation";
import { CAPABILITY_KINDS, validateStackManifest } from "../stack/schema";

export type ProviderFactory = (
  config: Record<string, unknown> | undefined,
  kind: CapabilityKind
) => CapabilityInstance;

export type CapabilityInstance =
  | ClusterInventory
  | GpuTelemetry
  | Observability
  | CostModel
  | PolicyGate
  | InferenceRuntime
  | RemediationExecutor;

interface ProviderRegistration {
  type: string;
  capabilities: CapabilityKind[];
  factory: ProviderFactory;
}

/**
 * ProviderRegistry — k8sgpt/Backstage-style plugin registry.
 * Companies register BYO providers by type id, then bind them via Stack Manifest.
 */
export class ProviderRegistry {
  private providers = new Map<string, ProviderRegistration>();

  register(
    type: string,
    capabilities: CapabilityKind[],
    factory: ProviderFactory
  ): void {
    this.providers.set(type, { type, capabilities, factory });
  }

  list(): Array<{ type: string; capabilities: CapabilityKind[] }> {
    return Array.from(this.providers.values()).map((p) => ({
      type: p.type,
      capabilities: p.capabilities,
    }));
  }

  has(type: string): boolean {
    return this.providers.has(type);
  }

  create(ref: ProviderRef, kind: CapabilityKind): CapabilityInstance {
    const reg = this.providers.get(ref.type);
    if (!reg) {
      throw new Error(
        `Unknown provider type "${ref.type}". Register it with ProviderRegistry.register().`
      );
    }
    return reg.factory(ref.config, kind);
  }

  resolve(manifest: StackManifest): ResolvedStack {
    const errors = validateStackManifest(manifest);
    if (errors.length) {
      throw new Error(errors.join("; "));
    }

    const instances: Partial<Record<CapabilityKind, CapabilityInstance>> = {};

    for (const kind of CAPABILITY_KINDS) {
      const ref = manifest.spec.providers[kind];
      const reg = this.providers.get(ref.type);
      if (!reg) {
        throw new Error(
          `Provider "${ref.type}" for capability "${kind}" is not registered`
        );
      }
      if (!reg.capabilities.includes(kind)) {
        throw new Error(
          `Provider "${ref.type}" does not implement capability "${kind}"`
        );
      }
      instances[kind] = this.create(ref, kind);
    }

    return {
      id: manifest.metadata.name,
      displayName: manifest.spec.displayName,
      cluster: instances.cluster as ClusterInventory,
      gpu: instances.gpu as GpuTelemetry,
      observability: instances.observability as Observability,
      cost: instances.cost as CostModel,
      policy: instances.policy as PolicyGate,
      runtime: instances.runtime as InferenceRuntime,
      remediation: instances.remediation as RemediationExecutor,
    };
  }
}

let singleton: ProviderRegistry | null = null;

export function getProviderRegistry(): ProviderRegistry {
  if (!singleton) {
    singleton = new ProviderRegistry();
  }
  return singleton;
}

/** Test helper — reset singleton between tests. */
export function resetProviderRegistry(): void {
  singleton = null;
}
