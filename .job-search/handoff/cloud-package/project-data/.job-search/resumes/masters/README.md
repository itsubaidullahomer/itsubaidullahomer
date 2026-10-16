# Private resume masters

These masters use the current portfolio and the October 14, 2026 FlowCV export. Original PDFs are preserved. All employment, product and metric claims remain candidate-reported; no independent verification is implied.

- `facts.json`: editable source of truth, stable fact IDs, source provenance, discrepancies and excluded claims.
- `build_resumes.py`: reproducible one-page ATS and one-page outreach PDF renderer.
- `ubaidullah-omer-master.md`: generated editable text mirror of the selected master content.
- `tailor.example.json`: a selection-only job-specific variant. It may reorder/select known projects and bullets, and choose `ai_product`, `full_stack`, or `frontend` positioning. It cannot add new claims or employer history.

## Build

From the repository root:

```sh
/Users/ubaidullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 .job-search/resumes/masters/build_resumes.py
```

For a variant, copy and edit the example configuration, then run:

```sh
/Users/ubaidullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 .job-search/resumes/masters/build_resumes.py --config .job-search/resumes/masters/tailor.example.json
```

Outputs are written to ignored `output/pdf/`, including extracted text for ATS inspection. The script checks one-page length, searchable identity/contact/dates, known unsupported claims and link presence. It fails when a paragraph would exceed the safe page area. Always render and visually inspect a tailored PDF before use; passing extraction checks does not prove layout quality.

## Truthfulness and confirmation

Education is intentionally omitted: the candidate confirmed no degree. Immediate availability was also confirmed by the candidate. The two employment date ranges overlap in the supplied resume; preserve them without inventing an explanation. Illume project dates disagree between sources, so project dates are omitted. Current portfolio leadership wording is used for Tututor; the historical resume is not rewritten. Do not add salary expectations, visa/work authorization, degree completion, dates, skill levels or metrics without evidence from the candidate. Source details and exclusions are in `facts.json`.

The outreach proof strip repeats three sourced Tututor facts (eight products, 20k+ users across the listed groups, three released mobile apps). Tailoring never converts these into independently verified metrics.
