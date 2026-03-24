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

// Each skeleton must render without throwing and produce visible skeleton elements.

describe("PageSkeletons", () => {
  // TablePageSkeleton renders a grid of skeleton rows for list pages.
  test("TablePageSkeleton renders skeleton elements", () => {
    render(<TablePageSkeleton />);
    const skeletons = screen.getAllByRole("generic");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // DetailPageSkeleton renders the requested number of form card placeholders.
  test("DetailPageSkeleton renders with default cards", () => {
    render(<DetailPageSkeleton />);
    const skeletons = screen.getAllByRole("generic");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test("DetailPageSkeleton accepts custom card count", () => {
    render(<DetailPageSkeleton cards={5} />);
    const skeletons = screen.getAllByRole("generic");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // DashboardSkeleton renders KPI cards, chart areas, and activity list.
  test("DashboardSkeleton renders skeleton elements", () => {
    render(<DashboardSkeleton />);
    const skeletons = screen.getAllByRole("generic");
    expect(skeletons.length).toBeGreaterThan(5);
  });

  // ProfileSkeleton renders avatar and field placeholders.
  test("ProfileSkeleton renders skeleton elements", () => {
    render(<ProfileSkeleton />);
    const skeletons = screen.getAllByRole("generic");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // AuditLogSkeleton renders filter bar and table row placeholders.
  test("AuditLogSkeleton renders skeleton elements", () => {
    render(<AuditLogSkeleton />);
    const skeletons = screen.getAllByRole("generic");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // DataPageSkeleton renders export and import section placeholders.
  test("DataPageSkeleton renders skeleton elements", () => {
    render(<DataPageSkeleton />);
    const skeletons = screen.getAllByRole("generic");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // AdminPageSkeleton renders user list row placeholders.
  test("AdminPageSkeleton renders skeleton elements", () => {
    render(<AdminPageSkeleton />);
    const skeletons = screen.getAllByRole("generic");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
