/**
 * Stories for ActiveSessions — covers single current session,
 * multiple sessions (including other devices), and empty state.
 *
 * The signOutOtherSessions server action is not called in these static stories;
 * the "Sign out other sessions" button appears only when other sessions exist.
 */
import type { Meta, StoryObj } from "@storybook/react";
import ActiveSessions from "@/features/sessions/components/ActiveSessions";
import type { UserSession } from "@/schemas";

const meta: Meta<typeof ActiveSessions> = {
  title: "Components/ActiveSessions",
  component: ActiveSessions,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ActiveSessions>;

const SESSION_ID = "sess-curr-0000-0000-0000-000000000001";

const SESSIONS: UserSession[] = [
  {
    id: SESSION_ID,
    userId: "user-0001-0000-0000-0000-000000000001",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    ipAddress: "192.168.1.10",
    active: true,
    lastActiveAt: new Date("2026-03-25T08:45:00Z"),
    createdAt: new Date("2026-03-24T10:00:00Z"),
  },
  {
    id: "sess-ffox-0000-0000-0000-000000000002",
    userId: "user-0001-0000-0000-0000-000000000001",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    ipAddress: "10.0.0.55",
    active: true,
    lastActiveAt: new Date("2026-03-24T18:30:00Z"),
    createdAt: new Date("2026-03-22T09:00:00Z"),
  },
  {
    id: "sess-mobi-0000-0000-0000-000000000003",
    userId: "user-0001-0000-0000-0000-000000000001",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    ipAddress: null,
    active: true,
    lastActiveAt: new Date("2026-03-23T14:00:00Z"),
    createdAt: new Date("2026-03-20T08:00:00Z"),
  },
];

/** Only the current session — no "sign out others" button shown */
export const CurrentSessionOnly: Story = {
  args: {
    sessions: [SESSIONS[0]],
    currentSessionId: SESSION_ID,
  },
};

/** Multiple sessions — current highlighted, others listed, sign-out button visible */
export const MultipleSessions: Story = {
  args: {
    sessions: SESSIONS,
    currentSessionId: SESSION_ID,
  },
};

/** No sessions at all — edge case for fresh accounts */
export const NoSessions: Story = {
  args: {
    sessions: [],
    currentSessionId: undefined,
  },
};

/** Sessions with unknown current session ID — none highlighted as current */
export const UnknownCurrentSession: Story = {
  args: {
    sessions: SESSIONS,
    currentSessionId: "sess-unkn-0000-0000-0000-000000000099",
  },
};

/** Session with null user-agent — falls back to "Unknown device" */
export const UnknownDevice: Story = {
  args: {
    sessions: [
      {
        id: SESSION_ID,
        userId: "user-0001-0000-0000-0000-000000000001",
        userAgent: null,
        ipAddress: null,
        active: true,
        lastActiveAt: new Date("2026-03-25T08:00:00Z"),
        createdAt: new Date("2026-03-25T08:00:00Z"),
      },
    ],
    currentSessionId: SESSION_ID,
  },
};
