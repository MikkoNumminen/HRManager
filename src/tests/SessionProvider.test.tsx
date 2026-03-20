import { render, screen } from "@testing-library/react";
import SessionProvider from "../components/SessionProvider";

jest.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="next-auth-provider">{children}</div>
  ),
}));

describe("SessionProvider", () => {
  // Renders children inside the NextAuth SessionProvider wrapper.
  test("renders children", () => {
    render(
      <SessionProvider>
        <span>Hello</span>
      </SessionProvider>,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  // Wraps children with the NextAuth SessionProvider component.
  test("wraps children with NextAuth SessionProvider", () => {
    render(
      <SessionProvider>
        <span>Child</span>
      </SessionProvider>,
    );
    expect(screen.getByTestId("next-auth-provider")).toBeInTheDocument();
    expect(screen.getByText("Child")).toBeInTheDocument();
  });
});
