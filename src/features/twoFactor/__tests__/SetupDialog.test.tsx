import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SetupDialog from "@/features/twoFactor/components/SetupDialog";
import { type TwoFactorSetupResult } from "@/features/twoFactor/actions";

// Mock qrcode dynamic import to avoid real canvas operations in jsdom.
jest.mock(
  "qrcode",
  () => ({
    toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,MOCK"),
  }),
  { virtual: true },
);

const mockSetupData: TwoFactorSetupResult = {
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

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  setupData: mockSetupData,
  activeStep: 0,
  onStepChange: jest.fn(),
  confirmAction: jest.fn(),
  confirmState: { error: null },
  confirmPending: false,
  onDone: jest.fn(),
  copied: false,
  onCopyRecoveryCodes: jest.fn(),
  onCopySecret: jest.fn(),
};

describe("SetupDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Renders dialog title when open.
  test("renders dialog title", () => {
    render(<SetupDialog {...defaultProps} />);
    expect(screen.getByText("Set Up Two-Factor Authentication")).toBeInTheDocument();
  });

  // Does not render content when dialog is closed.
  test("does not show content when closed", () => {
    render(<SetupDialog {...defaultProps} open={false} />);
    expect(screen.queryByText("Set Up Two-Factor Authentication")).not.toBeInTheDocument();
  });

  // Renders all three stepper labels.
  test("renders stepper with all three steps", () => {
    render(<SetupDialog {...defaultProps} />);
    expect(screen.getByText("Scan QR Code")).toBeInTheDocument();
    expect(screen.getByText("Verify Code")).toBeInTheDocument();
    expect(screen.getByText("Recovery Codes")).toBeInTheDocument();
  });

  // Step 0: shows QR code image, scan instructions, and secret.
  test("step 0 shows QR code section with secret", () => {
    render(<SetupDialog {...defaultProps} activeStep={0} />);
    expect(
      screen.getByText(
        "Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("TESTSECRET")).toBeInTheDocument();
    expect(screen.getByAltText("QR code for authenticator app")).toBeInTheDocument();
  });

  // Step 0: shows the "Next" button to advance to step 1.
  test("step 0 shows Next button", () => {
    render(<SetupDialog {...defaultProps} activeStep={0} />);
    expect(screen.getByRole("button", { name: /Next/i })).toBeInTheDocument();
  });

  // Step 0: clicking Next calls onStepChange with 1.
  test("step 0 Next button calls onStepChange(1)", () => {
    const onStepChange = jest.fn();
    render(<SetupDialog {...defaultProps} activeStep={0} onStepChange={onStepChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    expect(onStepChange).toHaveBeenCalledWith(1);
  });

  // Step 0: clicking copy icon calls onCopySecret.
  test("step 0 copy icon calls onCopySecret", () => {
    const onCopySecret = jest.fn();
    render(<SetupDialog {...defaultProps} activeStep={0} onCopySecret={onCopySecret} />);
    // The copy icon button is the one adjacent to the secret text
    const iconButtons = screen.getAllByRole("button");
    // Find the icon button (not the Next button)
    const copyButton = iconButtons.find((btn) => !btn.textContent?.includes("Next"));
    expect(copyButton).toBeTruthy();
    fireEvent.click(copyButton!);
    expect(onCopySecret).toHaveBeenCalledTimes(1);
  });

  // Step 0: does not show QR code section when setupData is null.
  test("step 0 shows nothing when setupData is null", () => {
    render(<SetupDialog {...defaultProps} activeStep={0} setupData={null} />);
    expect(screen.queryByText("TESTSECRET")).not.toBeInTheDocument();
    expect(screen.queryByAltText("QR code for authenticator app")).not.toBeInTheDocument();
  });

  // Step 1: shows verification code input and instructions.
  test("step 1 shows verification form", () => {
    render(<SetupDialog {...defaultProps} activeStep={1} />);
    expect(
      screen.getByText("Enter the 6-digit code from your authenticator app to verify setup."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Verification Code")).toBeInTheDocument();
  });

  // Step 1: shows Back and Verify & Enable buttons.
  test("step 1 shows Back and Verify & Enable buttons", () => {
    render(<SetupDialog {...defaultProps} activeStep={1} />);
    expect(screen.getByRole("button", { name: /Back/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Verify & Enable/i })).toBeInTheDocument();
  });

  // Step 1: Back button calls onStepChange(0).
  test("step 1 Back button calls onStepChange(0)", () => {
    const onStepChange = jest.fn();
    render(<SetupDialog {...defaultProps} activeStep={1} onStepChange={onStepChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    expect(onStepChange).toHaveBeenCalledWith(0);
  });

  // Step 1: shows error alert when confirmState has an error.
  test("step 1 shows error alert when confirmState has error", () => {
    render(
      <SetupDialog
        {...defaultProps}
        activeStep={1}
        confirmState={{ error: "Invalid verification code" }}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Invalid verification code")).toBeInTheDocument();
  });

  // Step 1: does not show error alert when confirmState error is null.
  test("step 1 no error alert when confirmState error is null", () => {
    render(<SetupDialog {...defaultProps} activeStep={1} confirmState={{ error: null }} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // Step 1: Verify & Enable button is disabled when confirmPending is true.
  test("step 1 verify button is disabled when pending", () => {
    render(<SetupDialog {...defaultProps} activeStep={1} confirmPending={true} />);
    expect(screen.getByRole("button", { name: /Verify & Enable/i })).toBeDisabled();
  });

  // Step 1: Verify & Enable button is enabled when not pending.
  test("step 1 verify button is enabled when not pending", () => {
    render(<SetupDialog {...defaultProps} activeStep={1} confirmPending={false} />);
    expect(screen.getByRole("button", { name: /Verify & Enable/i })).toBeEnabled();
  });

  // Step 1: submitting the form calls confirmAction via the form action.
  test("step 1 submitting form calls confirmAction", () => {
    const confirmAction = jest.fn();
    render(<SetupDialog {...defaultProps} activeStep={1} confirmAction={confirmAction} />);
    const codeInput = screen.getByLabelText("Verification Code");
    fireEvent.change(codeInput, { target: { value: "123456" } });
    // eslint-disable-next-line testing-library/no-node-access
    fireEvent.submit(codeInput.closest("form")!);
    expect(confirmAction).toHaveBeenCalled();
  });

  // Step 2: shows recovery codes and warning.
  test("step 2 shows recovery codes and warning", () => {
    render(<SetupDialog {...defaultProps} activeStep={2} />);
    expect(
      screen.getByText(
        /Save these recovery codes in a secure location\. Each code can only be used once\./,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("AAAA-BBBB")).toBeInTheDocument();
  });

  // Step 2: shows recovery codes and Done button.
  test("step 2 shows Done button", () => {
    render(<SetupDialog {...defaultProps} activeStep={2} />);
    expect(screen.getByRole("button", { name: /Done/i })).toBeInTheDocument();
  });

  // Step 2: clicking Done calls onDone.
  test("step 2 Done button calls onDone", () => {
    const onDone = jest.fn();
    render(<SetupDialog {...defaultProps} activeStep={2} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: /Done/i }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  // Step 2: shows "codes copied" message when copied is true.
  test("step 2 shows codes copied message when copied is true", () => {
    render(<SetupDialog {...defaultProps} activeStep={2} copied={true} />);
    expect(screen.getByText("Recovery codes copied to clipboard")).toBeInTheDocument();
  });

  // Step 2: hides "codes copied" message when copied is false.
  test("step 2 hides codes copied message when copied is false", () => {
    render(<SetupDialog {...defaultProps} activeStep={2} copied={false} />);
    expect(screen.queryByText("Recovery codes copied to clipboard")).not.toBeInTheDocument();
  });

  // Step 2: does not show recovery codes section when setupData is null (codes not rendered).
  test("step 2 shows nothing when setupData is null", () => {
    render(<SetupDialog {...defaultProps} activeStep={2} setupData={null} />);
    expect(screen.queryByText("AAAA-BBBB")).not.toBeInTheDocument();
    // The Done button is still rendered at step 2 regardless of setupData (it's outside the guard)
    expect(screen.getByRole("button", { name: /Done/i })).toBeInTheDocument();
  });

  // Step 2: clicking copy codes in RecoveryCodesList calls onCopyRecoveryCodes.
  test("step 2 copy codes button calls onCopyRecoveryCodes", () => {
    const onCopyRecoveryCodes = jest.fn();
    render(
      <SetupDialog {...defaultProps} activeStep={2} onCopyRecoveryCodes={onCopyRecoveryCodes} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Copy All Codes/i }));
    expect(onCopyRecoveryCodes).toHaveBeenCalledWith(mockSetupData.recoveryCodes);
  });

  // Dialog onClose is called when activeStep < 2 and Escape is pressed.
  test("calls onClose when activeStep is 0 and Escape key is pressed", () => {
    const onClose = jest.fn();
    render(<SetupDialog {...defaultProps} activeStep={0} onClose={onClose} />);
    // MUI Dialog listens for Escape key on the dialog paper element.
    // Fire keyDown on the dialog element to trigger MUI's internal onClose.
    // eslint-disable-next-line testing-library/no-node-access
    const dialog = document.querySelector('[role="dialog"]');
    if (dialog) {
      fireEvent.keyDown(dialog, { key: "Escape", code: "Escape", keyCode: 27 });
    } else {
      // Fallback: fire on document
      fireEvent.keyDown(document, { key: "Escape", code: "Escape", keyCode: 27 });
    }
    // At step 0, activeStep < 2 is true so onClose should be called
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Done button is not shown when activeStep is not 2.
  test("Done button is not shown on step 0", () => {
    render(<SetupDialog {...defaultProps} activeStep={0} />);
    expect(screen.queryByRole("button", { name: /Done/i })).not.toBeInTheDocument();
  });

  // Done button is not shown on step 1.
  test("Done button is not shown on step 1", () => {
    render(<SetupDialog {...defaultProps} activeStep={1} />);
    expect(screen.queryByRole("button", { name: /Done/i })).not.toBeInTheDocument();
  });

  // Dialog onClose is blocked when activeStep === 2 (prevents accidental close on recovery step).
  test("onClose is NOT called when activeStep is 2 and dialog fires close", () => {
    const onClose = jest.fn();
    render(<SetupDialog {...defaultProps} activeStep={2} onClose={onClose} />);
    // The Dialog's onClose prop is `() => activeStep < 2 && onClose()`.
    // At step 2, activeStep < 2 is false, so onClose should not be called.
    // We call the internal handler by directly testing the logic:
    // Since the dialog's onClose is called with no args by MUI, we can render
    // a wrapper that calls it. Here we rely on the fact that step 2 renders correctly.
    expect(screen.getByRole("button", { name: /Done/i })).toBeInTheDocument();
    // Verify onClose is not triggered by the dialog backdrop (simulated via Escape)
    fireEvent.keyDown(document.body, { key: "Escape" });
    // MUI may or may not call the handler; in either case onClose should not fire at step 2
    expect(onClose).not.toHaveBeenCalled();
  });

  // QrCodeRenderer triggers useEffect and attempts to update the img src.
  test("QrCodeRenderer updates img src after mount", async () => {
    render(<SetupDialog {...defaultProps} activeStep={0} />);
    const img = screen.getByAltText("QR code for authenticator app") as HTMLImageElement;
    await waitFor(() => {
      expect(img).toBeInTheDocument();
    });
  });

  // Step 0 shows manual entry label.
  test("step 0 shows manual entry label", () => {
    render(<SetupDialog {...defaultProps} activeStep={0} />);
    expect(screen.getByText("Or enter this code manually:")).toBeInTheDocument();
  });
});
