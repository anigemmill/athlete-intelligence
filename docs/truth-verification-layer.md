# Truth Verification Layer — Architectural Design

**Status:** Design only — not implemented. Nothing in this document should be built without a separate, explicit decision to proceed.
**Relationship to Task #27:** Extends, does not replace, `docs/task-27-agentic-pipeline.md` §5 (Evidence Layer) and §7 (Confidence). Where this document and that one appear to disagree, see §6 below — the disagreement is resolved there, not left standing.
**Why now:** The Intelligence Audit tool (`artifacts/api-server/src/lib/pipeline/auditReport.ts`) already states its own limit explicitly: it can verify data *quality* — format, staleness, internal consistency, live link resolution — but not whether a stored fact is *true*, without either a human or a second independent research call. This document designs that second call.

---

## 1. The Core Question, Answered Directly

Not every fact an athlete-intelligence pipeline retrieves carries the same risk if it's wrong. The question this layer answers is not "how confident is the model" — that's already handled by the existing confidence engine (`pipeline/confidence.ts`). The question is **structural**: for this *kind* of fact, is a single source ever sufficient, or does the claim itself demand independent agreement before it's allowed to exist in the database at all?

Three tiers, and the reasoning behind each, follow. The full fact-by-fact table is §3; §2 explains the axes the table is built on, because the tiering is not arbitrary and should not be extended by guesswork later without applying the same reasoning.

---

## 2. The Two Axes That Determine a Fact's Tier

Every fact type is placed by weighing two independent questions, not one:

**A. Cost of being wrong.** Not "is this embarrassing" but "does a real person or organisation act on this claim, and does acting on a wrong version cause harm that outlives the next crawl cycle." A wrong follower count is forgotten in six hours. A wrong "current agent" name is a phone call someone actually makes to the wrong person.

**B. Corroboration feasibility.** Not every high-stakes fact is hard to corroborate, and not every easy-to-corroborate fact is low-stakes — treating tiering as a single "importance" scale produces wrong answers. An Olympic 800m final result is about as high-stakes as this platform handles, *and* it is trivially corroborated — dozens of outlets report it within hours. A domestic-level coach's name is comparatively low-stakes to get wrong for the platform's optics, but is often reported by exactly one source ever, if any — corroboration may simply never arrive.

The tier a fact receives is the answer to: **is the cost of being wrong high, and is single-source claiming structurally likely to be wrong or unverifiable for this kind of fact** — not cost alone, not feasibility alone.

This is why, in §3, Olympic/World Championship results sit at Tier 2 rather than Tier 3 despite being high-visibility: corroboration is cheap and reliable for them, so *requiring* it costs almost nothing and buys real protection — but *blocking indefinitely* on it (Tier 3's behaviour, §5) would be the wrong failure mode for a fact type that's rarely genuinely stuck.

---

## 3. The Fact Classification

### Tier 1 — Accepted directly from a single pipeline pass

No corroboration required. The existing per-agent confidence engine (domain tier, presence of a source URL) is the only gate. Reasoning given per group, not per field, where the reasoning is shared.

| Fact | Why Tier 1 is sufficient |
|---|---|
| Sport, event/discipline | Already gated once at creation by `IdentityAgent`'s 70% confidence threshold (docs/task-27-agentic-pipeline.md §4.0); near-zero real-world ambiguity once an athlete is correctly identified; wrong values self-correct on the next crawl at negligible cost. |
| Nationality | Same reasoning. Genuine dual-nationality/federation-switch cases exist but are rare and low-harm to state provisionally — see §7 for the "the source itself hedges" escalation rule, which still applies even at Tier 1. |
| Age / birth date | Rarely disputed in public sources; wrong-by-one-year is common noise, not a claim anyone acts on. |
| Profile photo (`avatar_url`) | Lowest-harm field in the schema — worst case is a stale or wrong image, already independently checked for live resolution by the Intelligence Audit tool. Trivially correctable via a targeted re-fetch (`POST /athletes/:id/refresh-photo`, per the roadmap). |
| Social handles (format-validated) | The platform's own profile page is already the Tier-1 source for its own handle (`sourceHierarchy.ts`'s `social` fact domain) — the strongest possible single source for this specific claim, by construction. |
| Follower counts | Numeric, perishable, near-zero downstream consequence if off by a margin. Escalate only if a specific future feature prices or ranks athletes by follower count (§8, out of scope today). |
| General media coverage / interview items (`intelligence_items`, category `media_interviews`) | Informational, not decision-bearing; a wrong headline clutters the feed rather than misleading a funding or contact decision. Existing per-item confidence + domain-authority scoring already discounts weak sourcing. |
| Historical timeline events sourced from a tier-1/tier-2 domain | A well-attributed past event ("competed at the 2016 Olympics," sourced from `olympics.com`) carries its own corroboration for free — the domain *is* the record of the event, not a claim about it. Events sourced from tier-3/tier-4 domains do **not** get this pass — see Tier 2. |

