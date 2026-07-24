import type { CapabilityKind } from "../types";
import {
  getProviderRegistry,
  type ProviderRegistry,
} from "../core/registry";
import { createDemoCapability, DEMO_CAPABILITIES } from "./demo";
import { createKubernetesCluster } from "./kubernetes";

/**
 * Register built-in providers. Call once at process startup (API route bootstrap).
 */
export function registerBuiltinProviders(
  registry: ProviderRegistry = getProviderRegistry()
): ProviderRegistry {
  if (!registry.has("demo")) {
    registry.register(
      "demo",
      DEMO_CAPABILITIES,
      (_config, kind: CapabilityKind) => createDemoCapability(kind)
    );
  }

  if (!registry.has("kubernetes")) {
    registry.register("kubernetes", ["cluster"], (config) =>
      createKubernetesCluster(config)
    );
  }

  return registry;
}
