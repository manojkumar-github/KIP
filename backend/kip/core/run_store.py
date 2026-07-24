from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field

from kip.capabilities import RemediationAction
from kip.types import MissionState

RunListener = Callable[[MissionState], None]


@dataclass
class MissionRun:
    run_id: str
    stack_id: str
    mission_id: str
    state: MissionState
    pending_action: RemediationAction | None = None
    listeners: set[RunListener] = field(default_factory=set)
    abort: bool = False


class RunStore:
    """In-memory run store for v1."""

    def __init__(self) -> None:
        self._runs: dict[str, MissionRun] = {}

    def create(
        self,
        *,
        run_id: str,
        stack_id: str,
        mission_id: str,
        state: MissionState,
    ) -> MissionRun:
        run = MissionRun(
            run_id=run_id,
            stack_id=stack_id,
            mission_id=mission_id,
            state=state,
        )
        self._runs[run_id] = run
        return run

    def get(self, run_id: str) -> MissionRun | None:
        return self._runs.get(run_id)

    def update_state(self, run_id: str, state: MissionState) -> None:
        run = self._runs.get(run_id)
        if not run:
            return
        run.state = state
        for listener in list(run.listeners):
            listener(state)

    def subscribe(self, run_id: str, listener: RunListener) -> Callable[[], None]:
        run = self._runs.get(run_id)
        if not run:
            return lambda: None
        run.listeners.add(listener)
        listener(run.state)

        def unsubscribe() -> None:
            run.listeners.discard(listener)

        return unsubscribe

    def set_pending_action(
        self, run_id: str, action: RemediationAction | None
    ) -> None:
        run = self._runs.get(run_id)
        if run:
            run.pending_action = action


_store: RunStore | None = None


def get_run_store() -> RunStore:
    global _store
    if _store is None:
        _store = RunStore()
    return _store