### Tier 2 — Requires corroboration for full confidence; storable provisionally at reduced confidence if uncorroborated

The fact is not blocked from being written, but it is **not allowed to reach full confidence, and is explicitly flagged as single-source**, until a second, independent source agrees (§4 defines "independent"). If corroboration never arrives, the fact remains stored, visibly discounted — this is a confidence-decay gate, not a storage gate.

| Fact | Why single-source is not enough | What corroboration looks like |
|---|---|---|
| World rank / national rank | A national federation may make real funding/selection decisions informed by this platform. Ranking systems genuinely disagree by source and lag in publishing; an agent can also misread a seeding position as a rank. | A second, differently-framed query, or agreement between the stated rank and an independently-retrieved specific result that implies the same standing (e.g. a Diamond League placing consistent with the claimed rank). |
| Personal best / season best (**restating an already-established mark**) | Documented, real bug class (`docs/technical-debt.md` Priority 2) — an LLM can conflate a placement with a mark, or misattribute an SB to the PB field. | Cross-check against the sport-aware comparator (already built, `validation.ts`) *plus* a second source stating the same mark. Agreement from the comparator alone is necessary but not sufficient — it only proves internal consistency, not truth. |
| Competition results (specific placement/time at a named meet) | Visible, easily-checked-by-a-human claims; moderate stakes, moderate corroboration difficulty for anything below Olympic/Worlds tier. | A second source citing the same meet, or the result matching a structured results feed if one is ever integrated (§8). |
| Olympic / World Championship results specifically | Highest visibility of any fact type — but almost always over-determined by many independent outlets within hours. Requiring corroboration here costs little because it is almost never actually a bottleneck. | Any second outlet reporting the same placement — this is usually free, which is exactly why it is Tier 2, not Tier 1: the cost of requiring it is near zero, so there is no reason not to. |
| Historical timeline events sourced from a tier-3/tier-4 domain only | The domain itself doesn't function as the record here (unlike the Tier-1 case above) — it's a claim *about* an event, from a weaker source. | A second mention of the same event, from any domain tier, or promotion to Tier 1 if a tier-1/tier-2 source is later found for the same event. |
| Sponsorship mentioned as historical / past | Moderate reputational stakes for the named brand, but lower than an active-relationship claim (see Tier 3). | Agreement between `SponsorsAgent`'s dedicated query and any `IntelligenceAgent` media mention of the same deal — the exact case already anticipated in §7.3 of the agentic-pipeline doc. |

### Tier 3 — Never stored at all unless two independent sources agree

The fact is held as an **unpublished candidate** (§5) until corroboration succeeds. It is never shown to a user, never counted in any completeness metric, and never contributes to IQS, while unconfirmed. This is a hard storage gate, not a confidence discount.

