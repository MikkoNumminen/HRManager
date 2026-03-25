/**
 * Stories for DashboardKPICards — covers typical values,
 * zero state, large numbers, and single-card extremes.
 */
import type { Meta, StoryObj } from "@storybook/react";
import DashboardKPICards from "@/components/DashboardKPICards";

const meta: Meta<typeof DashboardKPICards> = {
  title: "Components/DashboardKPICards",
  component: DashboardKPICards,
  tags: ["autodocs"],
  argTypes: {
    totalPersons: { control: "number" },
    totalTeams: { control: "number" },
    totalDepartments: { control: "number" },
    totalUsers: { control: "number" },
  },
};

export default meta;
type Story = StoryObj<typeof DashboardKPICards>;

/** Typical populated dashboard */
export const Default: Story = {
  args: {
    totalPersons: 124,
    totalTeams: 18,
    totalDepartments: 6,
    totalUsers: 42,
  },
};

/** Brand-new installation — all zeros */
export const Empty: Story = {
  args: {
    totalPersons: 0,
    totalTeams: 0,
    totalDepartments: 0,
    totalUsers: 0,
  },
};

/** Single employee org */
export const Minimal: Story = {
  args: {
    totalPersons: 1,
    totalTeams: 1,
    totalDepartments: 1,
    totalUsers: 1,
  },
};

/** Large enterprise — tests number layout at scale */
export const LargeOrg: Story = {
  args: {
    totalPersons: 12_480,
    totalTeams: 347,
    totalDepartments: 52,
    totalUsers: 8_900,
  },
};

/** Maximum plausible values — stress-tests typography */
export const ExtremeValues: Story = {
  args: {
    totalPersons: 999_999,
    totalTeams: 99_999,
    totalDepartments: 9_999,
    totalUsers: 99_999,
  },
};
