import { render, screen, fireEvent } from "@testing-library/react";
import { PersonCheckBoxList } from "../components/PersonCheckboxList";

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

describe("PersonCheckBoxList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders name, position and email", () => {
    render(<PersonCheckBoxList {...defaultProps} />);
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Developer/)).toBeInTheDocument();
    expect(screen.getByText(/john@example.com/)).toBeInTheDocument();
  });

  test("radio input uses groupName as name attribute", () => {
    render(<PersonCheckBoxList {...defaultProps} />);
    const radio = screen.getByRole("radio") as HTMLInputElement;
    expect(radio.name).toBe("test-group");
  });

  test("radio is not checked when selectedId does not match", () => {
    render(<PersonCheckBoxList {...defaultProps} selectedId="other-id" />);
    expect(screen.getByRole("radio")).not.toBeChecked();
  });

  test("radio is checked when selectedId matches id", () => {
    render(<PersonCheckBoxList {...defaultProps} selectedId="person-1" />);
    expect(screen.getByRole("radio")).toBeChecked();
  });

  test("calls onSelect with id when radio is changed", () => {
    const onSelect = jest.fn();
    render(<PersonCheckBoxList {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("radio"));
    expect(onSelect).toHaveBeenCalledWith("person-1");
  });

  test("calls onSelect with empty string when already selected radio is clicked", () => {
    const onSelect = jest.fn();
    render(<PersonCheckBoxList {...defaultProps} selectedId="person-1" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("radio"));
    expect(onSelect).toHaveBeenCalledWith("");
  });
});
