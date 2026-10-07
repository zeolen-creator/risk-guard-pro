# Evidence-based risk tools

Open Analytics → **Research, scenarios & reports**, or `/risk-intelligence` while signed in. The existing application and assessments remain in place.

## What is included

- Planning scenarios with initiating events, consequences, capability gaps and assumptions.
- Qualitative risk outlooks with drivers, monitoring indicators and explicit uncertainty.
- Reports with executive and professional views and a Markdown download.
- Organization profile, explicitly selected assessments, uploaded publications/documents, and optional live online research.
- Saved drafts with source registers, evidence/inference/assumption labels, model and method versions, and creation dates.

The workflow accepts any industry and Canadian/US context. This is not validation for every industry. Source relevance, local applicability and important decisions require professional review. A citation register checks reference integrity, not whether every generated statement is true. No calibrated numerical forecasting model is supplied by this feature. Existing assessment scores are preserved.

## Research basis

The scenario structure draws on [Public Safety Canada's National Risk Profile methodology](https://www.publicsafety.gc.ca/cnt/mrgnc-mngmnt/ntnl-rsk-prfl/bckgrndr-mthdlgy-en.aspx): context, identification, analysis, evaluation and treatment, with plausible scenarios and explicit capability gaps. [FEMA's Identify and Assess Risk resources](https://preptoolkit.fema.gov/web/identify-assess-risk) inform the connection between threats, consequences and planning capability needs. These are methodological influences, not certifications or claims of compliance.

Implementation follows OpenAI's [web-search documentation](https://developers.openai.com/api/docs/guides/tools-web-search) and [file-input documentation](https://developers.openai.com/api/docs/guides/file-inputs). Sources were consulted on 6 October 2026.

## Evidence and privacy flow

1. The server authenticates the user, resolves their organization, and checks each selected record and storage path.
2. Optional online research receives only the public country, industry, region, topic, horizon and nominated publication links. Users can preview these fields. They must not put confidential information into that public brief.
3. A separate synthesis request sends the selected documents, profile, assessments and research to OpenAI, with no web-search tools attached. Uploaded content is treated as evidence, not instructions.
4. The server validates the structured response and references, then saves the draft. Unreadable or unused sources must be identified. Online search failures fail visibly rather than silently falling back to model knowledge.

Provider calls set `store: false`; this does not promise zero retention under provider policies. Database snapshots and results remain in the organization's Supabase project. All organization members can read its saved analyses. Client accounts cannot directly insert, update or delete these records. There is no approval workflow or retention/deletion UI in this version.

Online research uses actual provider citation annotations. It does not independently crawl or verify every citation. Nominated links may be unavailable; only retrieved citations enter the source register. Non-PDF embedded images and large spreadsheets can be partially parsed. Results must disclose relevant gaps.

## Limits

- Up to 3 documents: PDF, DOC/DOCX, XLS/XLSX, CSV, TXT or Markdown.
- Maximum 10 MB per AI document and 20 MB combined (the document library itself permits 50 MB uploads).
- Up to 5 selected assessments and 5 public HTTPS publication links.
- One active request per user and 20 requests per user per hour; failed requests count.
- Each provider call times out after 60 seconds. Abandoned requests expire after 5 minutes.
- Recent history displays the last 30 analyses; older records remain in the database.
- The shared HIRA tools default to `gpt-6-luna`, selected for high-volume, cost-sensitive research and structured tool calls. Configure `OPENAI_HIRA_MODEL` or `OPENAI_RESEARCH_MODEL` only with a model that supports the required Responses API, web search, and structured outputs. OpenAI API usage is billable.

## Deploy from the repository's PowerShell window

The Supabase project must already have `OPENAI_API_KEY` configured under Edge Function secrets. Never put that key in a `VITE_` variable, browser code, Git, or a chat message. Supabase supplies its normal server-side service credentials.

```powershell
npx supabase db push
npx supabase functions deploy risk-intelligence --project-ref knlusxozrktgcdyatpej
```

Review the migration list before accepting the database push. The evidence workflow adds `20261006200000_risk_intelligence.sql` and the upgraded AI tools add `20261006210000_modern_ai_tools.sql`. Do not repair or revert existing migration history just to suppress a mismatch.

For local use, run `npm run dev` and keep that terminal open. Visit `http://localhost:8080/risk-intelligence` and sign in. A deployed frontend needs its normal build/deployment; deploying the Edge Function does not publish the website.

## Acceptance checks

1. Upload a small, non-sensitive sample PDF with an identifiable fact and select it with a saved assessment.
2. Generate scenarios with online research disabled; verify that the document and assessment appear in the evidence register and no web research is claimed.
3. Enable online research with a narrow Canadian or US sector/location topic. Check actual links, dates, relevance, and any unavailable nominated publications.
4. Generate an outlook; verify that limited data is disclosed and no invented risk probabilities or confidence percentages appear.
5. Generate a report, switch executive/professional views, download it, then refresh to confirm persistence.
6. Verify that an account from another organization cannot read the saved analysis.

Automated coverage includes request/output validation, citation integrity, private/public request separation, authentication and organization ownership, provider failure handling, report rendering/export, and a PostgreSQL migration/RLS test. Live provider quality and deployed integration still require the acceptance checks above.

The new workflow uses `risk-intelligence`. Legacy `generate-scenarios` and `executive-summary` functions remain untouched for compatibility; the new UI does not depend on them. The former forecast panel now links to saved evidence-based outlooks; historical `risk_predictions` data is not deleted.
