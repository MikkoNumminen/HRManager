import { render, screen, fireEvent } from "@testing-library/react";
import RecoveryCodesList from "@/features/twoFactor/components/RecoveryCodesList";

const sampleCodes = [
  "AAAA-BBBB",
  "CCCC-DDDD",
  "EEEE-FFFF",
  "GGGG-HHHH",
  "IIII-JJJJ",
  "KKKK-LLLL",
  "MMMM-NNNN",
  "OOOO-PPPP",
];

describe("RecoveryCodesList", () => {
  // Renders all provided recovery codes in the list.
  test("renders all recovery codes", () => {
    render(<RecoveryCodesList codes={sampleCodes} onCopy={jest.fn()} />);
    for (const code of sampleCodes) {
      expect(screen.getByText(code)).toBeInTheDocument();
    }
  });

  // Renders the copy button with the correct label from translations.
  test("renders copy all codes button", () => {
    render(<RecoveryCodesList codes={sampleCodes} onCopy={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Copy All Codes/i })).toBeInTheDocument();
  });

  // Calls onCopy with the full codes array when the copy button is clicked.
  test("calls onCopy with codes array when copy button clicked", () => {
    const mockOnCopy = jest.fn();
    render(<RecoveryCodesList codes={sampleCodes} onCopy={mockOnCopy} />);
    fireEvent.click(screen.getByRole("button", { name: /Copy All Codes/i }));
    expect(mockOnCopy).toHaveBeenCalledTimes(1);
    expect(mockOnCopy).toHaveBeenCalledWith(sampleCodes);
  });

  // Handles an empty codes array without crashing.
  test("renders gracefully with empty codes array", () => {
    render(<RecoveryCodesList codes={[]} onCopy={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Copy All Codes/i })).toBeInTheDocument();
  });

  // Handles a single code correctly.
  test("renders a single code", () => {
    render(<RecoveryCodesList codes={["XXXX-YYYY"]} onCopy={jest.fn()} />);
    expect(screen.getByText("XXXX-YYYY")).toBeInTheDocument();
  });

  // The onCopy callback is not called before the button is clicked.
  test("does not call onCopy on initial render", () => {
    const mockOnCopy = jest.fn();
    render(<RecoveryCodesList codes={sampleCodes} onCopy={mockOnCopy} />);
    expect(mockOnCopy).not.toHaveBeenCalled();
  });

  // Calling onCopy multiple times passes updated codes each time.
  test("can call onCopy multiple times", () => {
    const mockOnCopy = jest.fn();
    render(<RecoveryCodesList codes={sampleCodes} onCopy={mockOnCopy} />);
    const btn = screen.getByRole("button", { name: /Copy All Codes/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(mockOnCopy).toHaveBeenCalledTimes(2);
  });
});
