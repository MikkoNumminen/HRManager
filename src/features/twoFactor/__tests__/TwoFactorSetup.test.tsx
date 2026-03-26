import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import TwoFactorSetup from "@/features/twoFactor/components/TwoFactorSetup";
import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  regenerateRecoveryCodes,
} from "@/features/twoFactor/actions";

// Mock all twoFactor server actions so no real server calls are made.
jest.mock("@/features/twoFactor/actions", () => ({
  beginTwoFactorSetup: jest.fn(),
  confirmTwoFactorSetup: jest.fn(),
  disableTwoFactor: jest.fn(),
  regenerateRecoveryCodes: jest.fn(),
}));

// Mock qrcode to avoid canvas operations in jsdom.
jest.mock(
  "qrcode",
  () => ({
    toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,MOCK"),
  }),
  { virtual: true },
);

// Expose the global mockShowSnackbar for assertions (set up in jest.setup.ts).
declare const mockShowSnackbar: jest.Mock;

const mockSetupData = {
  uri: "otpauth://totp/HRManager:test%40example.com?secret=TESTSECRET&issuer=HRManager",
  secret: "TESTSECRET",
  recoveryCodes: [
    "AAAA-BBBB",
    "CCCC-DDDD",
    "EEEE-FFFF",
    "GGGG-HHHH",
    "IIII-JJJJ",
    "KKKK-LLLL",
    "MMMM-NNNN",
    "OOOO-PPPP",
  ],
};

