from __future__ import annotations

import asyncio
import json
import random
import time
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from kip.core.orchestrator import create_initial_mission_state, get_orchestrator
from kip.core.registry import get_provider_registry
from kip.core.run_store import get_run_store
from kip.missions import (
    MISSION_CATALOG,
    get_mission_definition,
    resolve_mission_from_prompt,
)
from kip.providers.register_builtins import register_builtin_providers
from kip.stack.loader import get_stack_manifest, load_all_stack_manifests

app = FastAPI(title="KIP Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    register_builtin_providers()


class StartMissionBody(BaseModel):
    missionId: str | None = None
    prompt: str | None = None
    stackId: str = "demo-prod-gpu-west-2"


def _resolve_stack(stack_id: str):
    manifest = get_stack_manifest(stack_id)
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Unknown stack: {stack_id}")
    return get_provider_registry().resolve(manifest)


@app.get("/api/stacks")
def list_stacks() -> dict[str, Any]:
    stacks = [
        {
            "id": s.metadata.name,
            "displayName": s.spec.displayName,
            "providers": {k: v.type for k, v in s.spec.providers.items()},
        }
        for s in load_all_stack_manifests()
    ]
    return {"stacks": stacks}


@app.get("/api/missions")
def list_missions() -> dict[str, Any]:
    return {"missions": [m.model_dump() for m in MISSION_CATALOG]}


@app.post("/api/missions", status_code=201)
async def start_mission(body: StartMissionBody) -> dict[str, str]:
    if body.missionId:
        mission = get_mission_definition(body.missionId)
    elif body.prompt:
        mission = resolve_mission_from_prompt(body.prompt)
    else:
        raise HTTPException(status_code=400, detail="missionId or prompt is required")

    if not mission:
        raise HTTPException(status_code=404, detail="Unknown mission")

    stack = _resolve_stack(body.stackId)
    run_id = f"run-{int(time.time() * 1000)}-{random.randbytes(3).hex()}"
    initial = create_initial_mission_state(mission)
    get_run_store().create(
        run_id=run_id,
        stack_id=body.stackId,
        mission_id=mission.id,
        state=initial,
    )

    asyncio.create_task(
        get_orchestrator().start(run_id=run_id, mission=mission, stack=stack)
    )
    return {"runId": run_id, "missionId": mission.id, "stackId": body.stackId}


@app.get("/api/missions/{run_id}/stream")
async def stream_mission(run_id: str) -> StreamingResponse:
    store = get_run_store()
    if not store.get(run_id):
        raise HTTPException(status_code=404, detail=f"Unknown run: {run_id}")

    queue: asyncio.Queue[str | None] = asyncio.Queue()

    def on_state(state) -> None:
        payload = json.dumps({"type": "state", "state": state.model_dump()})
        queue.put_nowait(payload)

    unsubscribe = store.subscribe(run_id, on_state)

    async def event_generator():
        try:
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=15.0)
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
                    continue

                if item is None:
                    break
                yield f"data: {item}\n\n"

                data = json.loads(item)
                status = data.get("state", {}).get("status")
                if status == "complete":
                    await asyncio.sleep(0.05)
                    break
        finally:
            unsubscribe()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/missions/{run_id}/approve")
async def approve_mission(run_id: str) -> dict[str, Any]:
    run = get_run_store().get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Unknown run: {run_id}")
    stack = _resolve_stack(run.stack_id)
    state = await get_orchestrator().approve(run_id, stack)
    return {"state": state.model_dump()}


@app.post("/api/missions/{run_id}/reject")
async def reject_mission(run_id: str) -> dict[str, Any]:
    run = get_run_store().get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Unknown run: {run_id}")
    stack = _resolve_stack(run.stack_id)
    state = await get_orchestrator().reject(run_id, stack)
    return {"state": state.model_dump()}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
