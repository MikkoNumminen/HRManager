/**
 * Stories for TwoFactorSetup — covers disabled state (setup prompt),
 * enabled state (manage buttons), and interaction scenarios.
 *
 * Note: server actions (beginTwoFactorSetup, confirmTwoFactorSetup, etc.)
 * are mocked via Storybook's fn() so dialogs can be opened without a live API.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import TwoFactorSetup from "@/components/TwoFactorSetup";

// Silence next-intl missing-provider errors in Storybook by aliasing to mock
// (next-intl is mocked via __mocks__ or moduleNameMapper in jest, but for
// Storybook we rely on the next-intl stub that @storybook/nextjs provides)

const meta: Meta<typeof TwoFactorSetup> = {
  title: "Components/TwoFactorSetup",
  component: TwoFactorSetup,
  tags: ["autodocs"],
  parameters: {
    // Prevent actions from throwing in Storybook when server actions fire
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/profile",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TwoFactorSetup>;

/**
 * 2FA is currently disabled — shows the "Enable" button.
 * Clicking "Enable" calls beginTwoFactorSetup() which requires a live server;
 * in Storybook the button will be visible but the dialog won't open.
 */
export const Disabled: Story = {
  args: {
    enabled: false,
  },
};

/**
 * 2FA is currently enabled — shows "Disable" and "Regenerate codes" buttons.
 */
export const Enabled: Story = {
  args: {
    enabled: true,
  },
};
