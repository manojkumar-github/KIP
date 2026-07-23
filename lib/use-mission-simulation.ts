"use client";

import { useCallback, useRef, useState } from "react";
import type { MissionDefinition, MissionState } from "./types";
import {
  createInitialMissionState,
  runMissionSimulation,
} from "./mission-simulator";

export function useMissionSimulation() {
  const [missionState, setMissionState] = useState<MissionState | null>(null);
  const [activeMission, setActiveMission] = useState<MissionDefinition | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef(false);

  const startMission = useCallback(async (mission: MissionDefinition) => {
    abortRef.current = false;
    setActiveMission(mission);
    setIsRunning(true);

    const initial = createInitialMissionState(mission);
    setMissionState(initial);

    await runMissionSimulation(mission, (state) => {
      if (!abortRef.current) setMissionState({ ...state });
    }, initial);

    if (!abortRef.current) setIsRunning(false);
  }, []);

  const resetMission = useCallback(() => {
    abortRef.current = true;
    setMissionState(null);
    setActiveMission(null);
    setIsRunning(false);
  }, []);

  const approveAction = useCallback(() => {
    setMissionState((prev) =>
      prev ? { ...prev, status: "complete" } : prev
    );
  }, []);

  const rejectAction = useCallback(() => {
    setMissionState((prev) =>
      prev ? { ...prev, status: "complete" } : prev
    );
  }, []);

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
