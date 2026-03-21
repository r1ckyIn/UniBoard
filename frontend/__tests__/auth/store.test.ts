import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/lib/auth/store";

const mockUser = {
  id: "usr_001",
  email: "test@sydney.edu.au",
  displayName: "Test User",
};

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("has correct initial state", () => {
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.tokenConfigured).toBe(false);
  });

  it("setAuth sets tokens, user, and isAuthenticated", () => {
    useAuthStore
      .getState()
      .setAuth({ access: "access_123", refresh: "refresh_456" }, mockUser);

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("access_123");
    expect(state.refreshToken).toBe("refresh_456");
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it("clearAuth resets all state to initial values", () => {
    // Set auth first
    useAuthStore
      .getState()
      .setAuth({ access: "access_123", refresh: "refresh_456" }, mockUser);
    useAuthStore.getState().setTokenConfigured(true);

    // Clear
    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.tokenConfigured).toBe(false);
  });

  it("setTokenConfigured toggles tokenConfigured state", () => {
    expect(useAuthStore.getState().tokenConfigured).toBe(false);

    useAuthStore.getState().setTokenConfigured(true);
    expect(useAuthStore.getState().tokenConfigured).toBe(true);

    useAuthStore.getState().setTokenConfigured(false);
    expect(useAuthStore.getState().tokenConfigured).toBe(false);
  });

  it("persist middleware uses 'uniboard-auth' storage key", () => {
    // Access the persist API to check the storage key name
    const persistOptions = useAuthStore.persist.getOptions();
    expect(persistOptions.name).toBe("uniboard-auth");
  });
});
