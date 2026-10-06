import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Layer6ApprovalWorkflow } from "@/features/weighting/components/Layer6ApprovalWorkflow";
const state = vi.hoisted(() => ({
  admin: true, loading: false, accepted: true,
  rpc: vi.fn(), toast: vi.fn(), invalidate: vi.fn(),
  weights: { Fatalities: 20.25, Injuries: 0, Displacement: 9.75, Psychosocial_Impact: 10, Support_System_Impact: 10, Property_Damage: 10, Infrastructure_Impact: 10, Environmental_Damage: 10, Economic_Impact: 10, Reputational_Impact: 10 },
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: state.invalidate }) }));
vi.mock("@/hooks/useUserRole", () => ({ useIsAdmin: () => ({ isAdmin: state.admin, isLoading: false }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: state.toast }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: state.rpc } }));
vi.mock("@/hooks/useWeightingSynthesis", () => ({ useWeightingSynthesis: () => ({ isLoading: state.loading, data: { weights: state.weights, accepted: state.accepted, approved: false }, refetch: vi.fn() }) }));
beforeEach(() => {
  vi.clearAllMocks(); state.admin = true; state.loading = false; state.accepted = true;
  state.rpc.mockResolvedValue({ data: 2, error: null });
});
it("loads persisted decimal and zero recommendations and approves that exact reviewed set", async () => {
  render(<Layer6ApprovalWorkflow sessionId="saved-session" />);
  expect(screen.getByText("20.25%")).toBeInTheDocument();
  expect(screen.getByText("0.00%")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Approve.*Activate/i }));
  await waitFor(() => expect(state.rpc).toHaveBeenCalledWith("approve_weighting_session", {
    p_session_id: "saved-session", p_expected_weights: state.weights, p_notes: "",
  }));
  await waitFor(() => expect(state.invalidate).toHaveBeenCalledWith({ queryKey: ["consequence-weights"] }));
});
it.each(["admin", "accepted"] as const)("blocks approval when %s is false", key => {
  state[key] = false;
  render(<Layer6ApprovalWorkflow sessionId="saved-session" />);
  expect(screen.getByRole("button", { name: /Approve.*Activate/i })).toBeDisabled();
  expect(state.rpc).not.toHaveBeenCalled();
});
it("shows a failure without reporting completion", async () => {
  state.rpc.mockResolvedValue({ error: new Error("Recommendations changed") });
  const onComplete = vi.fn();
  render(<Layer6ApprovalWorkflow sessionId="saved-session" onComplete={onComplete} />);
  fireEvent.click(screen.getByRole("button", { name: /Approve.*Activate/i }));
  await waitFor(() => expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Approval failed" })));
  expect(onComplete).not.toHaveBeenCalled();
});
