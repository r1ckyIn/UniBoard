import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock Supabase client
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
    },
  }),
}));

import { useLogin, useRegister, useLogout } from "@/hooks/use-auth";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useLogin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls signInWithPassword with email and password", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: { access_token: "tok" } },
      error: null,
    });
    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({ email: "test@test.com", password: "pass123" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "test@test.com",
      password: "pass123",
    });
  });

  it("throws when signInWithPassword returns error", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: "Invalid credentials" },
    });
    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({ email: "bad@test.com", password: "wrong" });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useRegister", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls signUp with email, password, and display_name", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "123" } },
      error: null,
    });
    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({
      email: "new@test.com",
      password: "pass123",
      display_name: "Test User",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSignUp).toHaveBeenCalledWith({
      email: "new@test.com",
      password: "pass123",
      options: { data: { display_name: "Test User" } },
    });
  });

  it("throws when signUp returns error", async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: "Email taken" },
    });
    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({
      email: "dup@test.com",
      password: "pass",
      display_name: "Dup",
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useLogout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls signOut", async () => {
    mockSignOut.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("throws when signOut returns error", async () => {
    mockSignOut.mockResolvedValue({ error: { message: "Network error" } });
    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    });
    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
