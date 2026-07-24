from __future__ import annotations

from collections.abc import Callable
from typing import Any

from kip.capabilities import ResolvedStack
from kip.types import CAPABILITY_KINDS, CapabilityKind, ProviderRef, StackManifest

ProviderFactory = Callable[[dict[str, Any] | None, CapabilityKind], Any]


class ProviderRegistry:
    """k8sgpt/Backstage-style plugin registry for BYO capability providers."""

    def __init__(self) -> None:
        self._providers: dict[str, dict[str, Any]] = {}

    def register(
        self,
        type_id: str,
        capabilities: list[CapabilityKind],
        factory: ProviderFactory,
    ) -> None:
        self._providers[type_id] = {
            "type": type_id,
            "capabilities": capabilities,
            "factory": factory,
        }

    def has(self, type_id: str) -> bool:
        return type_id in self._providers

    def list(self) -> list[dict[str, Any]]:
        return [
            {"type": p["type"], "capabilities": p["capabilities"]}
            for p in self._providers.values()
        ]

    def create(self, ref: ProviderRef, kind: CapabilityKind) -> Any:
        reg = self._providers.get(ref.type)
        if not reg:
            raise ValueError(
                f'Unknown provider type "{ref.type}". '
                "Register it with ProviderRegistry.register()."
            )
        return reg["factory"](ref.config or None, kind)

    def resolve(self, manifest: StackManifest) -> ResolvedStack:
        instances: dict[str, Any] = {}
        for kind in CAPABILITY_KINDS:
            ref = manifest.spec.providers.get(kind)
            if not ref:
                raise ValueError(f'Missing provider for capability "{kind}"')
            reg = self._providers.get(ref.type)
            if not reg:
                raise ValueError(
                    f'Provider "{ref.type}" for capability "{kind}" is not registered'
                )
            if kind not in reg["capabilities"]:
                raise ValueError(
                    f'Provider "{ref.type}" does not implement capability "{kind}"'
                )
            instances[kind] = self.create(ref, kind)

        return ResolvedStack(
            id=manifest.metadata.name,
            displayName=manifest.spec.displayName,
            cluster=instances["cluster"],
            gpu=instances["gpu"],
            observability=instances["observability"],
            cost=instances["cost"],
            policy=instances["policy"],
            runtime=instances["runtime"],
            remediation=instances["remediation"],
        )


_registry: ProviderRegistry | None = None


def get_provider_registry() -> ProviderRegistry:
    global _registry
    if _registry is None:
        _registry = ProviderRegistry()
    return _registry


def reset_provider_registry() -> None:
    global _registry
    _registry = None
