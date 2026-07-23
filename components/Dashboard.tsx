"use client";

import { LeftNav, TopBar, LifecycleRibbon } from "@/components/layout/Shell";
import { WorkloadList } from "@/components/layout/WorkloadList";
import { MissionWorkspace } from "@/components/mission/MissionWorkspace";
import { AgentActivityPanel } from "@/components/agents/AgentActivityPanel";
import { useMissionSimulation } from "@/lib/use-mission-simulation";
import { CLUSTER, LIFECYCLE_STAGES, NAV_ITEMS, WORKLOADS } from "@/lib/mock-data";
import { useState } from "react";

export function Dashboard() {
  const [activeNav, setActiveNav] = useState("missions");
  const [selectedWorkload, setSelectedWorkload] = useState("1");
  const {
    missionState,
    activeMission,
    isRunning,
    startMission,
    approveAction,
    rejectAction,
  } = useMissionSimulation();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar
        cluster={CLUSTER.name}
        environment={CLUSTER.environment}
        alertCount={CLUSTER.alertCount}
      />

      <div className="flex min-h-0 flex-1">
        <LeftNav
          items={NAV_ITEMS}
          activeId={activeNav}
          onSelect={setActiveNav}
        />

        <WorkloadList
          workloads={WORKLOADS}
          selectedId={selectedWorkload}
          onSelect={setSelectedWorkload}
        />

        <MissionWorkspace
          missionState={missionState}
          activeMission={activeMission}
          isRunning={isRunning}
          onStartMission={startMission}
          onApprove={approveAction}
          onReject={rejectAction}
        />

        <AgentActivityPanel
          missionState={missionState}
          missionTitle={activeMission?.title}
        />
      </div>

      <LifecycleRibbon stages={LIFECYCLE_STAGES} activeStage="Runtime" />
    </div>
  );
}
