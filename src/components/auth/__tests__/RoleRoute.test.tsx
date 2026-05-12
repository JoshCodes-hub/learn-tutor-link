import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RoleRoute } from "@/components/auth/RoleRoute";

// --- Mocks --------------------------------------------------------------
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/securityAudit", () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

function renderRoute(initialPath: string, allow: ("student" | "tutor" | "admin")[]) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/admin/dashboard"
          element={
            <RoleRoute allow={allow}>
              <div>ADMIN_CONTENT</div>
            </RoleRoute>
          }
        />
        <Route path="/auth" element={<div>AUTH_PAGE</div>} />
        <Route path="/student/dashboard" element={<div>STUDENT_HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseAuth.mockReset();
});

describe("RoleRoute", () => {
  it("renders children when role matches", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1" },
      isLoading: false,
      primaryRole: "admin",
      hasRole: (r: string) => r === "admin",
      signOut: vi.fn(),
    });
    renderRoute("/admin/dashboard", ["admin"]);
    expect(screen.getByText("ADMIN_CONTENT")).toBeInTheDocument();
  });

  it("shows the inline Access Blocked screen on role mismatch", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1" },
      isLoading: false,
      primaryRole: "student",
      hasRole: (r: string) => r === "student",
      signOut: vi.fn(),
    });
    renderRoute("/admin/dashboard", ["admin"]);
    expect(screen.getByText(/access blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/requires the/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /go to my dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /switch account/i })).toBeInTheDocument();
    expect(screen.queryByText("ADMIN_CONTENT")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to /auth (unauthorized)", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      primaryRole: null,
      hasRole: () => false,
      signOut: vi.fn(),
    });
    renderRoute("/admin/dashboard", ["admin"]);
    expect(screen.getByText("AUTH_PAGE")).toBeInTheDocument();
    expect(screen.queryByText("ADMIN_CONTENT")).not.toBeInTheDocument();
  });

  it("shows a checking state while auth is loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      primaryRole: null,
      hasRole: () => false,
      signOut: vi.fn(),
    });
    renderRoute("/admin/dashboard", ["admin"]);
    expect(screen.getByText(/checking access/i)).toBeInTheDocument();
  });

  it("admins always pass even when not in `allow`", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "admin1" },
      isLoading: false,
      primaryRole: "admin",
      hasRole: (r: string) => r === "admin",
      signOut: vi.fn(),
    });
    renderRoute("/admin/dashboard", ["tutor"]);
    expect(screen.getByText("ADMIN_CONTENT")).toBeInTheDocument();
  });
});