/**
 * Stories for TeamsTable — covers full table, minimal chip view,
 * empty states, single team, and teams without a manager.
 */
import type { Meta, StoryObj } from "@storybook/react";
import TeamsTable from "@/components/TeamsTable";
import type { CombinedTeam } from "@/schemas";

const meta: Meta<typeof TeamsTable> = {
  title: "Components/TeamsTable",
  component: TeamsTable,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TeamsTable>;

const SAMPLE_TEAMS: CombinedTeam[] = [
  {
    teamId: "aaaa0001-0000-0000-0000-000000000001",
    teamName: "Platform Engineering",
    teamManagerId: "11111111-1111-1111-1111-111111111111",
    managerName: "Alice Johnson",
    departmentId: "dddd0001-0000-0000-0000-000000000001",
    departmentName: "Engineering",
    createdAt: new Date("2024-01-15T09:00:00Z"),
    updatedAt: new Date("2025-03-01T12:00:00Z"),
    members: [
      {
        personId: "11111111-1111-1111-1111-111111111111",
        name: "Alice Johnson",
        email: "alice@example.com",
      },
      {
        personId: "22222222-2222-2222-2222-222222222222",
        name: "Bob Martinez",
        email: "bob@example.com",
      },
    ],
  },
  {
    teamId: "aaaa0002-0000-0000-0000-000000000002",
    teamName: "Design Systems",
    teamManagerId: null,
    managerName: null,
    departmentId: "dddd0002-0000-0000-0000-000000000002",
    departmentName: "Product",
    createdAt: new Date("2024-03-01T09:00:00Z"),
    updatedAt: new Date("2025-02-10T12:00:00Z"),
    members: [
      {
        personId: "33333333-3333-3333-3333-333333333333",
        name: "Carol Kim",
        email: "carol@example.com",
      },
    ],
  },
];

/** Full table with multiple teams */
export const Default: Story = {
  args: {
    combinedTeams: SAMPLE_TEAMS,
    minimal: false,
  },
};

/** Empty table — "no teams" message */
export const Empty: Story = {
  args: {
    combinedTeams: [],
    minimal: false,
  },
};

/** Minimal chip view — compact team list inside department cards */
export const Minimal: Story = {
  args: {
    combinedTeams: SAMPLE_TEAMS,
    minimal: true,
  },
};

/** Minimal chip view with no teams */
export const MinimalEmpty: Story = {
  args: {
    combinedTeams: [],
    minimal: true,
  },
};

/** Team without a manager assigned */
export const NoManager: Story = {
  args: {
    combinedTeams: [SAMPLE_TEAMS[1]],
    minimal: false,
  },
};

/** Team with no members */
export const NoMembers: Story = {
  args: {
    combinedTeams: [
      {
        teamId: "aaaa0003-0000-0000-0000-000000000003",
        teamName: "New Team (Empty)",
        teamManagerId: null,
        managerName: null,
        departmentId: null,
        departmentName: null,
        createdAt: new Date("2025-03-20T09:00:00Z"),
        updatedAt: new Date("2025-03-20T09:00:00Z"),
        members: [],
      },
    ],
    minimal: false,
  },
};

/** Large team with many members */
export const LargeTeam: Story = {
  args: {
    combinedTeams: [
      {
        ...SAMPLE_TEAMS[0],
        teamName: "Large Team (10 members)",
        members: Array.from({ length: 10 }, (_, i) => ({
          personId: `person${i.toString().padStart(2, "0")}-0000-0000-0000-000000000000`,
          name: `Employee ${i + 1}`,
          email: `employee${i + 1}@example.com`,
        })),
      },
    ],
    minimal: false,
  },
};
