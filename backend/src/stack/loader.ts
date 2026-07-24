import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import type { StackManifest } from "../types";
import { isStackManifest, validateStackManifest } from "./schema";

/** Built-in demo stack (always available even if YAML is unavailable at runtime). */
export const DEMO_STACK_MANIFEST: StackManifest = {
  apiVersion: "kip.ai/v1",
  kind: "StackManifest",
  metadata: { name: "demo-prod-gpu-west-2" },
  spec: {
    displayName: "prod-gpu-west-2",
    providers: {
      cluster: { type: "demo" },
      gpu: { type: "demo" },
      observability: { type: "demo" },
      cost: { type: "demo" },
      policy: { type: "demo" },
      runtime: { type: "demo" },
      remediation: { type: "demo" },
    },
  },
};

/**
 * Minimal YAML subset parser for Stack Manifest files.
 * Supports the flat structure used by KIP stacks (no anchors/multiline).
 */
export function parseSimpleYaml(source: string): unknown {
  const lines = source
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*$/, ""))
    .filter((l) => l.trim().length > 0);

  type Node = Record<string, unknown>;
  const root: Node = {};
  const stack: Array<{ indent: number; node: Node }> = [{ indent: -1, node: root }];

  for (const raw of lines) {
    const indent = raw.match(/^\s*/)?.[0].length ?? 0;
    const trimmed = raw.trim();
    const match = trimmed.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;

    const [, key, valueRaw] = match;
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].node;

    if (valueRaw === "") {
      const child: Node = {};
      parent[key] = child;
      stack.push({ indent, node: child });
    } else {
      const value = coerceScalar(valueRaw);
      parent[key] = value;
    }
  }

  return root;
}

function coerceScalar(raw: string): unknown {
  const v = raw.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

export function loadStackManifestFromYaml(source: string): StackManifest {
  const parsed = parseSimpleYaml(source);
  if (!isStackManifest(parsed)) {
    throw new Error("Invalid StackManifest YAML");
  }
  const errors = validateStackManifest(parsed);
  if (errors.length) {
    throw new Error(`Invalid StackManifest: ${errors.join("; ")}`);
  }
  return parsed;
}

function stacksDir(): string {
  return join(process.cwd(), "backend", "stacks");
}

export function loadAllStackManifests(): StackManifest[] {
  const byName = new Map<string, StackManifest>();
  byName.set(DEMO_STACK_MANIFEST.metadata.name, DEMO_STACK_MANIFEST);

  const dir = stacksDir();
  if (!existsSync(dir)) {
    return Array.from(byName.values());
  }

  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;
    try {
      const source = readFileSync(join(dir, file), "utf8");
      const manifest = loadStackManifestFromYaml(source);
      byName.set(manifest.metadata.name, manifest);
    } catch {
      // Skip invalid files; demo stack remains available.
    }
  }

  return Array.from(byName.values());
}

export function getStackManifest(stackId: string): StackManifest | undefined {
  return loadAllStackManifests().find((m) => m.metadata.name === stackId);
}
