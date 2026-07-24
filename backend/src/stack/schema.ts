import type { CapabilityKind, ProviderRef, StackManifest } from "../types";

export const CAPABILITY_KINDS: CapabilityKind[] = [
  "cluster",
  "gpu",
  "observability",
  "cost",
  "policy",
  "runtime",
  "remediation",
];

export function isStackManifest(value: unknown): value is StackManifest {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.apiVersion !== "kip.ai/v1" || v.kind !== "StackManifest") return false;
  const metadata = v.metadata as Record<string, unknown> | undefined;
  const spec = v.spec as Record<string, unknown> | undefined;
  if (!metadata?.name || typeof metadata.name !== "string") return false;
  if (!spec?.displayName || typeof spec.displayName !== "string") return false;
  if (!spec.providers || typeof spec.providers !== "object") return false;
  return true;
}

export function validateStackManifest(manifest: StackManifest): string[] {
  const errors: string[] = [];
  for (const kind of CAPABILITY_KINDS) {
    const ref = manifest.spec.providers[kind] as ProviderRef | undefined;
    if (!ref?.type) {
      errors.push(`Missing provider for capability "${kind}"`);
    }
  }
  return errors;
}
