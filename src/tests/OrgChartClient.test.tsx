import { render, screen } from "@testing-library/react";
import OrgChartClient from "@/components/OrgChartClient";
import type { OrgChartData } from "@/schemas";

// ---------------------------------------------------------------------------
// Mock @xyflow/react — ReactFlow needs DOM measurement APIs unavailable in jsdom.
// The mock exposes node/edge counts via data attributes for assertion.
// ---------------------------------------------------------------------------
jest.mock("@xyflow/react", () => ({
  ReactFlow: ({
    nodes,
    edges,
    children,
  }: {
    nodes: unknown[];
    edges: unknown[];
    children: React.ReactNode;
  }) => (
    <div data-testid="reactflow" data-nodes={nodes.length} data-edges={edges.length}>
      {children}
    </div>
  ),
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
  useNodesState: (initial: unknown[]) => [initial, jest.fn(), jest.fn()],
  useEdgesState: (initial: unknown[]) => [initial, jest.fn(), jest.fn()],
}));

// ---------------------------------------------------------------------------
// Mock dagre — graph layout engine that requires a real graph implementation.
// ---------------------------------------------------------------------------
jest.mock("dagre", () => {
  const nodes: Record<string, { x: number; y: number; width?: number; height?: number }> = {};
  let counter = 0;
  return {
    graphlib: {
      Graph: jest.fn().mockImplementation(() => ({
        setDefaultEdgeLabel: jest.fn(),
        setGraph: jest.fn(),
        setNode: (id: string, dims: { width?: number; height?: number }) => {
          nodes[id] = { x: counter * 250, y: counter * 100, ...dims };
          counter++;
        },
        setEdge: jest.fn(),
        node: (id: string) => nodes[id] || { x: 0, y: 0 },
      })),
    },
    layout: jest.fn(),
  };
});

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Empty organization — no departments, teams, or persons */
const emptyData: OrgChartData = {
  departments: [],
  unassignedTeams: [],
  unassignedPersons: [],
};

/** Single department with one team and two members */
const singleDeptData: OrgChartData = {
  departments: [
    {
      id: "d1d1d1d1-0000-4000-8000-000000000001",
      name: "Engineering",
      headId: "h1h1h1h1-0000-4000-8000-000000000001",
      headName: "Ada Lovelace",
      teams: [
        {
          teamId: "t1t1t1t1-0000-4000-8000-000000000001",
          teamName: "Frontend",
          managerId: "m1m1m1m1-0000-4000-8000-000000000001",
          managerName: "Grace Hopper",
          members: [
            {
              id: "p1p1p1p1-0000-4000-8000-000000000001",
              name: "Alice Johnson",
              position: "Senior Developer",
              email: "alice@example.com",
            },
            {
              id: "p2p2p2p2-0000-4000-8000-000000000002",
              name: "Bob Smith",
              position: "Junior Developer",
              email: "bob@example.com",
            },
          ],
        },
      ],
    },
  ],
  unassignedTeams: [],
  unassignedPersons: [],
};

/** Multiple departments with multiple teams */
const multiDeptData: OrgChartData = {
  departments: [
    {
      id: "d1d1d1d1-0000-4000-8000-000000000001",
      name: "Engineering",
      headId: null,
      headName: null,
      teams: [
        {
          teamId: "t1t1t1t1-0000-4000-8000-000000000001",
          teamName: "Frontend",
          managerId: null,
          managerName: null,
          members: [
            {
              id: "p1p1p1p1-0000-4000-8000-000000000001",
              name: "Alice",
              position: "Developer",
              email: null,
            },
          ],
        },
        {
          teamId: "t2t2t2t2-0000-4000-8000-000000000002",
          teamName: "Backend",
          managerId: null,
          managerName: null,
          members: [
            {
              id: "p2p2p2p2-0000-4000-8000-000000000002",
              name: "Bob",
              position: "Developer",
              email: null,
            },
            {
              id: "p3p3p3p3-0000-4000-8000-000000000003",
              name: "Charlie",
              position: "Developer",
              email: null,
            },
          ],
        },
      ],
    },
    {
      id: "d2d2d2d2-0000-4000-8000-000000000002",
      name: "Marketing",
      headId: null,
      headName: null,
      teams: [
        {
          teamId: "t3t3t3t3-0000-4000-8000-000000000003",
          teamName: "Content",
          managerId: null,
          managerName: null,
          members: [
            {
              id: "p4p4p4p4-0000-4000-8000-000000000004",
              name: "Diana",
              position: "Writer",
              email: null,
            },
          ],
        },
      ],
    },
  ],
  unassignedTeams: [],
  unassignedPersons: [],
};

