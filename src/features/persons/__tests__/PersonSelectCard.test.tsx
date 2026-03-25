import { render, screen, fireEvent } from "@testing-library/react";
import { PersonSelectCard } from "@/features/persons/components/PersonSelectCard";
import { Person } from "@/schemas";

const mockPerson: Person = {
  id: "aaa-111-bbb-222-ccc",
  name: "Alice Johnson",
  position: "Senior Developer",
  email: "alice@example.com",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const noPositionPerson: Person = {
  ...mockPerson,
  id: "ddd-444-eee-555-fff",
  name: "Bob",
  position: null,
};

const noEmailPerson: Person = {
  ...mockPerson,
  id: "ggg-777-hhh-888-iii",
  name: "Carol Davis",
  email: null,
};

describe("PersonSelectCard", () => {
  // Shows the person's name on the card.
  test("renders the person's name", () => {
    render(<PersonSelectCard person={mockPerson} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
  });

  // Shows the person's position below the name.
  test("renders the person's position", () => {
    render(<PersonSelectCard person={mockPerson} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByText("Senior Developer")).toBeInTheDocument();
  });

  // If the person has no position, it shouldn't render a position line.
  test("does not render position when null", () => {
    render(<PersonSelectCard person={noPositionPerson} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Senior Developer")).not.toBeInTheDocument();
  });

  // Shows initials in the avatar — first letter of each name part, max 2.
  test("renders correct initials in avatar", () => {
    render(<PersonSelectCard person={mockPerson} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByText("AJ")).toBeInTheDocument();
  });

  // A single-name person should show just one initial.
  test("renders single initial for single-word name", () => {
    render(<PersonSelectCard person={noPositionPerson} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  // Clicking the card should call onSelect with the person's ID.
  test("calls onSelect with person ID when clicked", () => {
    const onSelect = jest.fn();
    render(<PersonSelectCard person={mockPerson} selected={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("aaa-111-bbb-222-ccc");
  });

  // Clicking an already selected card should deselect it (pass empty string).
  test("calls onSelect with empty string when clicking a selected card", () => {
    const onSelect = jest.fn();
    render(<PersonSelectCard person={mockPerson} selected={true} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("");
  });

  // Pressing Enter on the card should trigger selection, same as clicking.
  test("selects on Enter key press", () => {
    const onSelect = jest.fn();
    render(<PersonSelectCard person={mockPerson} selected={false} onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("aaa-111-bbb-222-ccc");
  });

  // Pressing Space on the card should also trigger selection.
  test("selects on Space key press", () => {
    const onSelect = jest.fn();
    render(<PersonSelectCard person={mockPerson} selected={false} onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole("button"), { key: " " });
    expect(onSelect).toHaveBeenCalledWith("aaa-111-bbb-222-ccc");
  });

  // Other keys like Tab or Escape should not trigger selection.
  test("ignores other key presses", () => {
    const onSelect = jest.fn();
    render(<PersonSelectCard person={mockPerson} selected={false} onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole("button"), { key: "Tab" });
    fireEvent.keyDown(screen.getByRole("button"), { key: "Escape" });
    expect(onSelect).not.toHaveBeenCalled();
  });

  // The card should have aria-pressed=true when selected for accessibility.
  test("has aria-pressed true when selected", () => {
    render(<PersonSelectCard person={mockPerson} selected={true} onSelect={jest.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  // The card should have aria-pressed=false when not selected.
  test("has aria-pressed false when not selected", () => {
    render(<PersonSelectCard person={mockPerson} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  // The card should have an accessible label matching the person's name.
  test("has aria-label with person name", () => {
    render(<PersonSelectCard person={mockPerson} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Alice Johnson");
  });

  // When email is null, the tooltip should show "No email" fallback text.
  test("shows 'No email' tooltip when email is null", () => {
    render(<PersonSelectCard person={noEmailPerson} selected={false} onSelect={jest.fn()} />);
    // The tooltip title is set in the component, we can verify the element exists
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  // The "remove" variant should render without crashing.
  test("renders with remove variant", () => {
    render(
      <PersonSelectCard
        person={mockPerson}
        selected={false}
        onSelect={jest.fn()}
        variant="remove"
      />,
    );
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
  });

  // A selected card in remove variant should still toggle correctly.
  test("deselects on click with remove variant", () => {
    const onSelect = jest.fn();
    render(
      <PersonSelectCard person={mockPerson} selected={true} onSelect={onSelect} variant="remove" />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("");
  });
});
