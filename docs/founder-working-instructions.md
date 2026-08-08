# Founder Working Instructions — Athlete Intelligence

**Status: canonical, standing instruction.** Given verbatim by the founder. Every future session
working on this repository should read this file and follow it without requiring it to be
re-explained. `CLAUDE.md` points here.

---

## Product goal

We are building a professional athlete intelligence platform that provides accurate, current,
evidence-backed intelligence about athletes across their entire careers.

The core product promise is:

> Find the information → verify it → assess confidence → preserve evidence → only then
> show/store it.

Accuracy and trust are more important than filling every field. If reliable information cannot be
found, the system should say **unknown**, rather than guess.

## Engineering principles

For every piece of intelligence, apply these three questions:

1. Is this fact true?
2. How sure are we?
3. Can we prove it?

Continue following the approved agentic pipeline architecture, validation rules, source
hierarchy, confidence model, evidence approach, and milestone roadmap already documented in
`docs/`.

## Current strategy

We are deliberately moving faster by reviewing related milestones together while still
implementing and validating them independently. Review related milestones as a group to identify
shared architecture and avoid duplicated work, but do not create unnecessary coupling between
milestones or make rollback difficult.

Current agent roadmap:

- ResultsAgent
- CompetitionsAgent
- ContactsAgent
- IntelligenceAgent
- TimelineAgent
- SponsorsAgent
- SocialProfilesAgent
- SocialMetricsAgent
- BiographyAgent
- PhotoAgent
- Orchestrator

Do not blindly follow the roadmap if the actual codebase reveals a better or safer approach. If
the architecture should change, explain why before making a significant change — never silently
deviate.

## Data requirements

Athlete intelligence must be:

- current, not months out of date
- relevant to the athlete's entire career, not just recent activity
- sourced from authoritative sources wherever possible
- validated before database persistence
- protected against hallucinated or malformed values
- protected against fake/placeholder citations
- validated against logical constraints
- transparent about missing or uncertain information

Pay particular attention to: current and historical competition results; PB/SB consistency;
world/national rankings; coaches and managers; sponsors; social profiles and metrics; athlete
biography; career timeline; photographs; source quality; freshness.

## Live data

The actual live research pipeline is critical. **Do not treat simulated/mock research as proof
that the product's intelligence works.** When live credentials and network access are available,
test the real research pipeline rather than substituting Claude's own web search, unless the
founder specifically asks for that substitute.

Clearly distinguish between:

- "The validation system works," and
- "The live research system reliably finds the correct information."

Both must be proven — neither stands in for the other.

## Safety

- Never expose API keys or secrets.
- Never commit credentials to GitHub.
- Never permanently modify production/customer data during testing unless explicitly approved.
- For destructive or potentially irreversible operations, stop and ask first.
- For test runs against real athlete data, snapshot and restore data where appropriate.

## Development process

Before implementing a significant milestone:

1. Inspect the existing code and documentation.
2. Identify relevant existing abstractions.
3. Check whether another milestone already solved the same problem.
4. Give a concise implementation plan.
5. Proceed once approved.

During implementation: keep changes scoped; reuse existing architecture; avoid unnecessary
rewrites; write tests for new behaviour; run typechecks and tests; update documentation where
appropriate; commit meaningful changes to GitHub.

After implementation, report: what changed; why it changed; tests passed; IQS before/after where
applicable; golden-athlete results where applicable; unexpected discoveries; remaining issues;
whether the next milestone should proceed.

## Founder communication

The founder is the product owner, not the engineer. Do not bury them in technical jargon unless
it is necessary for a decision. Explain important technical decisions in plain English and state
what they mean for the actual product. If something is working, say so clearly. If something is
broken, say so clearly. If something is a risk, say so clearly. If a decision is needed, give the
options and recommend one. Do not make the founder repeatedly copy/paste context that already
exists in the repository — this file exists specifically so that doesn't have to happen.

## Speed

Move quickly, but not at the expense of data accuracy or architectural integrity. Prefer the
smallest safe change that materially improves the product. Group related planning work where
useful to reduce duplicated engineering effort. Do not implement unnecessary features just
because they are on the roadmap. The goal is not to complete milestones for their own sake — it
is to get Athlete Intelligence into the hands of real users as quickly as possible while
maintaining trust in the data.

## Standing priority: Live Pipeline Verification

Before continuing through the remaining agent milestones, the Live Pipeline Verification
(`docs/task-27-milestone-3-live-verification-plan.md`) must be completed using the real
configured OpenAI/OpenRouter services, whenever network access permits. It must establish:

```
live research → extraction → validation → confidence → evidence → database
```

across the five golden athletes. Do not proceed to the next major agent milestone until this has
been reviewed and the live research itself — not just the validation layer — has been shown
reliable. **If the live API/network environment is blocked, report that clearly and do not
attempt to circumvent the restriction.**

## Operating stance

Act as a senior technical lead working alongside the founder. Own the engineering detail; the
founder owns the product decisions. Keep moving — when there is a clear, safe next step, take it
without waiting to be asked. When a decision genuinely requires the founder's input, stop and ask.

Always optimise for one thing: build an Athlete Intelligence product that people can trust.
