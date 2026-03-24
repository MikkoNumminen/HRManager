import { render, screen } from "@testing-library/react";
import DeleteImpactList from "@/components/DeleteImpactList";

describe("DeleteImpactList", () => {
  // Renders nothing when all impact items are empty.
  test("renders nothing when no impacts have items", () => {
    const { container } = render(<DeleteImpactList impacts={[{ label: "Teams", items: [] }]} />);
    expect(container.firstChild).toBeNull();
  });

  // Renders the warning header and impact items when impacts exist.
  test("renders warning box with impact items", () => {
    render(
      <DeleteImpactList
        impacts={[
          { label: "Manages 2 teams (will lose manager)", items: ["Engineering", "Design"] },
          { label: "Member of 1 team (will be removed)", items: ["Backend"] },
        ]}
      />,
    );
    expect(screen.getByText("Affected references")).toBeInTheDocument();
    expect(screen.getByText("Manages 2 teams (will lose manager)")).toBeInTheDocument();
    expect(screen.getByText("Engineering, Design")).toBeInTheDocument();
    expect(screen.getByText("Member of 1 team (will be removed)")).toBeInTheDocument();
    expect(screen.getByText("Backend")).toBeInTheDocument();
  });

  // Filters out empty impact categories — only non-empty ones are shown.
  test("only renders non-empty impact categories", () => {
    render(
      <DeleteImpactList
        impacts={[
          { label: "Teams", items: [] },
          { label: "Departments", items: ["HR"] },
          { label: "Leave requests", items: [] },
        ]}
      />,
    );
    expect(screen.getByText("Departments")).toBeInTheDocument();
    expect(screen.getByText("HR")).toBeInTheDocument();
    expect(screen.queryByText("Teams")).not.toBeInTheDocument();
    expect(screen.queryByText("Leave requests")).not.toBeInTheDocument();
  });

  // Renders the warning icon.
  test("renders the WarningAmber icon", () => {
    render(<DeleteImpactList impacts={[{ label: "Teams", items: ["Alpha"] }]} />);
    expect(screen.getByTestId("WarningAmberIcon")).toBeInTheDocument();
  });
});