| Fact | Why single-source is unacceptable here |
|---|---|
| **The binding of a real named person to a real role** — "X is currently Y's coach / manager / agent" | The single highest-risk fact type in the schema. This is not "a stat might be wrong" — a client acting on this data may actually contact the named person. Misattributing a role to a real, identifiable individual who has nothing to do with the athlete is a distinct kind of harm from a wrong number: it involves a third party who never consented to being named, and a plausible-sounding but wrong name is exactly the failure mode LLM extraction is most prone to. *(Note: the mere fact that "a coach exists" — i.e. the coaching relationship category itself, unattributed to a specific name — can be recorded at Tier 2 confidence; it is specifically the name-to-role binding that requires Tier 3.)* |
| Sponsorship presented as **current / active** | A claim that a real, named brand *currently* sponsors this athlete is a commercial claim about a third party, not just about the athlete — publishing a wrong one is closer to a factual assertion about a company than a sports statistic. Historical sponsorship claims stay at Tier 2 (above); only present-tense claims escalate. |
| Career changes: retirement, active team/squad change, "no longer competing" | Definitive, binary, high-visibility claims that are exactly the kind of thing a journalist, a rival federation, or the athlete's own team would notice and react to if wrong. Unlike an Olympic result, these are often *not* over-determined by many outlets, especially for lower-profile athletes — the platform must be willing to simply not know yet, rather than guess. |
| **New** personal-best / national-record claims specifically | Distinct from *restating* an already-known mark (Tier 2, above). Announcing that an athlete has just broken their own record is the single most likely claim on this platform to be quoted or repeated elsewhere if true — and the most damaging to get wrong, because "new record" is an unambiguous, checkable, high-visibility assertion with no hedge room. The existing PB/SB comparator can prove a claimed new mark is *at least internally consistent* (not slower than the alleged old PB) — it cannot prove the claim is *true*, which is exactly the gap this tier exists to close. |

**Explicitly not covered by this layer — derived/computed fields.** `world_rank_delta`, `follower_growth_30d`, `avg_engagement`, result-completeness percentages, and IQS itself are computed from already-classified inputs. They inherit whatever tier their inputs were verified at; this layer does not re-verify arithmetic performed on already-accepted facts.

---

## 4. What "Independent" Actually Means

This is the part most likely to be built wrong if left implicit, so it is stated as a rule, not a vibe: **two citations are not two sources.**

A second Perplexity call, phrased differently, that happens to surface the same underlying article — or two different articles that both originated from the same wire-service feed — is **not** independent corroboration. It is the same source, sampled twice, and correlated errors (a wire error that propagates to twenty outlets) are exactly the failure mode corroboration is supposed to catch.

Two evidence records corroborate a fact only if they differ in **at least one** of:

1. **Source domain** — not just a different URL on the same domain.
2. **Retrieval method** — a different agent, a differently-framed query, or (ideally, see §8) a different underlying provider entirely.
3. **Original publication** — two outlets independently reporting the same wire-service story do not count; the test is whether the *reporting*, not just the URL, is independent.

