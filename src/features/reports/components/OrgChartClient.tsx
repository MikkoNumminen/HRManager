"use client";

import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Box } from "@mui/material";
import { colors, pageContainerStyles } from "@/muiStyles";
import type { OrgChartData } from "@/schemas";
import { useTranslations } from "next-intl";
import { buildNodesAndEdges } from "./orgChartUtils";
import OrgChartToolbar from "./OrgChartToolbar";

export default function OrgChartClient({ data }: { data: OrgChartData }) {
  const t = useTranslations("orgChart");

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildNodesAndEdges(data, t),
    [data, t],
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const totalDepts = data.departments.length;
  const totalTeams =
    data.departments.reduce((sum, d) => sum + d.teams.length, 0) + data.unassignedTeams.length;
  const totalPersons =
    data.departments.reduce(
      (sum, d) => sum + d.teams.reduce((s, t) => s + t.members.length, 0),
      0,
    ) +
    data.unassignedTeams.reduce((sum, t) => sum + t.members.length, 0) +
    data.unassignedPersons.length;

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  const onInit = useCallback((instance: { fitView: () => void }) => {
    setTimeout(() => instance.fitView(), 100);
  }, []);

  return (
    <Box sx={{ ...pageContainerStyles, p: 0, overflow: "hidden" }}>
      <OrgChartToolbar
        heading={t("heading")}
        totalDepts={totalDepts}
        totalTeams={totalTeams}
        totalPersons={totalPersons}
        departmentsLabel={t("departments")}
        teamsLabel={t("teams")}
        personsLabel={t("persons")}
      />
      <Box sx={{ height: "calc(100vh - 160px)", width: "100%" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={onInit}
          proOptions={proOptions}
          fitView
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{ type: "smoothstep" }}
        >
          <Background color={colors.slate600} gap={20} />
          <Controls
            style={{
              backgroundColor: colors.slate700,
              borderColor: colors.slate300,
              borderRadius: 4,
            }}
          />
          <MiniMap
            style={{
              backgroundColor: colors.slate700,
              borderColor: colors.slate300,
              borderRadius: 4,
            }}
            nodeColor={colors.slate400}
            maskColor="rgba(0,0,0,0.4)"
          />
        </ReactFlow>
      </Box>
    </Box>
  );
}
