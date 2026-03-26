import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DangerZone from "@/features/admin/components/DangerZone";
import { kickOutUser } from "@/features/admin/actions";
import { adminResetTwoFactor } from "@/features/twoFactor/actions";

// Mock server actions — component tests verify UI behavior, not server logic.
jest.mock("@/features/admin/actions", () => ({
  kickOutUser: jest.fn(),
}));

jest.mock("@/features/twoFactor/actions", () => ({
  adminResetTwoFactor: jest.fn(),
}));

// Mock next/navigation — useRouter used for redirect after kick out.
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock SnackbarProvider — tracks snackbar calls without real context.
const mockShowSnackbar = jest.fn();
jest.mock("@/components/shared/SnackbarProvider", () => ({
  useSnackbar: () => ({ showSnackbar: mockShowSnackbar }),
}));

const baseProps = {
  userId: "user-123",
  userName: "Alice",
  userEmail: "alice@example.com",
};

describe("DangerZone", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Rendering ─────────────────────────────────────────────

  // Renders the Danger Zone heading.
  test("renders Danger Zone heading", () => {
    render(<DangerZone {...baseProps} />);
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
  });

  // Renders the kick out description and button.
  test("renders kick out description and button", () => {
    render(<DangerZone {...baseProps} />);
    expect(screen.getByText(/Remove this user from the system/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kick Out/i })).toBeInTheDocument();
  });

  // Does NOT render the Reset 2FA section when twoFactorEnabled is false/undefined.
  test("hides Reset 2FA section when twoFactorEnabled is falsy", () => {
    render(<DangerZone {...baseProps} />);
    expect(screen.queryByText(/Reset 2FA/i)).not.toBeInTheDocument();
  });

  // Renders the Reset 2FA section when twoFactorEnabled is true.
  test("shows Reset 2FA section when twoFactorEnabled is true", () => {
    render(<DangerZone {...baseProps} twoFactorEnabled={true} />);
    expect(screen.getByRole("button", { name: /Reset 2FA/i })).toBeInTheDocument();
  });

  // Falls back to userEmail as display name when userName is null.
  test("falls back to userEmail when userName is null", () => {
    render(<DangerZone userId="user-123" userName={null} userEmail="alice@example.com" />);
    // Component still renders without error
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
  });

  // No permError shown initially.
  test("does not show error alert on initial render", () => {
    render(<DangerZone {...baseProps} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // ─── Kick Out Dialog ───────────────────────────────────────

  // Clicking the Kick Out button opens the confirm dialog.
  test("opens kick out confirm dialog when Kick Out is clicked", () => {
    render(<DangerZone {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Kick Out/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  // Cancelling the kick out dialog closes it without calling kickOutUser.
  test("cancelling kick out dialog closes it without calling kickOutUser", async () => {
    render(<DangerZone {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Kick Out/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(kickOutUser).not.toHaveBeenCalled();
  });

  // Confirming kick out calls kickOutUser with correct userId and redirects to /admin.
  test("confirming kick out calls kickOutUser and redirects to /admin", async () => {
    (kickOutUser as jest.Mock).mockResolvedValue(undefined);
    render(<DangerZone {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Kick Out/i }));
    // The confirm button inside the dialog — last Kick Out button found
    const kickOutButtons = screen.getAllByRole("button", { name: /Kick Out/i });
    const confirmBtn = kickOutButtons[kickOutButtons.length - 1];
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(kickOutUser).toHaveBeenCalled();
    });
    // Verify FormData contained userId
    const fd: FormData = (kickOutUser as jest.Mock).mock.calls[0][0];
    expect(fd.get("userId")).toBe("user-123");
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin");
    });
  });

  // Confirming kick out shows snackbar with the user's display name.
  test("shows snackbar after successful kick out", async () => {
    (kickOutUser as jest.Mock).mockResolvedValue(undefined);
    render(<DangerZone {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Kick Out/i }));
    const kickOutButtons = screen.getAllByRole("button", { name: /Kick Out/i });
    fireEvent.click(kickOutButtons[kickOutButtons.length - 1]);
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalled();
    });
  });

  // When kickOutUser returns an error, shows the error and does NOT redirect.
  test("shows error message when kickOutUser returns an error", async () => {
    (kickOutUser as jest.Mock).mockResolvedValue({ error: "Not authorized to kick out" });
    render(<DangerZone {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Kick Out/i }));
    const kickOutButtons = screen.getAllByRole("button", { name: /Kick Out/i });
    fireEvent.click(kickOutButtons[kickOutButtons.length - 1]);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Not authorized to kick out")).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  // After kick out error, the dialog is closed.
  test("closes kick out dialog after error", async () => {
    (kickOutUser as jest.Mock).mockResolvedValue({ error: "Not authorized" });
    render(<DangerZone {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Kick Out/i }));
    const kickOutButtons = screen.getAllByRole("button", { name: /Kick Out/i });
    fireEvent.click(kickOutButtons[kickOutButtons.length - 1]);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // After kick out error, no snackbar is shown.
  test("does not show snackbar after kick out error", async () => {
    (kickOutUser as jest.Mock).mockResolvedValue({ error: "Not authorized" });
    render(<DangerZone {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Kick Out/i }));
    const kickOutButtons = screen.getAllByRole("button", { name: /Kick Out/i });
    fireEvent.click(kickOutButtons[kickOutButtons.length - 1]);
    await waitFor(() => {
      expect(screen.getByText("Not authorized")).toBeInTheDocument();
    });
    expect(mockShowSnackbar).not.toHaveBeenCalled();
  });

  // ─── Reset 2FA Dialog ──────────────────────────────────────

  // Clicking the Reset 2FA button opens the confirm dialog.
  test("opens Reset 2FA confirm dialog when Reset 2FA is clicked", () => {
    render(<DangerZone {...baseProps} twoFactorEnabled={true} />);
    fireEvent.click(screen.getByRole("button", { name: /Reset 2FA/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  // Cancelling the Reset 2FA dialog closes it without calling adminResetTwoFactor.
  test("cancelling Reset 2FA dialog closes it without calling adminResetTwoFactor", async () => {
    render(<DangerZone {...baseProps} twoFactorEnabled={true} />);
    fireEvent.click(screen.getByRole("button", { name: /Reset 2FA/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(adminResetTwoFactor).not.toHaveBeenCalled();
  });

  // Confirming Reset 2FA calls adminResetTwoFactor with correct userId.
  test("confirming Reset 2FA calls adminResetTwoFactor with userId", async () => {
    (adminResetTwoFactor as jest.Mock).mockResolvedValue(undefined);
    render(<DangerZone {...baseProps} twoFactorEnabled={true} />);
    fireEvent.click(screen.getByRole("button", { name: /Reset 2FA/i }));
    const reset2FAButtons = screen.getAllByRole("button", { name: /Reset 2FA/i });
    const confirmBtn = reset2FAButtons[reset2FAButtons.length - 1];
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(adminResetTwoFactor).toHaveBeenCalled();
    });
    const fd: FormData = (adminResetTwoFactor as jest.Mock).mock.calls[0][0];
    expect(fd.get("userId")).toBe("user-123");
  });

  // Successful Reset 2FA shows snackbar and closes the dialog.
  test("shows snackbar and closes dialog after successful 2FA reset", async () => {
    (adminResetTwoFactor as jest.Mock).mockResolvedValue(undefined);
    render(<DangerZone {...baseProps} twoFactorEnabled={true} />);
    fireEvent.click(screen.getByRole("button", { name: /Reset 2FA/i }));
    const reset2FAButtons = screen.getAllByRole("button", { name: /Reset 2FA/i });
    fireEvent.click(reset2FAButtons[reset2FAButtons.length - 1]);
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // When adminResetTwoFactor returns an error, shows the error message.
  test("shows error message when adminResetTwoFactor returns an error", async () => {
    (adminResetTwoFactor as jest.Mock).mockResolvedValue({ error: "Reset failed" });
    render(<DangerZone {...baseProps} twoFactorEnabled={true} />);
    fireEvent.click(screen.getByRole("button", { name: /Reset 2FA/i }));
    const reset2FAButtons = screen.getAllByRole("button", { name: /Reset 2FA/i });
    fireEvent.click(reset2FAButtons[reset2FAButtons.length - 1]);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Reset failed")).toBeInTheDocument();
    });
    expect(mockShowSnackbar).not.toHaveBeenCalled();
  });

  // After 2FA reset error, the dialog is closed.
  test("closes Reset 2FA dialog after error", async () => {
    (adminResetTwoFactor as jest.Mock).mockResolvedValue({ error: "Reset failed" });
    render(<DangerZone {...baseProps} twoFactorEnabled={true} />);
    fireEvent.click(screen.getByRole("button", { name: /Reset 2FA/i }));
    const reset2FAButtons = screen.getAllByRole("button", { name: /Reset 2FA/i });
    fireEvent.click(reset2FAButtons[reset2FAButtons.length - 1]);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // Error state does not redirect after 2FA reset failure.
  test("does not redirect after 2FA reset failure", async () => {
    (adminResetTwoFactor as jest.Mock).mockResolvedValue({ error: "Reset failed" });
    render(<DangerZone {...baseProps} twoFactorEnabled={true} />);
    fireEvent.click(screen.getByRole("button", { name: /Reset 2FA/i }));
    const reset2FAButtons = screen.getAllByRole("button", { name: /Reset 2FA/i });
    fireEvent.click(reset2FAButtons[reset2FAButtons.length - 1]);
    await waitFor(() => {
      expect(screen.getByText("Reset failed")).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ─── Error State Accessibility ─────────────────────────────

  // Error message is displayed via role="alert" for accessibility.
  test("error message uses role=alert for accessibility", async () => {
    (kickOutUser as jest.Mock).mockResolvedValue({ error: "Permission denied" });
    render(<DangerZone {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Kick Out/i }));
    const kickOutButtons = screen.getAllByRole("button", { name: /Kick Out/i });
    fireEvent.click(kickOutButtons[kickOutButtons.length - 1]);
    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Permission denied");
    });
  });
});
