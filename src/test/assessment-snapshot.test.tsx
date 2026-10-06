import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EditAssessmentPage from "@/pages/EditAssessmentPage";
const state = vi.hoisted(() => ({
  weights: { c1: 25, c2: 75 } as Record<string, number>, update: vi.fn(),
}));
vi.mock("@/hooks/useHazards", () => ({
  useHazards: () => ({ data: [], isLoading: false }),
  useConsequences: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/hooks/useAssessments", () => ({
  useAssessments: () => ({ data: [{ id: "old", title: "Historical", weights: state.weights, selected_hazards: ["h1"], probabilities: {h1: 2}, impacts: {h1: {c1: 4, c2: 0}} }], isLoading: false }),
  useUpdateAssessment: () => ({ mutateAsync: state.update, isPending: false }),
}));
// Current organization weights must never be read when reopening a saved assessment.
vi.mock("@/hooks/useConsequenceWeights", () => ({ useConsequenceWeightsMap: () => { throw new Error("Read current weights"); } }));
vi.mock("@/features/assessment/components/HazardSelectionStep", () => ({ HazardSelectionStep: () => null }));
vi.mock("@/features/assessment/components/ProbabilityStep", () => ({ ProbabilityStep: () => null }));
vi.mock("@/features/assessment/components/ImpactsStep", () => ({ ImpactsStep: () => null }));
vi.mock("@/features/assessment/components/ResultsStep", () => ({ ResultsStep: () => null }));
const open = () => render(<MemoryRouter initialEntries={["/assessments/old"]}><Routes><Route path="/assessments/:id" element={<EditAssessmentPage />} /><Route path="/dashboard" element={<p>Dashboard</p>} /></Routes></MemoryRouter>);
beforeEach(() => { state.weights = {c1: 25, c2: 75}; state.update.mockReset().mockResolvedValue({}); });
it("reopens and saves using the original snapshot without replacing it", async () => {
  open();
  for (let i = 0; i < 3; i++) {
    fireEvent.click(screen.getByRole("button", {name: "Next"}));
    await waitFor(() => expect(state.update).toHaveBeenCalledTimes(i + 1));
  }
  fireEvent.click(await screen.findByRole("button", {name: "Save Assessment"}));
  await waitFor(() => expect(state.update).toHaveBeenCalledWith(expect.objectContaining({total_risk: 2, status: "completed"})));
  for (const [payload] of state.update.mock.calls) expect(payload).not.toHaveProperty("weights");
});
it("does not silently recalculate legacy assessments with missing snapshots", () => {
  state.weights = {}; open();
  expect(screen.getByText("This assessment has no saved weights")).toBeInTheDocument();
  expect(screen.queryByRole("button", {name: "Next"})).not.toBeInTheDocument();
  expect(state.update).not.toHaveBeenCalled();
});