/** Data with unassigned teams (teams not belonging to any department) */
const unassignedTeamsData: OrgChartData = {
  departments: [
    {
      id: "d1d1d1d1-0000-4000-8000-000000000001",
      name: "Engineering",
      headId: null,
      headName: null,
      teams: [],
    },
  ],
  unassignedTeams: [
    {
      teamId: "t9t9t9t9-0000-4000-8000-000000000009",
      teamName: "Floating Team",
      managerId: null,
      managerName: null,
      members: [
        {
          id: "p9p9p9p9-0000-4000-8000-000000000009",
          name: "Eve",
          position: "Analyst",
          email: null,
        },
      ],
    },
  ],
  unassignedPersons: [],
};

/** Data with unassigned persons (persons not belonging to any team) */
const unassignedPersonsData: OrgChartData = {
  departments: [],
  unassignedTeams: [],
  unassignedPersons: [
    {
      id: "p8p8p8p8-0000-4000-8000-000000000008",
      name: "Frank Freelancer",
      position: "Contractor",
      email: "frank@example.com",
    },
    {
      id: "p7p7p7p7-0000-4000-8000-000000000007",
      name: "Gina Guest",
      position: null,
      email: null,
    },
  ],
};

/** Mixed scenario: departments, unassigned teams, and unassigned persons */
const fullMixedData: OrgChartData = {
  departments: [
    {
      id: "d1d1d1d1-0000-4000-8000-000000000001",
      name: "Engineering",
      headId: "h1h1h1h1-0000-4000-8000-000000000001",
      headName: "Ada Lovelace",
      teams: [
        {
          teamId: "t1t1t1t1-0000-4000-8000-000000000001",
          teamName: "Platform",
          managerId: null,
          managerName: null,
          members: [
            {
              id: "p1p1p1p1-0000-4000-8000-000000000001",
              name: "Alice",
              position: "Developer",
              email: null,
            },
            {
              id: "p2p2p2p2-0000-4000-8000-000000000002",
              name: "Bob",
              position: "Developer",
              email: null,
            },
          ],
        },
      ],
    },
  ],
  unassignedTeams: [
    {
      teamId: "t5t5t5t5-0000-4000-8000-000000000005",
      teamName: "Unassigned Squad",
      managerId: null,
      managerName: null,
      members: [
        {
          id: "p5p5p5p5-0000-4000-8000-000000000005",
          name: "Eve",
          position: "QA",
          email: null,
        },
      ],
    },
  ],
  unassignedPersons: [
    {
      id: "p6p6p6p6-0000-4000-8000-000000000006",
      name: "Frank",
      position: "Intern",
      email: null,
    },
  ],
};

