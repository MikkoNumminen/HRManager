import { render, screen } from "@testing-library/react";
import { PeopleOutlined } from "@mui/icons-material";
import EmptyState from "@/components/shared/EmptyState";

describe("EmptyState", () => {
  // Renders icon, title, and optional subtitle.
  test("renders title and icon", () => {
    render(<EmptyState icon={PeopleOutlined} title="No items found" />);
    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  // Subtitle is shown when provided.
  test("renders subtitle when provided", () => {
    render(
      <EmptyState
        icon={PeopleOutlined}
        title="No items found"
        subtitle="Add one using the form above."
      />,
    );
    expect(screen.getByText("Add one using the form above.")).toBeInTheDocument();
  });

  // Subtitle is omitted when not provided.
  test("does not render subtitle when omitted", () => {
    render(<EmptyState icon={PeopleOutlined} title="No items" />);
    expect(screen.queryByText(/form above/i)).not.toBeInTheDocument();
  });
});
