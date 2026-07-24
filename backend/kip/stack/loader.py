from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from kip.types import ProviderRef, StackManifest, StackMetadata, StackSpec, CAPABILITY_KINDS

DEMO_STACK = StackManifest(
    metadata=StackMetadata(name="demo-prod-gpu-west-2"),
    spec=StackSpec(
        displayName="prod-gpu-west-2",
        providers={
            "cluster": ProviderRef(type="demo"),
            "gpu": ProviderRef(type="demo"),
            "observability": ProviderRef(type="demo"),
            "cost": ProviderRef(type="demo"),
            "policy": ProviderRef(type="demo"),
            "runtime": ProviderRef(type="demo"),
            "remediation": ProviderRef(type="demo"),
        },
    ),
)


def _stacks_dir() -> Path:
    return Path(__file__).resolve().parent.parent.parent / "stacks"


def _from_dict(data: dict[str, Any]) -> StackManifest:
    providers_raw = data["spec"]["providers"]
    providers = {
        kind: ProviderRef(**providers_raw[kind])
        if isinstance(providers_raw[kind], dict)
        else ProviderRef(type=str(providers_raw[kind]))
        for kind in CAPABILITY_KINDS
        if kind in providers_raw
    }
    return StackManifest(
        apiVersion=data.get("apiVersion", "kip.ai/v1"),
        kind=data.get("kind", "StackManifest"),
        metadata=StackMetadata(name=data["metadata"]["name"]),
        spec=StackSpec(
            displayName=data["spec"]["displayName"],
            providers=providers,  # type: ignore[arg-type]
        ),
    )


def load_all_stack_manifests() -> list[StackManifest]:
    by_name: dict[str, StackManifest] = {DEMO_STACK.metadata.name: DEMO_STACK}
    directory = _stacks_dir()
    if not directory.exists():
        return list(by_name.values())

    for path in directory.glob("*.y*ml"):
        try:
            data = yaml.safe_load(path.read_text())
            if not isinstance(data, dict):
                continue
            manifest = _from_dict(data)
            by_name[manifest.metadata.name] = manifest
        except Exception:
            continue
    return list(by_name.values())


def get_stack_manifest(stack_id: str) -> StackManifest | None:
    return next(
        (m for m in load_all_stack_manifests() if m.metadata.name == stack_id),
        None,
    )