// ---------------------------------------------------------------------------
// OrgChartClient component tests
// ---------------------------------------------------------------------------
describe("OrgChartClient", () => {
  // Renders the "Organization Chart" heading from translations.
  test("renders the heading", () => {
    render(<OrgChartClient data={emptyData} />);
    expect(screen.getByText("Organization Chart")).toBeInTheDocument();
  });

  // Renders the department count chip showing the correct number.
  test("renders the department count chip", () => {
    render(<OrgChartClient data={singleDeptData} />);
    expect(screen.getByText("1 Departments")).toBeInTheDocument();
  });

  // Renders the team count chip showing the correct number.
  test("renders the team count chip", () => {
    render(<OrgChartClient data={singleDeptData} />);
    expect(screen.getByText("1 Teams")).toBeInTheDocument();
  });

  // Renders the person count chip showing the correct number.
  test("renders the person count chip", () => {
    render(<OrgChartClient data={singleDeptData} />);
    expect(screen.getByText("2 Persons")).toBeInTheDocument();
  });

  // Renders the ReactFlow component with Background, Controls, and MiniMap.
  test("renders ReactFlow with Background, Controls, and MiniMap", () => {
    render(<OrgChartClient data={singleDeptData} />);
    expect(screen.getByTestId("reactflow")).toBeInTheDocument();
    expect(screen.getByTestId("background")).toBeInTheDocument();
    expect(screen.getByTestId("controls")).toBeInTheDocument();
    expect(screen.getByTestId("minimap")).toBeInTheDocument();
  });

  // Empty data renders zero counts for departments, teams, and persons.
  test("empty data shows zero counts", () => {
    render(<OrgChartClient data={emptyData} />);
    expect(screen.getByText("0 Departments")).toBeInTheDocument();
    expect(screen.getByText("0 Teams")).toBeInTheDocument();
    expect(screen.getByText("0 Persons")).toBeInTheDocument();
  });

  // Verifies node count: 1 org root + 1 dept + 1 team + 2 persons = 5 nodes.
  test("correct node count for single department with one team and two persons", () => {
    render(<OrgChartClient data={singleDeptData} />);
    const flow = screen.getByTestId("reactflow");
    // org-root(1) + dept(1) + team(1) + persons(2) = 5
    expect(flow).toHaveAttribute("data-nodes", "5");
  });

  // Verifies edge count: org->dept(1) + dept->team(1) + team->person(2) = 4 edges.
  test("correct edge count for single department with one team and two persons", () => {
    render(<OrgChartClient data={singleDeptData} />);
    const flow = screen.getByTestId("reactflow");
    // org->dept(1) + dept->team(1) + team->person1(1) + team->person2(1) = 4
    expect(flow).toHaveAttribute("data-edges", "4");
  });

  // Unassigned teams are counted in the teams chip total.
  test("unassigned teams appear in team count chip", () => {
    render(<OrgChartClient data={unassignedTeamsData} />);
    // 0 dept teams + 1 unassigned team = 1
    expect(screen.getByText("1 Teams")).toBeInTheDocument();
  });

  // Unassigned persons are counted in the persons chip total.
  test("unassigned persons appear in person count chip", () => {
    render(<OrgChartClient data={unassignedPersonsData} />);
    // 2 unassigned persons
    expect(screen.getByText("2 Persons")).toBeInTheDocument();
  });

  // Multiple departments with multiple teams produce correct chip counts.
  test("multiple departments with multiple teams show correct counts", () => {
    render(<OrgChartClient data={multiDeptData} />);
    // 2 departments
    expect(screen.getByText("2 Departments")).toBeInTheDocument();
    // 3 teams (2 in Engineering + 1 in Marketing)
    expect(screen.getByText("3 Teams")).toBeInTheDocument();
    // 4 persons (1 Frontend + 2 Backend + 1 Content)
    expect(screen.getByText("4 Persons")).toBeInTheDocument();
  });

  // Multiple departments produce correct node count.
  test("correct node count for multiple departments", () => {
    render(<OrgChartClient data={multiDeptData} />);
    const flow = screen.getByTestId("reactflow");
    // org-root(1) + depts(2) + teams(3) + persons(4) = 10
    expect(flow).toHaveAttribute("data-nodes", "10");
  });

  // Multiple departments produce correct edge count.
  test("correct edge count for multiple departments", () => {
    render(<OrgChartClient data={multiDeptData} />);
    const flow = screen.getByTestId("reactflow");
    // org->dept(2) + dept->team(3) + team->person(4) = 9
    expect(flow).toHaveAttribute("data-edges", "9");
  });

  // Unassigned teams create nodes connected to org root.
  test("unassigned teams create nodes and edges connected to org root", () => {
    render(<OrgChartClient data={unassignedTeamsData} />);
    const flow = screen.getByTestId("reactflow");
    // org-root(1) + dept(1) + unassigned-team(1) + person-in-unassigned-team(1) = 4
    expect(flow).toHaveAttribute("data-nodes", "4");
    // org->dept(1) + org->unassigned-team(1) + unassigned-team->person(1) = 3
    expect(flow).toHaveAttribute("data-edges", "3");
  });

  // Unassigned persons create nodes connected directly to org root.
  test("unassigned persons create nodes and edges connected to org root", () => {
    render(<OrgChartClient data={unassignedPersonsData} />);
    const flow = screen.getByTestId("reactflow");
    // org-root(1) + unassigned-persons(2) = 3
    expect(flow).toHaveAttribute("data-nodes", "3");
    // org->person(2) = 2
    expect(flow).toHaveAttribute("data-edges", "2");
  });

  // Mixed data (departments + unassigned teams + unassigned persons) counts correctly.
  test("full mixed data shows correct chip counts", () => {
    render(<OrgChartClient data={fullMixedData} />);
    // 1 department
    expect(screen.getByText("1 Departments")).toBeInTheDocument();
    // 1 dept team + 1 unassigned team = 2
    expect(screen.getByText("2 Teams")).toBeInTheDocument();
    // 2 dept members + 1 unassigned team member + 1 unassigned person = 4
    expect(screen.getByText("4 Persons")).toBeInTheDocument();
  });

  // Mixed data produces correct node and edge counts.
  test("full mixed data produces correct node and edge counts", () => {
    render(<OrgChartClient data={fullMixedData} />);
    const flow = screen.getByTestId("reactflow");
    // org-root(1) + dept(1) + dept-team(1) + dept-team-members(2)
    //   + unassigned-team(1) + unassigned-team-member(1) + unassigned-person(1) = 8
    expect(flow).toHaveAttribute("data-nodes", "8");
    // org->dept(1) + dept->team(1) + team->person(2)
    //   + org->unassigned-team(1) + unassigned-team->member(1) + org->unassigned-person(1) = 7
    expect(flow).toHaveAttribute("data-edges", "7");
  });

  // Empty data still renders the org-root node and ReactFlow with 1 node.
  test("empty data renders org root node with zero edges", () => {
    render(<OrgChartClient data={emptyData} />);
    const flow = screen.getByTestId("reactflow");
    // Only org-root node
    expect(flow).toHaveAttribute("data-nodes", "1");
    expect(flow).toHaveAttribute("data-edges", "0");
  });
});
