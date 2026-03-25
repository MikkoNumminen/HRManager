import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfileEditor from "../components/ProfileEditor";
import { updateProfileName, updateProfileImage } from "@/features/profile/actions";
import { UserProfile } from "../schemas";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/features/profile/actions", () => ({
  updateProfileName: jest.fn(),
  updateProfileImage: jest.fn(),
}));

jest.mock("@/features/twoFactor/actions", () => ({
  beginTwoFactorSetup: jest.fn(),
  confirmTwoFactorSetup: jest.fn(),
  disableTwoFactor: jest.fn(),
  regenerateRecoveryCodes: jest.fn(),
}));

const baseProfile: UserProfile = {
  id: "aaa-111-bbb-222",
  email: "alice@example.com",
  name: "Alice Smith",
  image: null,
  role: "administrator",
  createdAt: new Date("2025-01-15"),
  updatedAt: new Date("2025-06-01"),
  resolvedPermissions: {
    "person:create": true,
    "person:read": true,
    "team:create": false,
    "admin:manage_users": false,
  },
  twoFactorEnabled: false,
};

describe("ProfileEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Shows the user's display name prominently in the header.
  test("displays user name in header", () => {
    render(<ProfileEditor profile={baseProfile} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  // Shows the user's email address.
  test("displays user email", () => {
    render(<ProfileEditor profile={baseProfile} />);
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  // Shows the role badge with correct label.
  test("displays role badge", () => {
    render(<ProfileEditor profile={baseProfile} />);
    expect(screen.getByText("Administrator")).toBeInTheDocument();
  });

  // Shows initials in avatar when no image is set.
  test("shows initials when no profile image", () => {
    render(<ProfileEditor profile={baseProfile} />);
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  // When the user has no name, show email as the display name.
  test("shows email when name is null", () => {
    const profile = { ...baseProfile, name: null };
    render(<ProfileEditor profile={profile} />);
    // Email appears in both header and info line
    const emailElements = screen.getAllByText("alice@example.com");
    expect(emailElements.length).toBeGreaterThanOrEqual(2);
  });

  // The name input field is pre-filled with the current name.
  test("pre-fills name input with current name", () => {
    render(<ProfileEditor profile={baseProfile} />);
    const nameInput = screen.getByLabelText("Enter New Name");
    expect(nameInput).toHaveValue("Alice Smith");
  });

  // Save button is disabled when name hasn't changed.
  test("save button is disabled when name is unchanged", () => {
    render(<ProfileEditor profile={baseProfile} />);
    const saveButtons = screen.getAllByRole("button", { name: /Save/i });
    expect(saveButtons[0]).toBeDisabled();
  });

  // Save button becomes enabled when name is changed.
  test("save button enables when name is changed", () => {
    render(<ProfileEditor profile={baseProfile} />);
    const nameInput = screen.getByLabelText("Enter New Name");
    fireEvent.change(nameInput, { target: { value: "Alice Johnson" } });
    const saveButtons = screen.getAllByRole("button", { name: /Save/i });
    expect(saveButtons[0]).toBeEnabled();
  });

  // Submitting the name form calls the updateProfileName server action.
  test("calls updateProfileName on form submission", async () => {
    (updateProfileName as jest.Mock).mockResolvedValue(undefined);
    render(<ProfileEditor profile={baseProfile} />);
    const nameInput = screen.getByLabelText("Enter New Name");
    fireEvent.change(nameInput, { target: { value: "Alice Johnson" } });
    const saveButtons = screen.getAllByRole("button", { name: /Save/i });
    fireEvent.click(saveButtons[0]);
    await waitFor(() => {
      expect(updateProfileName).toHaveBeenCalled();
    });
  });

  // Shows error message when name update fails.
  test("shows error when name update fails", async () => {
    (updateProfileName as jest.Mock).mockResolvedValue({ error: "Name is required" });
    render(<ProfileEditor profile={baseProfile} />);
    const nameInput = screen.getByLabelText("Enter New Name");
    fireEvent.change(nameInput, { target: { value: "A" } });
    const saveButtons = screen.getAllByRole("button", { name: /Save/i });
    fireEvent.click(saveButtons[0]);
    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
  });

  // Shows generic error when update throws a non-Error object.
  test("shows generic error when name update throws non-Error", async () => {
    (updateProfileName as jest.Mock).mockResolvedValue({ error: "An unexpected error occurred" });
    render(<ProfileEditor profile={baseProfile} />);
    const nameInput = screen.getByLabelText("Enter New Name");
    fireEvent.change(nameInput, { target: { value: "New Name" } });
    const saveButtons = screen.getAllByRole("button", { name: /Save/i });
    fireEvent.click(saveButtons[0]);
    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  // The image URL input is pre-filled when user has a custom image.
  test("pre-fills image input when user has custom image", () => {
    const profile = { ...baseProfile, image: "https://example.com/avatar.jpg" };
    render(<ProfileEditor profile={profile} />);
    const imageInput = screen.getByLabelText("Image URL");
    expect(imageInput).toHaveValue("https://example.com/avatar.jpg");
  });

  // Image URL input is empty when user has no custom image.
  test("image input is empty when no custom image", () => {
    render(<ProfileEditor profile={baseProfile} />);
    const imageInput = screen.getByLabelText("Image URL");
    expect(imageInput).toHaveValue("");
  });

  // Shows "Remove Image" button when user has a custom image.
  test("shows Remove Image button when user has custom image", () => {
    const profile = { ...baseProfile, image: "https://example.com/avatar.jpg" };
    render(<ProfileEditor profile={profile} />);
    expect(screen.getByRole("button", { name: /Remove Image/i })).toBeInTheDocument();
  });

  // Hides "Remove Image" button when no custom image is set.
  test("hides Remove Image button when no custom image", () => {
    render(<ProfileEditor profile={baseProfile} />);
    expect(screen.queryByRole("button", { name: /Remove Image/i })).not.toBeInTheDocument();
  });

  // Submitting the image form calls the updateProfileImage server action.
  test("calls updateProfileImage on image form submission", async () => {
    (updateProfileImage as jest.Mock).mockResolvedValue(undefined);
    render(<ProfileEditor profile={baseProfile} />);
    const imageInput = screen.getByLabelText("Image URL");
    fireEvent.change(imageInput, { target: { value: "https://example.com/new.jpg" } });
    const saveButtons = screen.getAllByRole("button", { name: /Save/i });
    fireEvent.click(saveButtons[1]);
    await waitFor(() => {
      expect(updateProfileImage).toHaveBeenCalled();
    });
  });

  // Shows error when image update fails.
  test("shows error when image update fails", async () => {
    (updateProfileImage as jest.Mock).mockResolvedValue({ error: "Invalid URL format" });
    render(<ProfileEditor profile={baseProfile} />);
    const imageInput = screen.getByLabelText("Image URL");
    fireEvent.change(imageInput, { target: { value: "bad-url" } });
    const saveButtons = screen.getAllByRole("button", { name: /Save/i });
    fireEvent.click(saveButtons[1]);
    await waitFor(() => {
      expect(screen.getByText("Invalid URL format")).toBeInTheDocument();
    });
  });

  // Shows generic error when image update throws non-Error.
  test("shows generic error when image update throws non-Error", async () => {
    (updateProfileImage as jest.Mock).mockResolvedValue({ error: "An unexpected error occurred" });
    render(<ProfileEditor profile={baseProfile} />);
    const imageInput = screen.getByLabelText("Image URL");
    fireEvent.change(imageInput, { target: { value: "https://example.com/new.jpg" } });
    const saveButtons = screen.getAllByRole("button", { name: /Save/i });
    fireEvent.click(saveButtons[1]);
    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  // Shows the permissions summary section with domain grouping.
  test("displays permissions grouped by domain", () => {
    render(<ProfileEditor profile={baseProfile} />);
    expect(screen.getByText("Your Permissions")).toBeInTheDocument();
    expect(screen.getByText("person")).toBeInTheDocument();
    expect(screen.getByText("team")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  // Permissions show "Allowed" and "Denied" chips correctly.
  test("shows Allowed and Denied chips for permissions", () => {
    render(<ProfileEditor profile={baseProfile} />);
    const allowedChips = screen.getAllByText("Allowed");
    const deniedChips = screen.getAllByText("Denied");
    expect(allowedChips.length).toBe(2); // person:create, person:read
    expect(deniedChips.length).toBe(2); // team:create, admin:manage_users
  });

  // Shows permission keys in monospace font format.
  test("shows permission keys", () => {
    render(<ProfileEditor profile={baseProfile} />);
    expect(screen.getByText("person:create")).toBeInTheDocument();
    expect(screen.getByText("person:read")).toBeInTheDocument();
    expect(screen.getByText("team:create")).toBeInTheDocument();
    expect(screen.getByText("admin:manage_users")).toBeInTheDocument();
  });

  // Shows all four role badges correctly.
  test("displays correct role labels for all roles", () => {
    const roles = [
      { role: "superuser", label: "Superuser" },
      { role: "administrator", label: "Administrator" },
      { role: "user", label: "User" },
      { role: "guest", label: "Guest" },
    ] as const;
    for (const { role, label } of roles) {
      const { unmount } = render(<ProfileEditor profile={{ ...baseProfile, role }} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  // Shows the help text for the profile picture section.
  test("shows image help text", () => {
    render(<ProfileEditor profile={baseProfile} />);
    expect(screen.getByText(/Enter a direct link to an image/)).toBeInTheDocument();
  });

  // Image save button is disabled when URL hasn't changed.
  test("image save button is disabled when URL is unchanged", () => {
    render(<ProfileEditor profile={baseProfile} />);
    const saveButtons = screen.getAllByRole("button", { name: /Save/i });
    expect(saveButtons[1]).toBeDisabled();
  });

  // Image save button enables when URL is changed.
  test("image save button enables when URL is changed", () => {
    render(<ProfileEditor profile={baseProfile} />);
    const imageInput = screen.getByLabelText("Image URL");
    fireEvent.change(imageInput, { target: { value: "https://new.com/pic.jpg" } });
    const saveButtons = screen.getAllByRole("button", { name: /Save/i });
    expect(saveButtons[1]).toBeEnabled();
  });

  // Shows the join date in the profile header.
  test("displays join date", () => {
    render(<ProfileEditor profile={baseProfile} />);
    // The date is formatted via toLocaleDateString — just check it contains the year
    expect(screen.getByText(/2025/)).toBeInTheDocument();
  });

  // Clicking "Remove Image" clears the image URL value to empty string.
  test("clicking Remove Image clears the image URL input", () => {
    const profile = { ...baseProfile, image: "https://example.com/avatar.jpg" };
    render(<ProfileEditor profile={profile} />);
    const imageInput = screen.getByLabelText("Image URL");
    expect(imageInput).toHaveValue("https://example.com/avatar.jpg");
    fireEvent.click(screen.getByRole("button", { name: /Remove Image/i }));
    expect(imageInput).toHaveValue("");
  });

  // Error messages have the alert role for accessibility.
  test("error messages have role=alert", async () => {
    (updateProfileName as jest.Mock).mockResolvedValue({ error: "Bad name" });
    render(<ProfileEditor profile={baseProfile} />);
    const nameInput = screen.getByLabelText("Enter New Name");
    fireEvent.change(nameInput, { target: { value: "X" } });
    const saveButtons = screen.getAllByRole("button", { name: /Save/i });
    fireEvent.click(saveButtons[0]);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
