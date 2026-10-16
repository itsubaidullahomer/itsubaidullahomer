# Eight tailored ATS resumes

All eight are one-page A4, single-column, searchable PDFs. Each has an editable fact-selection config and Markdown source. Every page was rendered and visually inspected. Employment dates, contact details and selected factual statements passed extraction checks. No education or unsupported skill claims were added.

The private manifest maps exact job IDs to PDF paths, hashes, current JD/source hashes and check times, source facts, tailoring rationale, blockers and QA results. It is ready for per-job document-library upload; application readiness remains false.

| Employer | Focus | Searchable words | PDF |
|---|---|---:|---|
| Agave | Full-Stack Software Engineer | 345 | ubaidullah-omer-agave-full-stack-ats.pdf |
| Finni Health | Full-Stack Software Developer 2 | 353 | ubaidullah-omer-finni-health-full-stack-ats.pdf |
| FurtherAI | Frontend Engineer - Web | 348 | ubaidullah-omer-furtherai-frontend-ats.pdf |
| Simple AI | Founding Software Engineer | 322 | ubaidullah-omer-simple-ai-founding-engineer-ats.pdf |
| Zoftify | Frontend Developer (React) | 334 | ubaidullah-omer-zoftify-frontend-ats.pdf |
| EventMobi | Front End Engineer - Remote | 349 | ubaidullah-omer-eventmobi-frontend-ats.pdf |
| Metabase | Software Engineer (Frontend) | 307 | ubaidullah-omer-metabase-frontend-ats.pdf |
| Whippy | Software Engineer: Frontend | 349 | ubaidullah-omer-whippy-frontend-ats.pdf |

Rebuild with the bundled Python runtime: `.job-search/resumes/tailored/build_tailored.py`. This imports the existing ATS renderer and selects only established facts. It preserves the master PDFs, source facts and renderer. The Metabase wrapper additionally displays the exact Illume stack already present in facts.json; it introduces no new skill claim. Re-render and visually inspect after any rebuild; the script resets visual-QA state to pending.

Tether is intentionally excluded. No uploads, messages or applications occurred.
