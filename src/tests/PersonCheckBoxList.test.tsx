import { render, screen, fireEvent } from "@testing-library/react";
import { PersonSelectCard } from "../components/PersonSelectCard";

const defaultPerson = {
  id: "person-1",
  name: "John Doe",
  position: "Developer",
  email: "john@example.com",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("PersonSelectCard", () => {
  test("renders person name and position", () => {
    render(<PersonSelectCard person={defaultPerson} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Developer")).toBeInTheDocument();
  });

  test("renders avatar initials from name", () => {
    render(<PersonSelectCard person={defaultPerson} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  test("card has role=button with aria-label of person name", () => {
    render(<PersonSelectCard person={defaultPerson} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByRole("button", { name: "John Doe" })).toBeInTheDocument();
  });

  test("aria-pressed is false when not selected", () => {
    render(<PersonSelectCard person={defaultPerson} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByRole("button", { name: "John Doe" })).toHaveAttribute("aria-pressed", "false");
  });

  test("aria-pressed is true when selected", () => {
    render(<PersonSelectCard person={defaultPerson} selected={true} onSelect={jest.fn()} />);
    expect(screen.getByRole("button", { name: "John Doe" })).toHaveAttribute("aria-pressed", "true");
  });

  test("calls onSelect with person id when clicked while not selected", () => {
    const onSelect = jest.fn();
    render(<PersonSelectCard person={defaultPerson} selected={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "John Doe" }));
    expect(onSelect).toHaveBeenCalledWith("person-1");
  });

  test("calls onSelect with empty string when clicked while selected (deselect)", () => {
    const onSelect = jest.fn();
    render(<PersonSelectCard person={defaultPerson} selected={true} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "John Doe" }));
    expect(onSelect).toHaveBeenCalledWith("");
  });
});
