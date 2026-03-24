"use client";

import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { Box, Typography, Chip } from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonIcon from "@mui/icons-material/Person";
import CorporateFareIcon from "@mui/icons-material/CorporateFare";
import { colors, pageContainerStyles } from "@/muiStyles";
import type { OrgChartData } from "@/schemas";
import { useTranslations } from "next-intl";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;

const nodeColors = {
  org: colors.green400,
  department: "#6366f1",
  team: "#0ea5e9",
  person: colors.slate400,
};

function layoutGraph(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 80, nodesep: 40 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
    };
  });
}

function OrgNodeContent({
  icon,
  label,
  subtitle,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string | null;
  color: string;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 1,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        backgroundColor: colors.slate700,
        border: `2px solid ${color}`,
        borderRadius: "8px",
        overflow: "hidden",
        cursor: "grab",
      }}
    >
      <Box sx={{ color, flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ overflow: "hidden", minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: colors.slate100,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            sx={{
              color: colors.slate400,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "block",
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function buildNodesAndEdges(data: OrgChartData, t: (key: string) => string) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const orgId = "org-root";
  nodes.push({
    id: orgId,
    type: "default",
    position: { x: 0, y: 0 },
    data: {
      label: (
        <OrgNodeContent
          icon={<CorporateFareIcon />}
          label={t("organization")}
          color={nodeColors.org}
        />
      ),
    },
    style: { padding: 0, border: "none", background: "transparent" },
  });

  for (const dept of data.departments) {
    const deptId = `dept-${dept.id}`;
    nodes.push({
      id: deptId,
      type: "default",
      position: { x: 0, y: 0 },
      data: {
        label: (
          <OrgNodeContent
            icon={<BusinessIcon />}
            label={dept.name}
            subtitle={dept.headName ? `${t("head")}: ${dept.headName}` : null}
            color={nodeColors.department}
          />
        ),
      },
      style: { padding: 0, border: "none", background: "transparent" },
    });
    edges.push({
      id: `e-org-${deptId}`,
      source: orgId,
      target: deptId,
      style: { stroke: nodeColors.department, strokeWidth: 2 },
    });

    for (const team of dept.teams) {
      const teamId = `team-${team.teamId}`;
      nodes.push({
        id: teamId,
        type: "default",
        position: { x: 0, y: 0 },
        data: {
          label: (
            <OrgNodeContent
              icon={<GroupsIcon />}
              label={team.teamName}
              subtitle={team.managerName ? `${t("manager")}: ${team.managerName}` : null}
              color={nodeColors.team}
            />
          ),
        },
        style: { padding: 0, border: "none", background: "transparent" },
      });
      edges.push({
        id: `e-${deptId}-${teamId}`,
        source: deptId,
        target: teamId,
        style: { stroke: nodeColors.team, strokeWidth: 1.5 },
      });

      for (const member of team.members) {
        const memberId = `person-${team.teamId}-${member.id}`;
        nodes.push({
          id: memberId,
          type: "default",
          position: { x: 0, y: 0 },
          data: {
            label: (
              <OrgNodeContent
                icon={<PersonIcon />}
                label={member.name}
                subtitle={member.position}
                color={nodeColors.person}
              />
            ),
          },
          style: { padding: 0, border: "none", background: "transparent" },
        });
        edges.push({
          id: `e-${teamId}-${memberId}`,
          source: teamId,
          target: memberId,
          style: { stroke: nodeColors.person, strokeWidth: 1 },
        });
      }
    }
  }

  for (const team of data.unassignedTeams) {
    const teamId = `team-unassigned-${team.teamId}`;
    nodes.push({
      id: teamId,
      type: "default",
      position: { x: 0, y: 0 },
      data: {
        label: (
          <OrgNodeContent
            icon={<GroupsIcon />}
            label={team.teamName}
            subtitle={team.managerName ? `${t("manager")}: ${team.managerName}` : null}
            color={nodeColors.team}
          />
        ),
      },
      style: { padding: 0, border: "none", background: "transparent" },
    });
    edges.push({
      id: `e-org-${teamId}`,
      source: orgId,
      target: teamId,
      style: { stroke: nodeColors.team, strokeWidth: 1.5 },
    });

    for (const member of team.members) {
      const memberId = `person-unassigned-${team.teamId}-${member.id}`;
      nodes.push({
        id: memberId,
        type: "default",
        position: { x: 0, y: 0 },
        data: {
          label: (
            <OrgNodeContent
              icon={<PersonIcon />}
              label={member.name}
              subtitle={member.position}
              color={nodeColors.person}
            />
          ),
        },
        style: { padding: 0, border: "none", background: "transparent" },
      });
      edges.push({
        id: `e-${teamId}-${memberId}`,
        source: teamId,
        target: memberId,
        style: { stroke: nodeColors.person, strokeWidth: 1 },
      });
    }
  }

  for (const person of data.unassignedPersons) {
    const personId = `person-unassigned-${person.id}`;
    nodes.push({
      id: personId,
      type: "default",
      position: { x: 0, y: 0 },
      data: {
        label: (
          <OrgNodeContent
            icon={<PersonIcon />}
            label={person.name}
            subtitle={person.position}
            color={nodeColors.person}
          />
        ),
      },
      style: { padding: 0, border: "none", background: "transparent" },
    });
    edges.push({
      id: `e-org-${personId}`,
      source: orgId,
      target: personId,
      style: { stroke: nodeColors.person, strokeWidth: 1 },
    });
  }

  const layoutNodes = layoutGraph(nodes, edges);
  return { nodes: layoutNodes, edges };
}

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
      <Box
        sx={{
          display: "flex",
          gap: 1,
          px: 2,
          py: 1,
          borderBottom: `1px solid ${colors.slate300}`,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" sx={{ mr: 1 }}>
          {t("heading")}
        </Typography>
        <Chip
          icon={<BusinessIcon sx={{ fontSize: 16 }} />}
          label={`${totalDepts} ${t("departments")}`}
          size="small"
          sx={{ borderColor: nodeColors.department, color: nodeColors.department }}
          variant="outlined"
        />
        <Chip
          icon={<GroupsIcon sx={{ fontSize: 16 }} />}
          label={`${totalTeams} ${t("teams")}`}
          size="small"
          sx={{ borderColor: nodeColors.team, color: nodeColors.team }}
          variant="outlined"
        />
        <Chip
          icon={<PersonIcon sx={{ fontSize: 16 }} />}
          label={`${totalPersons} ${t("persons")}`}
          size="small"
          sx={{ borderColor: nodeColors.person, color: nodeColors.person }}
          variant="outlined"
        />
      </Box>
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
