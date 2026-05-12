import { describe, it, expect } from "vitest";
import { mapAuthError } from "@/lib/authErrors";

describe("mapAuthError", () => {
  it("maps invalid credentials", () => {
    expect(mapAuthError("Invalid login credentials")).toMatch(/invalid email or password/i);
  });

  it("maps unverified email", () => {
    expect(mapAuthError("Email not confirmed")).toMatch(/verify your email/i);
  });

  it("maps rate limiting", () => {
    expect(mapAuthError("Too many requests")).toMatch(/too many attempts/i);
    expect(mapAuthError("Rate limit exceeded")).toMatch(/too many attempts/i);
  });

  it("maps network failures", () => {
    expect(mapAuthError("Failed to fetch")).toMatch(/network error/i);
  });

  it("maps expired sessions", () => {
    expect(mapAuthError("Session expired")).toMatch(/session has expired/i);
  });

  it("falls back to a friendly default", () => {
    expect(mapAuthError("")).toMatch(/sign in failed/i);
    expect(mapAuthError(null)).toMatch(/sign in failed/i);
  });

  it("passes through unknown messages", () => {
    expect(mapAuthError("Something weird")).toBe("Something weird");
  });
});