import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";
import BusinessIcon from "@mui/icons-material/Business";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonIcon from "@mui/icons-material/Person";
import CorporateFareIcon from "@mui/icons-material/CorporateFare";
import type { OrgChartData } from "@/schemas";
import OrgNodeContent from "./OrgNodeContent";
import { colors } from "@/muiStyles";

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 80;

export const nodeColors = {
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

const NODE_STYLE = { padding: 0, border: "none", background: "transparent" } as const;

export function buildNodesAndEdges(data: OrgChartData, t: (key: string) => string) {
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
    style: NODE_STYLE,
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
      style: NODE_STYLE,
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
        style: NODE_STYLE,
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
          style: NODE_STYLE,
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
      style: NODE_STYLE,
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
        style: NODE_STYLE,
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
      style: NODE_STYLE,
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
