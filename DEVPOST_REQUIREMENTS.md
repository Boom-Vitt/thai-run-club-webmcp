# The WebMCP Challenge — Requirements and Compliance Checklist

This is the project-local operational checklist for the hackathon. It was captured from the authenticated Devpost MCP data on 2026-09-02 around 18:54 Asia/Bangkok. It is not a substitute for the [official rules](https://webmcp.devpost.com/rules); live Devpost data and the official website prevail if anything changes or conflicts.

## Critical dates

- Submission closes: 2026-09-03 13:00 Pacific Time = 2026-09-04 03:00 Asia/Bangkok.
- Judging: 2026-09-04 10:00 PT through 2026-09-21 17:00 PT.
- Winners announced: around 2026-09-23 14:00 PT.
- After the submission deadline, do not change the Devpost entry, submitted repo, live site, video, or team until winners are announced. Use a separate fork for continued development.

## Eligibility gate

- [ ] Entrant is at least the age of majority in their country of residence.
- [ ] Every individual/team member and any organization is based in a country or territory supported by OpenAI API services and is not excluded by the official rules.
- [ ] A team or organization has one eligible, authorized Representative.
- [ ] No entrant, judge, promotion entity, affiliate, or household relationship creates a prohibited conflict of interest.
- [ ] Rules are explicitly acknowledged in the local Devpost workflow. Current state must be read from `.devpost-hackathon-state.json`; do not infer acknowledgment.

## What the project must be

- [ ] A WebMCP-powered web application where people and agents can interact, collaborate, or create together.
- [ ] WebMCP is central to the user workflow, not a decorative wrapper.
- [ ] The application is installed/deployed, runs consistently, and behaves as shown in the description and demo.
- [ ] A pre-existing project is meaningfully extended with WebMCP after 2026-08-25 11:00 PT.
- [ ] If pre-existing, the README and Devpost description clearly separate previous work from new work using dated commits or equivalent evidence.
- [ ] All third-party APIs, SDKs, datasets, assets, trademarks, music, and other materials are authorized and comply with their licenses.
- [ ] The submission is original, owned by the entrant/team/organization, and does not violate IP, privacy, publicity, or other rights.
- [ ] The project and submitted materials contain no malicious code.

## Required submission package

- [ ] Working live URL accessible in ChatGPT's in-app browser or Google Chrome 149+ with WebMCP enabled.
- [ ] WebMCP tools work end to end in a supported browser with a real agent/client.
- [ ] If authentication is required, working judge credentials and concise testing instructions are supplied.
- [ ] Project remains available free of charge for judging through the end of the judging period.
- [ ] Public GitHub, GitLab, or Bitbucket repository contains all source, assets, setup, and run instructions.
- [ ] Repository includes a complete open-source license detectable on the repository landing page.
- [ ] Public YouTube demo is under three minutes, has narration/audio, shows the working project, and explains how WebMCP is used.
- [ ] Video contains no unauthorized copyrighted music, trademarks, or other third-party material.
- [ ] Written description explains: why WebMCP fits; how the user experience improves; what people and agents can now do together; and how WebMCP was implemented.
- [ ] Submission answers all required fields: submitter type, countries, app status, live URL, public repo, tested agents/clients, AI tools used, learning level, and career value.
- [ ] All submission materials are in English or include complete English translations.
- [ ] Every teammate is added and has accepted before the deadline.
- [ ] Devpost entry is actually submitted, not left as a draft.

## Judging optimization — equally weighted

- [ ] **WebMCP Leverage:** working, non-trivial, skillful WebMCP implementation is visible in code and demo.
- [ ] **Execution:** coherent end-to-end product experience, not only a technical proof of concept.
- [ ] **Potential Impact:** credible, specific problem and real audience; the demo proves the solution addresses it.
- [ ] **Creativity & Ambition:** concept and interaction model are meaningfully distinct from existing products.

Tie-break priority follows the listed order, so WebMCP Leverage is the first optimization target.

## Evidence required before calling an item compliant

- Live URL: fresh-session browser test plus one complete agent-driven task.
- Repo: logged-out/incognito visibility check, license visibility, and clean setup test.
- WebMCP: registered tool names, schemas, execution results, error handling, and browser/client tested.
- Demo: final public YouTube URL, runtime below 03:00, audible narration, and working flow visible in the first 10–15 seconds.
- Description: direct answers to the four required WebMCP questions with no unsupported claims.
- Existing work: dated commits and an explicit before/after section.
- Submission: live Devpost confirmation showing it is submitted rather than draft.

## Continuous compliance log

At every meaningful implementation milestone, append a short dated entry containing:

1. What changed.
2. Which checklist items it supports.
3. Evidence inspected or produced.
4. Any new risk, missing requirement, or deadline concern.

Do not mark an item complete based only on intention or code review; require runnable or externally visible evidence where applicable.

