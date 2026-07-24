"use client";

import { useCallback, useRef, useState } from "react";
import type { MissionDefinition, MissionState } from "./types";
import {
  createInitialMissionState,
  runMissionSimulation,
} from "./mission-simulator";

const DEFAULT_STACK_ID = "demo-prod-gpu-west-2";
/** Absolute API base (e.g. http://127.0.0.1:8000). Empty = same-origin / Next rewrites. */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const useLocalSim = process.env.NEXT_PUBLIC_USE_LOCAL_SIM === "true";

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export function useMissionSimulation() {
  const [missionState, setMissionState] = useState<MissionState | null>(null);
  const [activeMission, setActiveMission] = useState<MissionDefinition | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef(false);
  const runIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const cleanupStream = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, []);

  const startMissionLocal = useCallback(
    async (mission: MissionDefinition) => {
      abortRef.current = false;
      setActiveMission(mission);
      setIsRunning(true);

      const initial = createInitialMissionState(mission);
      setMissionState(initial);

      await runMissionSimulation(
        mission,
        (state) => {
          if (!abortRef.current) setMissionState({ ...state });
        },
        initial
      );

      if (!abortRef.current) setIsRunning(false);
    },
    []
  );

  const startMissionRemote = useCallback(
    async (mission: MissionDefinition) => {
      abortRef.current = false;
      cleanupStream();
      setActiveMission(mission);
      setIsRunning(true);
      setMissionState(null);

      try {
        const res = await fetch(apiUrl("/api/missions"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            missionId: mission.id,
            stackId: DEFAULT_STACK_ID,
          }),
        });

        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { detail?: string; error?: string };
          throw new Error(err.detail ?? err.error ?? "Failed to start mission");
        }

        const { runId } = (await res.json()) as { runId: string };
        if (abortRef.current) return;
        runIdRef.current = runId;

        const es = new EventSource(apiUrl(`/api/missions/${runId}/stream`));
        eventSourceRef.current = es;

        es.onmessage = (event) => {
          if (abortRef.current) return;
          try {
            const payload = JSON.parse(event.data) as {
              type: string;
              state: MissionState;
            };
            if (payload.type !== "state" || !payload.state) return;
            setMissionState(payload.state);
            if (
              payload.state.status === "awaiting-approval" ||
              payload.state.status === "complete"
            ) {
              setIsRunning(false);
            }
            if (payload.state.status === "complete") {
              cleanupStream();
            }
          } catch {
            /* ignore malformed frames */
          }
        };

        es.onerror = () => {
          setIsRunning(false);
          cleanupStream();
        };
      } catch (err) {
        console.error(err);
        setIsRunning(false);
        setMissionState(null);
      }
    },
    [cleanupStream]
  );

  const startMission = useCallback(
    async (mission: MissionDefinition) => {
      if (useLocalSim) {
        await startMissionLocal(mission);
      } else {
        await startMissionRemote(mission);
      }
    },
    [startMissionLocal, startMissionRemote]
  );

  const resetMission = useCallback(() => {
    abortRef.current = true;
    cleanupStream();
    runIdRef.current = null;
    setMissionState(null);
    setActiveMission(null);
    setIsRunning(false);
  }, [cleanupStream]);

  const approveAction = useCallback(async () => {
    if (useLocalSim) {
      setMissionState((prev) =>
        prev ? { ...prev, status: "complete" } : prev
      );
      return;
    }

    const runId = runIdRef.current;
    if (!runId) return;
    const res = await fetch(apiUrl(`/api/missions/${runId}/approve`), {
      method: "POST",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { state: MissionState };
    setMissionState(data.state);
    setIsRunning(false);
    cleanupStream();
  }, [cleanupStream]);

  const rejectAction = useCallback(async () => {
    if (useLocalSim) {
      setMissionState((prev) =>
        prev ? { ...prev, status: "complete" } : prev
      );
      return;
    }

    const runId = runIdRef.current;
    if (!runId) return;
    const res = await fetch(apiUrl(`/api/missions/${runId}/reject`), {
      method: "POST",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { state: MissionState };
    setMissionState(data.state);
    setIsRunning(false);
    cleanupStream();
  }, [cleanupStream]);

  return {
    missionState,
    activeMission,
    isRunning,
    startMission,
    resetMission,
    approveAction,
    rejectAction,
  };
}
