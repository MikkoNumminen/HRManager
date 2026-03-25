/**
 * Stories for PersonTable — covers full table view, minimal chip view,
 * empty states, and linked profile variant.
 */
import type { Meta, StoryObj } from "@storybook/react";
import PersonTable from "@/components/PersonsTable";
import type { Person } from "@/schemas";

// next-intl requires a locale provider — provide stub translations via mock
const meta: Meta<typeof PersonTable> = {
  title: "Components/PersonTable",
  component: PersonTable,
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PersonTable>;

const SAMPLE_PERSONS: Person[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Alice Johnson",
    position: "Senior Engineer",
    email: "alice@example.com",
    createdAt: new Date("2024-01-15T09:00:00Z"),
    updatedAt: new Date("2025-03-01T12:00:00Z"),
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Bob Martinez",
    position: "Product Manager",
    email: "bob@example.com",
    createdAt: new Date("2024-02-20T09:00:00Z"),
    updatedAt: new Date("2025-02-15T12:00:00Z"),
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Carol Kim",
    position: "UX Designer",
    email: "carol@example.com",
    createdAt: new Date("2024-03-10T09:00:00Z"),
    updatedAt: new Date("2025-01-20T12:00:00Z"),
  },
];

/** Full desktop table with multiple persons */
export const Default: Story = {
  args: {
    persons: SAMPLE_PERSONS,
    minimal: false,
    linkToProfile: false,
  },
};

/** Empty table — shows "no persons" message */
export const Empty: Story = {
  args: {
    persons: [],
    minimal: false,
    linkToProfile: false,
  },
};

/** Minimal chip view — used inside team/department cards */
export const Minimal: Story = {
  args: {
    persons: SAMPLE_PERSONS,
    minimal: true,
    linkToProfile: false,
  },
};

/** Minimal chip view with no persons */
export const MinimalEmpty: Story = {
  args: {
    persons: [],
    minimal: true,
    linkToProfile: false,
  },
};

/** Full table with clickable profile links */
export const WithProfileLinks: Story = {
  args: {
    persons: SAMPLE_PERSONS,
    minimal: false,
    linkToProfile: true,
  },
};

/** Minimal chips with clickable profile links */
export const MinimalWithLinks: Story = {
  args: {
    persons: SAMPLE_PERSONS,
    minimal: true,
    linkToProfile: true,
  },
};

/** Single person — edge case for layout */
export const SinglePerson: Story = {
  args: {
    persons: [SAMPLE_PERSONS[0]],
    minimal: false,
    linkToProfile: false,
  },
};

/** Person with missing optional fields (no email, no position) */
export const PartialData: Story = {
  args: {
    persons: [
      {
        id: "44444444-4444-4444-4444-444444444444",
        name: "Dan Brown",
        position: null,
        email: null,
        createdAt: new Date("2024-05-01T09:00:00Z"),
        updatedAt: new Date("2025-03-25T12:00:00Z"),
      },
    ],
    minimal: false,
    linkToProfile: false,
  },
};
