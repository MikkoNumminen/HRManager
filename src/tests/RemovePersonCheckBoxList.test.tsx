import { render, screen } from "@testing-library/react";
import { RemovePersonCheckBoxList } from "@/components/RemovePersonCheckBoxList";

describe("RemovePersonCheckBoxList", () => {
  const defaultProps = {
    id: "person-1",
    name: "John Doe",
    position: "Developer" as string | null,
    email: "john@example.com" as string | null,
  };

  // The component should display the person's name, job title, and email in the label.
  test("renders name, position, and email", () => {
    render(<RemovePersonCheckBoxList {...defaultProps} />);
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Developer/)).toBeInTheDocument();
    expect(screen.getByText(/john@example.com/)).toBeInTheDocument();
  });

  // Each item has a radio button so the user can select which person to remove.
  test("renders a radio button", () => {
    render(<RemovePersonCheckBoxList {...defaultProps} />);
    expect(screen.getByRole("radio")).toBeInTheDocument();
  });

  // The radio button's value should be the person's ID — this is what gets
  // submitted in the form to tell the server action which person to delete.
  test("radio button has correct value", () => {
    render(<RemovePersonCheckBoxList {...defaultProps} />);
    expect(screen.getByRole("radio")).toHaveAttribute("value", "person-1");
  });

  // The radio's name attribute should be "personID" to match what the
  // server action reads from the FormData.
  test('radio button has name "personID"', () => {
    render(<RemovePersonCheckBoxList {...defaultProps} />);
    expect(screen.getByRole("radio")).toHaveAttribute("name", "personID");
  });

  // If position is null, just show nothing in that spot — don't render "null".
  test("renders without crashing when position is null", () => {
    render(<RemovePersonCheckBoxList {...defaultProps} position={null} />);
    expect(screen.getByRole("radio")).toBeInTheDocument();
    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });

  // Same for email — null fields should be blank, not the word "null".
  test("renders without crashing when email is null", () => {
    render(<RemovePersonCheckBoxList {...defaultProps} email={null} />);
    expect(screen.getByRole("radio")).toBeInTheDocument();
    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });
});