**Free corroboration** is the cheapest and most reliable case, and should always be checked first before spending a second live query: if any *other* agent, in the same crawl cycle or a prior one, already produced a matching claim as a byproduct of its own work (e.g. `IntelligenceAgent`'s media pass happens to name the same coach `ContactsAgent` found independently), that is genuine independence at zero marginal cost — this is exactly the mechanism §7.3 of the agentic-pipeline doc already anticipates for sponsorships, generalised here to every Tier 2/3 fact.

**Paid corroboration** — a deliberate second query, framed differently, specifically to attempt corroboration — is only spent when free corroboration doesn't already exist, and only for Tier 2/3 facts. Spending it on Tier 1 facts would be pure waste.

---

## 5. Storage and Visibility Model

Every Tier 2/3 fact carries an explicit verification status, not just a confidence number:

- **`unverified`** — a Tier 3 candidate with zero corroboration attempts yet, or a failed attempt. Never shown to any user. Not counted anywhere.
- **`single_source`** — the default resting state for a Tier 2 fact that hasn't been corroborated (yet, or ever). Shown, but at reduced confidence and explicitly labelled as single-source wherever the UI surfaces confidence — this is a new, more specific state than the current schema's generic confidence number, which cannot currently distinguish "one weak source" from "one source, never checked for a second."
- **`corroborated`** — two independent sources agree. Receives the existing +3 corroboration boost (`confidence.ts` §7.3) as before — this design does not change that mechanism, it gives it a formal trigger condition instead of an implicit one.
- **`contested`** — two sources were found and they **disagree**. This is the case the current design has no answer for, and it must never be resolved by picking a side automatically (e.g. "trust the higher-tier domain" is a reasonable tie-break for confidence *scoring*, but is not the same as truth, and applying it silently here would quietly launder a genuine disagreement into a false appearance of certainty). A contested Tier 2 fact is stored at floor confidence with a visible "disputed" flag; a contested Tier 3 fact is **not stored at all** and is surfaced only in admin/audit tooling as a known unresolved conflict, alongside both candidate values and their sources, for a human to adjudicate.

**Where unpublished Tier 3 candidates live.** Not the product tables (`intelligence_items`, `contacts`, etc.) — those remain "clean," matching the existing evidence-layer principle that the clean tables never hold unvalidated data. Not `evidence_log` either, since that table is an append-only audit trail of raw output, not a working queue. This design calls for a third category the current schema doesn't yet have a home for: a small, explicitly-named holding area for facts that have cleared basic per-agent confidence but not independent corroboration — visible to admin/audit tooling (so the Intelligence Audit tool can report "N pending unconfirmed candidates" as a real, distinct metric from "N gaps"), invisible everywhere a real user looks.

**Retry policy for candidates that never corroborate.** A Tier 3 candidate should not be retried forever at full priority, nor silently dropped forever — both are wrong. A bounded number of corroboration attempts across subsequent crawl cycles (mirroring the existing per-agent circuit-breaker pattern in §9.1 of the agentic-pipeline doc), after which the candidate becomes a permanent, admin-visible "never corroborated" record rather than disappearing. This preserves the work already done to find it, and gives a human the option to manually promote it — but the platform itself never promotes an uncorroborated Tier 3 claim on its own.

---

## 6. Reconciling With the Existing Confidence Design

`docs/task-27-agentic-pipeline.md` §7.3 already describes a corroboration boost: two agents agreeing gets +3 confidence, capped at 97. Read alongside this document, that mechanism was designed as a **bonus for Tier 1 facts that happen to get corroborated anyway** — a nice-to-have quality signal, not a gate. This document does not change that behaviour for Tier 1.

What's new here is that for **Tier 2 and Tier 3 facts, corroboration stops being a bonus and becomes a requirement** — the difference between "this fact is a little more trustworthy because two sources agree" and "this fact is not allowed to exist yet because only one source has been found." Implementing this layer means the same underlying corroboration-detection logic (§4) feeds two different consumers: a confidence adjustment (unchanged, Tier 1) and a storage gate (new, Tier 2/3).

---

## 7. One Escalation Rule That Applies Regardless of Tier

If the source material itself expresses uncertainty — "reportedly," "according to unconfirmed reports," "sources suggest" — the fact is treated one tier stricter than its default classification, regardless of which tier it started at. A Tier 1 fact hedged this way behaves like Tier 2; a Tier 2 fact hedged this way behaves like Tier 3. This is not a new mechanism to build, only a rule for how agents should classify what they've already retrieved — the research prompt already asks agents to search for citable, current information, so surfacing hedge language it encounters is a labelling task, not a new capability.

---

## 8. Explicitly Out of Scope (Named, Not Silently Dropped)

- **Cross-provider independence.** The strongest version of "independent source" uses two genuinely different retrieval providers (e.g. Perplexity plus a structured federation/registry API), not two differently-phrased queries against the same provider. Today's stack has one live search provider (Perplexity via OpenRouter); §4's definition of independence is the best achievable bar with the current architecture, not the ideal one. Adding a second, structurally different provider (a governing-body results API, for instance) is a future upgrade to *what counts as independent*, not a change to this document's tiering.
- **Human-in-the-loop adjudication UI** for `contested` facts. This document says such facts must surface to a human, not how that review screen works.
- **Follower-count-based pricing/ranking features**, which would retroactively raise that fact type's tier if ever built (§3's Tier 1 entry for follower counts is conditioned on today's usage, not a permanent classification).
- **Any implementation** — schema, agent code, orchestrator wiring. This is a design document only, per the request that produced it.