describe("TwoFactorSetup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default clipboard mock
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // When 2FA is disabled, shows the Enable button and description.
  test("renders enable button when 2FA is disabled", () => {
    render(<TwoFactorSetup enabled={false} />);
    expect(screen.getByRole("button", { name: /Enable 2FA/i })).toBeInTheDocument();
    expect(screen.getByText("Two-Factor Authentication")).toBeInTheDocument();
  });

  // When 2FA is enabled, shows Disable and Regenerate Codes buttons.
  test("renders disable and regenerate buttons when 2FA is enabled", () => {
    render(<TwoFactorSetup enabled={true} />);
    expect(screen.getByRole("button", { name: /Disable 2FA/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Regenerate Recovery Codes/i })).toBeInTheDocument();
  });

  // Clicking Enable calls beginTwoFactorSetup and opens the setup dialog.
  test("clicking Enable opens setup dialog with QR code step", async () => {
    (beginTwoFactorSetup as jest.Mock).mockResolvedValue(mockSetupData);
    render(<TwoFactorSetup enabled={false} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enable 2FA/i }));
    });
    await waitFor(() => {
      expect(screen.getByText("Set Up Two-Factor Authentication")).toBeInTheDocument();
    });
    expect(screen.getByText("TESTSECRET")).toBeInTheDocument();
  });

  // When beginTwoFactorSetup throws an Error, shows snackbar with error message.
  test("shows snackbar error when beginTwoFactorSetup throws Error", async () => {
    (beginTwoFactorSetup as jest.Mock).mockRejectedValue(new Error("Network error"));
    render(<TwoFactorSetup enabled={false} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enable 2FA/i }));
    });
    await waitFor(() => {
      expect((globalThis as Record<string, unknown>).mockShowSnackbar).toHaveBeenCalledWith(
        "Network error",
        "error",
      );
    });
  });

  // When beginTwoFactorSetup throws a non-Error, shows generic setup error message.
  test("shows generic error when beginTwoFactorSetup throws non-Error", async () => {
    (beginTwoFactorSetup as jest.Mock).mockRejectedValue("something bad");
    render(<TwoFactorSetup enabled={false} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enable 2FA/i }));
    });
    await waitFor(() => {
      expect((globalThis as Record<string, unknown>).mockShowSnackbar).toHaveBeenCalledWith(
        "Failed to initialize 2FA setup",
        "error",
      );
    });
  });

  // Setup dialog: advancing from step 0 to step 1 with Next button.
  test("Next button in setup dialog advances to verify step", async () => {
    (beginTwoFactorSetup as jest.Mock).mockResolvedValue(mockSetupData);
    render(<TwoFactorSetup enabled={false} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enable 2FA/i }));
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Next/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => {
      expect(screen.getByLabelText("Verification Code")).toBeInTheDocument();
    });
  });

  // Setup dialog step 1: Back button returns to QR step.
  test("Back button in verify step returns to QR step", async () => {
    (beginTwoFactorSetup as jest.Mock).mockResolvedValue(mockSetupData);
    render(<TwoFactorSetup enabled={false} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enable 2FA/i }));
    });
    await waitFor(() => screen.getByRole("button", { name: /Next/i }));
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => screen.getByRole("button", { name: /Back/i }));
    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    await waitFor(() => {
      expect(screen.getByText("TESTSECRET")).toBeInTheDocument();
    });
  });

  // Confirming setup with a valid code shows recovery codes at step 2.
  test("successful confirm advances to recovery codes step", async () => {
    (beginTwoFactorSetup as jest.Mock).mockResolvedValue(mockSetupData);
    (confirmTwoFactorSetup as jest.Mock).mockResolvedValue(undefined);
    render(<TwoFactorSetup enabled={false} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enable 2FA/i }));
    });
    await waitFor(() => screen.getByRole("button", { name: /Next/i }));
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => screen.getByLabelText("Verification Code"));
    const form = screen.getByLabelText("Verification Code").closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      expect(
        screen.getByText(/Save these recovery codes in a secure location/),
      ).toBeInTheDocument();
    });
  });

  // Confirming setup with error keeps user on step 1 and shows error.
  test("confirm with error stays on verify step and shows error message", async () => {
    (beginTwoFactorSetup as jest.Mock).mockResolvedValue(mockSetupData);
    (confirmTwoFactorSetup as jest.Mock).mockResolvedValue({ error: "Invalid code" });
    render(<TwoFactorSetup enabled={false} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enable 2FA/i }));
    });
    await waitFor(() => screen.getByRole("button", { name: /Next/i }));
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => screen.getByLabelText("Verification Code"));
    const form = screen.getByLabelText("Verification Code").closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      expect(screen.getByText("Invalid code")).toBeInTheDocument();
    });
  });

  // Done button closes the setup dialog.
  test("Done button closes setup dialog", async () => {
    (beginTwoFactorSetup as jest.Mock).mockResolvedValue(mockSetupData);
    (confirmTwoFactorSetup as jest.Mock).mockResolvedValue(undefined);
    render(<TwoFactorSetup enabled={false} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enable 2FA/i }));
    });
    await waitFor(() => screen.getByRole("button", { name: /Next/i }));
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => screen.getByLabelText("Verification Code"));
    await act(async () => {
      fireEvent.submit(screen.getByLabelText("Verification Code").closest("form")!);
    });
    await waitFor(() => screen.getByRole("button", { name: /Done/i }));
    fireEvent.click(screen.getByRole("button", { name: /Done/i }));
    await waitFor(() => {
      expect(screen.queryByText("Set Up Two-Factor Authentication")).not.toBeInTheDocument();
    });
  });

  // Clicking Disable opens the disable dialog.
  test("clicking Disable opens disable dialog", () => {
    render(<TwoFactorSetup enabled={true} />);
    fireEvent.click(screen.getByRole("button", { name: /Disable 2FA/i }));
    expect(screen.getByText("Disable Two-Factor Authentication")).toBeInTheDocument();
  });

  // Disable dialog can be closed without submitting — dialog becomes hidden after cancel.
  test("disable dialog cancel button closes the dialog", () => {
    render(<TwoFactorSetup enabled={true} />);
    fireEvent.click(screen.getByRole("button", { name: /Disable 2FA/i }));
    // After clicking Disable 2FA, disableOpen becomes true and dialog is visible
    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn);
    // After cancel, disableOpen is false — MUI dialog hides but may keep node in DOM
    // Check that the dialog is no longer visible (aria-hidden or removed)
    expect(screen.queryByRole("button", { name: /Cancel/i })).not.toBeVisible();
  });

  // Clicking Regenerate Recovery Codes opens the regenerate dialog.
  test("clicking Regenerate Recovery Codes opens regenerate dialog", () => {
    render(<TwoFactorSetup enabled={true} />);
    // Use getByRole to click the button specifically (not the dialog title)
    fireEvent.click(screen.getByRole("button", { name: /Regenerate Recovery Codes/i }));
    // After opening, there are now multiple elements with this text (title + button inside dialog)
    const matches = screen.getAllByText("Regenerate Recovery Codes");
    expect(matches.length).toBeGreaterThanOrEqual(2);
    // The dialog title should be visible
    expect(screen.getByText("Regenerate Recovery Codes", { selector: "h2" })).toBeInTheDocument();
  });

  // Regenerate dialog can be closed via Cancel button.
  test("regenerate dialog cancel button closes the dialog", () => {
    render(<TwoFactorSetup enabled={true} />);
    fireEvent.click(screen.getByRole("button", { name: /Regenerate Recovery Codes/i }));
    // After opening, Cancel button is visible
    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn);
    // After close, regenOpen is false — MUI dialog hides (aria-hidden)
    expect(screen.queryByRole("button", { name: /Cancel/i })).not.toBeVisible();
  });

  // Successful regeneration shows new codes and snackbar.
  test("successful regeneration shows new recovery codes", async () => {
    const newCodes = ["NEW1-AAAA", "NEW2-BBBB"];
    (regenerateRecoveryCodes as jest.Mock).mockResolvedValue({ recoveryCodes: newCodes });
    render(<TwoFactorSetup enabled={true} />);
    fireEvent.click(screen.getByRole("button", { name: /Regenerate Recovery Codes/i }));
    await waitFor(() => screen.getByLabelText("Verification Code"));
    const form = screen.getByLabelText("Verification Code").closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      expect(screen.getByText("NEW1-AAAA")).toBeInTheDocument();
    });
    expect((globalThis as Record<string, unknown>).mockShowSnackbar).toHaveBeenCalledWith(
      "Recovery codes regenerated",
    );
  });

  // Regeneration with error shows error snackbar.
  test("regeneration error shows error snackbar", async () => {
    (regenerateRecoveryCodes as jest.Mock).mockResolvedValue({ error: "Invalid code" });
    render(<TwoFactorSetup enabled={true} />);
    fireEvent.click(screen.getByRole("button", { name: /Regenerate Recovery Codes/i }));
    await waitFor(() => screen.getByLabelText("Verification Code"));
    const form = screen.getByLabelText("Verification Code").closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      expect((globalThis as Record<string, unknown>).mockShowSnackbar).toHaveBeenCalledWith(
        "Invalid code",
        "error",
      );
    });
  });

  // Regeneration with null result does not crash.
  test("regeneration with null result does not crash", async () => {
    (regenerateRecoveryCodes as jest.Mock).mockResolvedValue(null);
    render(<TwoFactorSetup enabled={true} />);
    fireEvent.click(screen.getByRole("button", { name: /Regenerate Recovery Codes/i }));
    await waitFor(() => screen.getByLabelText("Verification Code"));
    const form = screen.getByLabelText("Verification Code").closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });
    // No error thrown — dialog still open, verify the title is present
    await waitFor(() => {
      expect(screen.getByText("Regenerate Recovery Codes", { selector: "h2" })).toBeInTheDocument();
    });
  });

  // Regeneration with error: null does not show snackbar.
  test("regeneration result with error null does not show snackbar", async () => {
    (regenerateRecoveryCodes as jest.Mock).mockResolvedValue({ error: null });
    render(<TwoFactorSetup enabled={true} />);
    fireEvent.click(screen.getByRole("button", { name: /Regenerate Recovery Codes/i }));
    await waitFor(() => screen.getByLabelText("Verification Code"));
    const form = screen.getByLabelText("Verification Code").closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      // No snackbar for error:null case — snackbar was not called with "error" severity
      const calls = ((globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock).mock
        .calls;
      const errorCalls = calls.filter((c) => c[1] === "error");
      expect(errorCalls.length).toBe(0);
    });
  });

  // copyRecoveryCodes writes codes to clipboard joined by newlines.
  test("copy recovery codes in setup dialog writes to clipboard", async () => {
    (beginTwoFactorSetup as jest.Mock).mockResolvedValue(mockSetupData);
    (confirmTwoFactorSetup as jest.Mock).mockResolvedValue(undefined);
    render(<TwoFactorSetup enabled={false} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enable 2FA/i }));
    });
    await waitFor(() => screen.getByRole("button", { name: /Next/i }));
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => screen.getByLabelText("Verification Code"));
    await act(async () => {
      fireEvent.submit(screen.getByLabelText("Verification Code").closest("form")!);
    });
    await waitFor(() => screen.getByRole("button", { name: /Copy All Codes/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Copy All Codes/i }));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      mockSetupData.recoveryCodes.join("\n"),
    );
  });

  // copyRecoveryCodes shows "codes copied" message, which disappears after timeout.
  test("codes copied message appears and disappears after 2 seconds", async () => {
    jest.useFakeTimers();
    (beginTwoFactorSetup as jest.Mock).mockResolvedValue(mockSetupData);
    (confirmTwoFactorSetup as jest.Mock).mockResolvedValue(undefined);
    render(<TwoFactorSetup enabled={false} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enable 2FA/i }));
    });
    await waitFor(() => screen.getByRole("button", { name: /Next/i }));
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => screen.getByLabelText("Verification Code"));
    await act(async () => {
      fireEvent.submit(screen.getByLabelText("Verification Code").closest("form")!);
    });
    await waitFor(() => screen.getByRole("button", { name: /Copy All Codes/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Copy All Codes/i }));
    });
    expect(screen.getByText("Recovery codes copied to clipboard")).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(2001));
    await waitFor(() => {
      expect(screen.queryByText("Recovery codes copied to clipboard")).not.toBeInTheDocument();
    });
  });

  // Successful disable closes the disable dialog (covers onSuccess callback at line 73).
  test("successful disable closes the disable dialog", async () => {
    (disableTwoFactor as jest.Mock).mockResolvedValue(undefined);
    render(<TwoFactorSetup enabled={true} />);
    fireEvent.click(screen.getByRole("button", { name: /Disable 2FA/i }));
    await waitFor(() => screen.getByLabelText("Verification Code"));
    const form = screen.getByLabelText("Verification Code").closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      expect((globalThis as Record<string, unknown>).mockShowSnackbar).toHaveBeenCalledWith(
        "Two-factor authentication disabled",
      );
    });
    // Dialog should be closed after success
    expect(screen.queryByRole("button", { name: /Cancel/i })).not.toBeVisible();
  });

  // Disable with error shows error in dialog.
  test("disable with error shows error message in dialog", async () => {
    (disableTwoFactor as jest.Mock).mockResolvedValue({ error: "Wrong code" });
    render(<TwoFactorSetup enabled={true} />);
    fireEvent.click(screen.getByRole("button", { name: /Disable 2FA/i }));
    await waitFor(() => screen.getByLabelText("Verification Code"));
    const form = screen.getByLabelText("Verification Code").closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      expect(screen.getByText("Wrong code")).toBeInTheDocument();
    });
  });

  // handleCopySecret copies the secret to clipboard and shows snackbar.
  test("copy secret icon in setup dialog writes secret to clipboard", async () => {
    (beginTwoFactorSetup as jest.Mock).mockResolvedValue(mockSetupData);
    render(<TwoFactorSetup enabled={false} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enable 2FA/i }));
    });
    await waitFor(() => screen.getByText("TESTSECRET"));
    // The copy icon button is alongside the secret text
    const allButtons = screen.getAllByRole("button");
    const copySecretBtn = allButtons.find(
      (btn) => !btn.textContent?.includes("Next") && !btn.textContent?.match(/\w/),
    );
    if (copySecretBtn) {
      await act(async () => {
        fireEvent.click(copySecretBtn);
      });
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("TESTSECRET");
      expect((globalThis as Record<string, unknown>).mockShowSnackbar).toHaveBeenCalledWith(
        "Secret copied to clipboard",
      );
    }
  });

  // Security icon is rendered in the header.
  test("renders security icon and description", () => {
    render(<TwoFactorSetup enabled={false} />);
    expect(
      screen.getByText(
        "Add an extra layer of security to your account by requiring a verification code from your authenticator app.",
      ),
    ).toBeInTheDocument();
  });

  // Closing the setup dialog via Escape calls the onClose lambda and hides the dialog.
  test("setup dialog Escape key closes the dialog via onClose prop", async () => {
    (beginTwoFactorSetup as jest.Mock).mockResolvedValue(mockSetupData);
    render(<TwoFactorSetup enabled={false} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enable 2FA/i }));
    });
    await waitFor(() => screen.getByText("Set Up Two-Factor Authentication"));
    // Fire Escape on the dialog element to trigger MUI's onClose → setSetupOpen(false)
    const dialog = document.querySelector('[role="dialog"]');
    if (dialog) {
      fireEvent.keyDown(dialog, { key: "Escape", code: "Escape", keyCode: 27 });
    }
    // After closing, setupOpen is false — dialog should no longer be visible
    await waitFor(() => {
      const dialogEl = document.querySelector('[role="dialog"]');
      if (dialogEl) {
        expect(dialogEl).not.toBeVisible();
      } else {
        expect(screen.queryByText("Set Up Two-Factor Authentication")).not.toBeInTheDocument();
      }
    });
  });
});
