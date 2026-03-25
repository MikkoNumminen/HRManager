import { render, screen, fireEvent } from "@testing-library/react";
import { PersonSelectCard } from "@/features/persons/components/PersonSelectCard";
import { PersonCheckBoxList } from "@/features/persons/components/PersonCheckboxList";
import { Person } from "@/schemas";

const defaultPerson: Person = {
  id: "person-1",
  name: "John Doe",
  position: "Developer",
  email: "john@example.com",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── PersonSelectCard ─────────────────────────────────────────────

describe("PersonSelectCard", () => {
  // Basic rendering: the card should show the person's name and job title.
  test("renders person name and position", () => {
    render(<PersonSelectCard person={defaultPerson} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Developer")).toBeInTheDocument();
  });

  // The avatar takes the first letter of each word in the name.
  // "John Doe" becomes "JD".
  test("renders avatar initials from name", () => {
    render(<PersonSelectCard person={defaultPerson} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  // The card is interactive, so it needs role=button and an accessible name.
  test("card has role=button with aria-label of person name", () => {
    render(<PersonSelectCard person={defaultPerson} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByRole("button", { name: "John Doe" })).toBeInTheDocument();
  });

  // When not selected, aria-pressed should be false so screen readers know the state.
  test("aria-pressed is false when not selected", () => {
    render(<PersonSelectCard person={defaultPerson} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByRole("button", { name: "John Doe" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  // When selected, aria-pressed should be true.
  test("aria-pressed is true when selected", () => {
    render(<PersonSelectCard person={defaultPerson} selected={true} onSelect={jest.fn()} />);
    expect(screen.getByRole("button", { name: "John Doe" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  // Clicking an unselected card should pass the person's ID to the handler.
  test("calls onSelect with person id when clicked while not selected", () => {
    const onSelect = jest.fn();
    render(<PersonSelectCard person={defaultPerson} selected={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "John Doe" }));
    expect(onSelect).toHaveBeenCalledWith("person-1");
  });

  // Clicking an already-selected card deselects it by passing an empty string.
  test("calls onSelect with empty string when clicked while selected (deselect)", () => {
    const onSelect = jest.fn();
    render(<PersonSelectCard person={defaultPerson} selected={true} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "John Doe" }));
    expect(onSelect).toHaveBeenCalledWith("");
  });

  // You should be able to select a card by pressing Enter — keyboard accessibility.
  test("calls onSelect when Enter key is pressed", () => {
    const onSelect = jest.fn();
    render(<PersonSelectCard person={defaultPerson} selected={false} onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "John Doe" }), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("person-1");
  });

  // Spacebar should also toggle selection — standard keyboard interaction pattern.
  test("calls onSelect when Space key is pressed", () => {
    const onSelect = jest.fn();
    render(<PersonSelectCard person={defaultPerson} selected={false} onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "John Doe" }), { key: " " });
    expect(onSelect).toHaveBeenCalledWith("person-1");
  });

  // If the person has no position, the position text simply shouldn't be rendered.
  test("does not render position when it is null", () => {
    const noPosition = { ...defaultPerson, position: null };
    render(<PersonSelectCard person={noPosition} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.queryByText("Developer")).not.toBeInTheDocument();
  });

  // A single-word name like "Madonna" should produce a single initial "M",
  // not crash or produce weird output.
  test("handles single-word name for initials", () => {
    const singleName = { ...defaultPerson, name: "Madonna" };
    render(<PersonSelectCard person={singleName} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  // The "remove" variant should still render the same content — the visual
  // difference is in colors, which we don't test here, but we verify it doesn't break.
  test('renders without error when variant is "remove"', () => {
    render(
      <PersonSelectCard
        person={defaultPerson}
        selected={false}
        onSelect={jest.fn()}
        variant="remove"
      />,
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });
});

// ─── PersonCheckBoxList ───────────────────────────────────────────

describe("PersonCheckBoxList", () => {
  const defaultProps = {
    ...defaultPerson,
    onSelect: jest.fn(),
    groupName: "test-group",
    selectedId: "",
  };

  beforeEach(() => jest.clearAllMocks());

  // The radio list item should display the person's name, position, and email.
  test("renders name, position, and email in the label", () => {
    render(<PersonCheckBoxList {...defaultProps} />);
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Developer/)).toBeInTheDocument();
    expect(screen.getByText(/john@example.com/)).toBeInTheDocument();
  });

  // It renders a radio button that belongs to the specified group name.
  test("renders a radio button", () => {
    render(<PersonCheckBoxList {...defaultProps} />);
    expect(screen.getByRole("radio")).toBeInTheDocument();
  });

  // When this person's ID matches the selectedId, the radio should be checked.
  test("radio is checked when selectedId matches person id", () => {
    render(<PersonCheckBoxList {...defaultProps} selectedId="person-1" />);
    expect(screen.getByRole("radio")).toBeChecked();
  });

  // When a different person is selected, this radio should be unchecked.
  test("radio is unchecked when selectedId does not match", () => {
    render(<PersonCheckBoxList {...defaultProps} selectedId="other-person" />);
    expect(screen.getByRole("radio")).not.toBeChecked();
  });

  // Clicking the radio should call onSelect with this person's ID.
  test("calls onSelect with person id when radio is changed", () => {
    const onSelect = jest.fn();
    render(<PersonCheckBoxList {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("radio"));
    expect(onSelect).toHaveBeenCalledWith("person-1");
  });

  // Clicking an already-selected radio deselects it by calling onSelect with empty string
  test("clicking selected radio deselects the person", () => {
    const onSelect = jest.fn();
    render(<PersonCheckBoxList {...defaultProps} selectedId="person-1" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("radio"));
    expect(onSelect).toHaveBeenCalledWith("");
  });

  // If position is null, just show nothing in that spot — no crash, no "null" text.
  test("renders without crashing when position is null", () => {
    render(<PersonCheckBoxList {...defaultProps} position={null} />);
    expect(screen.getByRole("radio")).toBeInTheDocument();
    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });

  // Same for email — null should render as blank, not the word "null".
  test("renders without crashing when email is null", () => {
    render(<PersonCheckBoxList {...defaultProps} email={null} />);
    expect(screen.getByRole("radio")).toBeInTheDocument();
    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });
});
