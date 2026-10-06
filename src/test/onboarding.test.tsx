import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OnboardingPage from "@/pages/OnboardingPage";

const state = vi.hoisted(() => ({
  profile: { org_id: "org-a", role_title: null as string | null },
  navigate: vi.fn(),
}));
vi.mock("react-router-dom", async (original) => ({
  ...await original<typeof import("react-router-dom")>(), useNavigate: () => state.navigate,
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-a" } }) }));
vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({ data: state.profile, isLoading: false }),
  useUpdateProfile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({ data: { id: "org-a" } }),
  useCreateOrganization: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
beforeEach(() => { state.navigate.mockReset(); state.profile.role_title = null; });

it("resumes the profile step after organization creation or refresh", async () => {
  render(<MemoryRouter><OnboardingPage /></MemoryRouter>);
  expect(await screen.findByRole("button", { name: "Complete Setup" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  expect(state.navigate).not.toHaveBeenCalled();
});

it("redirects an already completed profile", async () => {
  state.profile.role_title = "Risk manager";
  render(<MemoryRouter><OnboardingPage /></MemoryRouter>);
  await waitFor(() => expect(state.navigate).toHaveBeenCalledWith("/dashboard", { replace: true }));
});
