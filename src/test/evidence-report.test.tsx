import { expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EvidenceReport, reportMarkdown } from "@/features/intelligence/EvidenceReport";
import type { EvidenceRun } from "../../supabase/functions/_shared/risk-evidence";
const run: EvidenceRun = {
  id: "run-1", org_id: "org", created_by: "user", kind: "outlook", status: "completed", created_at: "2026-10-06T12:00:00Z", completed_at: "2026-10-06T12:01:00Z", model: "test", method_version: "test",
  request: { kind: "outlook", country: "USA", sector: "Manufacturing", region: "New York", topic: "Power loss", horizon_months: 12, online_research: true, source_urls: [], document_ids: [], assessment_ids: [] },
  sources: [{ id: "W1", kind: "web", title: "FEMA evidence", url: "https://www.fema.gov/", retrieved_at: "2026-10-06T12:00:00Z" }], research_text: null, error_message: null,
  output: { title: "Power outlook", executive_summary: [{ text: "Backup arrangements warrant review.", basis: "inference", source_ids: ["W1"] }], sections: [{ heading: "Professional detail", findings: [] }], scenarios: [], outlooks: [{ hazard: "Power loss", direction: "uncertain", drivers: ["Insufficient local data"], monitoring_indicators: ["Local outage duration"], uncertainty: "No local history", source_ids: ["W1"] }], actions: [], assumptions: [], evidence_gaps: ["No site history"], source_notes: [{ source_id: "W1", status: "used", note: "Planning context only" }] },
};
it("provides distinct reader views with traceable sources and uncertainty", () => {
  render(<MemoryRouter><EvidenceReport run={run} /></MemoryRouter>);
  expect(screen.getByText("Backup arrangements warrant review.")).toBeInTheDocument();
  expect(screen.queryByText("Professional detail")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "FEMA evidence" })).toHaveAttribute("href", "https://www.fema.gov/");
  fireEvent.click(screen.getByRole("button", { name: "Professional analysis" }));
  expect(screen.getByText("Professional detail")).toBeInTheDocument();
  expect(screen.getByText("uncertain")).toBeInTheDocument();
  expect(screen.getByText(/No local history/)).toBeInTheDocument();
});
it("exports both audiences, citations, provenance and data gaps", () => {
  const exported = reportMarkdown(run);
  for (const required of ["Executive brief", "Professional detail", "[W1]", "https://www.fema.gov/", "No site history", "human review", "not a calibrated"]) expect(exported).toContain(required);
});
