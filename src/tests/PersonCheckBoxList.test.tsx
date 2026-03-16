import { render, screen, fireEvent } from "@testing-library/react";
import { PersonCheckBoxList } from "../components/PersonCheckboxList";
import "@testing-library/jest-dom";

const defaultProps = {
  id: "person-1",
  name: "John Doe",
  position: "Developer",
  email: "john@example.com",
  createdAt: new Date(),
  updatedAt: new Date(),
  groupName: "test-group",
  selectedId: "",
  onSelect: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PersonCheckBoxList", () => {
  test("renders name, position and email", () => {
    render(<ul><PersonCheckBoxList {...defaultProps} /></ul>);
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Developer/)).toBeInTheDocument();
    expect(screen.getByText(/john@example.com/)).toBeInTheDocument();
  });

  test("radio input uses groupName as name attribute", () => {
    render(<ul><PersonCheckBoxList {...defaultProps} /></ul>);
    const radio = screen.getByRole("radio") as HTMLInputElement;
    expect(radio.name).toBe("test-group");
  });

  test("radio input id is prefixed with groupName", () => {
    render(<ul><PersonCheckBoxList {...defaultProps} /></ul>);
    const radio = screen.getByRole("radio") as HTMLInputElement;
    expect(radio.id).toBe("test-group-person-1");
  });

  test("radio is not checked when selectedId does not match", () => {
    render(<ul><PersonCheckBoxList {...defaultProps} selectedId="other-id" /></ul>);
    expect(screen.getByRole("radio")).not.toBeChecked();
  });

  test("radio is checked when selectedId matches id", () => {
    render(<ul><PersonCheckBoxList {...defaultProps} selectedId="person-1" /></ul>);
    expect(screen.getByRole("radio")).toBeChecked();
  });

  test("calls onSelect with id when radio is changed", () => {
    const onSelect = jest.fn();
    render(<ul><PersonCheckBoxList {...defaultProps} onSelect={onSelect} /></ul>);
    fireEvent.click(screen.getByRole("radio"));
    expect(onSelect).toHaveBeenCalledWith("person-1");
  });

  test("calls onSelect with empty string when already selected radio is clicked", () => {
    const onSelect = jest.fn();
    render(
      <ul>
        <PersonCheckBoxList {...defaultProps} selectedId="person-1" onSelect={onSelect} />
      </ul>
    );
    fireEvent.click(screen.getByRole("radio"));
    expect(onSelect).toHaveBeenCalledWith("");
  });
});
