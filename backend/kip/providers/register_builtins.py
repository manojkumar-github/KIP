from __future__ import annotations

from typing import Any

from kip.core.registry import ProviderRegistry, get_provider_registry
from kip.providers.demo import DEMO_CAPABILITIES, create_demo_capability
from kip.providers.kubernetes import create_kubernetes_cluster
from kip.types import CapabilityKind


def register_builtin_providers(
    registry: ProviderRegistry | None = None,
) -> ProviderRegistry:
    registry = registry or get_provider_registry()

    if not registry.has("demo"):

        def demo_factory(config: dict[str, Any] | None, kind: CapabilityKind):
            return create_demo_capability(kind)

        registry.register("demo", DEMO_CAPABILITIES, demo_factory)

    if not registry.has("kubernetes"):

        def k8s_factory(config: dict[str, Any] | None, kind: CapabilityKind):
            if kind != "cluster":
                raise ValueError("kubernetes provider only implements cluster")
            return create_kubernetes_cluster(config)

        registry.register("kubernetes", ["cluster"], k8s_factory)

    return registry
