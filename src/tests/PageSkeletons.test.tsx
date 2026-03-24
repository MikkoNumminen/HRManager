import { render, screen } from "@testing-library/react";
import {
  TablePageSkeleton,
  DetailPageSkeleton,
  DashboardSkeleton,
  ProfileSkeleton,
  AuditLogSkeleton,
  DataPageSkeleton,
  AdminPageSkeleton,
} from "../components/PageSkeletons";

// Each skeleton must render without throwing and produce visible DOM nodes.

describe("PageSkeletons", () => {
  // TablePageSkeleton renders a grid of skeleton rows for list pages.
  test("TablePageSkeleton renders without crashing", () => {
    const { container } = render(<TablePageSkeleton />);
    expect(container.firstChild).not.toBeNull();
  });

  // DetailPageSkeleton renders the requested number of form card placeholders.
  test("DetailPageSkeleton renders default card count", () => {
    const { container } = render(<DetailPageSkeleton />);
    expect(container.firstChild).not.toBeNull();
  });

  test("DetailPageSkeleton accepts custom card count", () => {
    const { container } = render(<DetailPageSkeleton cards={5} />);
    expect(container.firstChild).not.toBeNull();
  });

  // DashboardSkeleton renders KPI cards, chart areas, and activity list.
  test("DashboardSkeleton renders without crashing", () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.firstChild).not.toBeNull();
  });

  // ProfileSkeleton renders avatar and field placeholders.
  test("ProfileSkeleton renders without crashing", () => {
    const { container } = render(<ProfileSkeleton />);
    expect(container.firstChild).not.toBeNull();
  });

  // AuditLogSkeleton renders filter bar and table row placeholders.
  test("AuditLogSkeleton renders without crashing", () => {
    const { container } = render(<AuditLogSkeleton />);
    expect(container.firstChild).not.toBeNull();
  });

  // DataPageSkeleton renders export and import section placeholders.
  test("DataPageSkeleton renders without crashing", () => {
    const { container } = render(<DataPageSkeleton />);
    expect(container.firstChild).not.toBeNull();
  });

  // AdminPageSkeleton renders user list row placeholders.
  test("AdminPageSkeleton renders without crashing", () => {
    const { container } = render(<AdminPageSkeleton />);
    expect(container.firstChild).not.toBeNull();
  });

  // All skeletons should render multiple DOM nodes (not empty shells).
  test("TablePageSkeleton renders multiple child nodes", () => {
    const { container } = render(<TablePageSkeleton />);
    expect(container.querySelectorAll("span, div").length).toBeGreaterThan(5);
  });

  test("DashboardSkeleton renders multiple child nodes", () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.querySelectorAll("span, div").length).toBeGreaterThan(5);
  });
});
