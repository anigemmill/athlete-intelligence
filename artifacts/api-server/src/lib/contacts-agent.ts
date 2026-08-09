/**
 * contacts-agent.ts
 *
 * ContactsAgent (M5) — coaching staff, managers/agents, relevant
 * representation, and (narrowly — a real named contact person, not
 * brand-deal tracking, which is SponsorsAgent's separate future job)
 * sponsorship-relations contacts. Runs the "2-query strategy (coaching +
 * management separately)" described in docs/roadmap.md, each with its own
 * research pass and its own extraction call.
 *
 * The goal is accurate contact intelligence, not a full contact table.
 * GPT is explicitly told not to infer or guess a plausible-sounding name —
 * a contact is only extracted when the research states one directly. A
 * blank/"Unknown" name or org, or a confidence below MIN_CONTACT_CONFIDENCE
 * after domain-authority adjustment, is dropped rather than stored.
 * sourceDomain is cross-checked against that query's own real citation
 * hostnames (resolveStandaloneDomain) — a claimed domain that isn't
 * actually one of the sources found is downgraded to "unknown", not
 * trusted at face value.
 *
 * "No evidence found" and "evidence that no such contact exists" (e.g. an
 * athlete explicitly reported as self-coached or unsigned) are different
 * findings, and conflating them into silence would make a future retry
 * indistinguishable from a confirmed absence. Both are returned in
 * `findings` and logged. The contacts table itself has no column to record
 * "checked, confirmed none" at the athlete level — surfacing that
 * distinction in the product (vs. only in logs) would need a schema
 * change, which is out of scope for M5.
 */

import { openai } from "@workspace/integrations-openai-ai-server";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { logger } from "./logger.js";
import { resolveStandaloneDomain, isUsableContact, adjustConfidenceByDomain } from "./source-validation.js";

interface AthleteStub {
  id: number;
  name: string;
  sport: string;
  event: string;
  nationality: string;
  age?: number | null;
}

export interface ContactRow {
  role: string;
  category: "management" | "coaching" | "medical" | "media" | "sponsorship";
  name: string;
  org: string;
  orgType: string | null;
  status: "verified" | "unconfirmed";
  confidence: number;
  publicEmail: string | null;
  website: string | null;
  note: string | null;
  lastVerified: string;
  dateDiscovered: string;
  sourceDomain: string;
  sourceExcerpt: string | null;
}

export interface ContactFinding {
  scope: "coaching" | "representation";
  status: "confirmed_absent" | "no_evidence";
  note: string;
}

export interface ContactsAgentResult {
  contacts: ContactRow[];
  findings: ContactFinding[];
}

/** Minimum confidence, after domain-authority adjustment, to store a contact. */
const MIN_CONTACT_CONFIDENCE = 70;

type ContactScope = "coaching" | "representation";

const SCOPE_FOCUS: Record<ContactScope, string> = {
  coaching: "their head coach, any assistant coaches, and any medical/physio staff (team doctor, physiotherapist) publicly named in connection with them",
  representation: "their manager or agent, and any specific named sponsorship/brand-relations contact person (not sponsor companies themselves — an actual person's name, only if one is publicly reported)",
};

async function researchContacts(
  athlete: AthleteStub,
  scope: ContactScope,
): Promise<{ research: string; citations: string[] }> {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  try {
    const response = await openrouter.chat.completions.create({
      model: "perplexity/sonar",
      max_tokens: 3072,
      messages: [
        {
          role: "system",
          content: `You are a sports intelligence researcher verifying named professional contacts for an athlete. Only report a name if it is explicitly stated in a real source — never guess or infer a name from context or typical team structures. If there is explicit evidence the athlete does NOT have this kind of representation, say so directly. Today's date is ${today}. Never fabricate information.`,
        },
        {
          role: "user",
          content: `Research ${athlete.name} (${athlete.sport} — ${athlete.event}, ${athlete.nationality}): ${SCOPE_FOCUS[scope]}

For each person found, give: their full name, their exact role/title, the organisation they represent (team, agency, federation, brand), and a short quote or close paraphrase from the source that states this. If you find explicit evidence that ${athlete.name} does NOT have this kind of representation (e.g. reported as "self-coached", "not currently signed with an agency", "manages his own career"), state that explicitly and clearly. If you genuinely cannot find anything either way — no name, and no statement of absence — say that too. Do not guess a plausible name to fill the gap.

Cite your sources.`,
        },
      ],
    });
    const message = response.choices[0]?.message as any;
    const research = message?.content ?? "";
    const citations: string[] = Array.isArray(message?.annotations)
      ? message.annotations
          .filter((a: any) => a?.type === "url_citation" && typeof a?.url_citation?.url === "string")
          .map((a: any) => a.url_citation.url as string)
      : [];
    logger.info(
      { athleteId: athlete.id, name: athlete.name, scope, length: research.length, citationCount: citations.length },
      "contacts-agent: research complete",
    );
    return { research, citations };
  } catch (err) {
    logger.warn(
      { err, athleteId: athlete.id, name: athlete.name, scope },
      "contacts-agent: research failed — skipping this scope this run",
    );
    return { research: "", citations: [] };
  }
}

function buildSystemPrompt(scope: ContactScope): string {
  const categories = scope === "coaching" ? `"coaching" or "medical"` : `"management" or "sponsorship"`;
  return `You are a sports intelligence data engine extracting verified professional contacts. Return ONLY valid JSON — no markdown, no explanation.

Rules:
- ONLY extract a contact if the research explicitly names a real individual in this role. NEVER infer, guess, or construct a plausible-sounding name — if the research doesn't name someone, omit that entry entirely rather than filling the gap.
- name and org must both be real, specific, and non-empty. Never write "Unknown", "N/A", or leave them blank — omit the contact instead.
- sourceDomain must be the real domain of the source where this was actually found.
- sourceExcerpt must be a short, direct quote or close paraphrase from the research that supports the claim — not a generic restatement.
- confidence: 85-97 only for a name explicitly stated with clear, direct sourcing. 70-84 for a name that's stated but more weakly sourced (e.g. a single passing mention). Never use below 70 — if evidence is that weak, omit the contact instead of underscoring it with a low number.
- category: use ${categories} as appropriate.
- Separately, report "findings": one entry per case where the research gives a clear signal about absence ("confirmed_absent" — explicit statement like self-coached/unsigned) or where you found genuinely nothing either way ("no_evidence"). Do not create a finding just because you also found a real contact.`;
}

const buildUserPrompt = (a: AthleteStub, research: string, citations: string[]): string => {
  return `
Athlete: ${a.name} (${a.sport} — ${a.event}, ${a.nationality})

${citations.length > 0
  ? `VERIFIED CITATION URLs (for your reference — ground every claim in the research below, not beyond it):
${citations.map((c, i) => `${i + 1}. ${c}`).join("\n")}

`
  : ""}${research
  ? `VERIFIED RESEARCH:
\`\`\`
${research}
\`\`\``
  : `ABORT: No verified research is available. Return { "contacts": [], "findings": [] }.`}

Extract as JSON:

{
  "contacts": [
    {
      "role": <string, e.g. "Head Coach">,
      "category": <string>,
      "name": <string>,
      "org": <string>,
      "orgType": <string or null>,
      "confidence": <integer 70-97>,
      "publicEmail": <string or null>,
      "website": <string or null>,
      "note": <string or null>,
      "sourceDomain": <string>,
      "sourceExcerpt": <string>
    }
  ],
  "findings": [
    {
      "status": "confirmed_absent" | "no_evidence",
      "note": <string, one sentence>
    }
  ]
}
`;
};

async function extractContacts(
  athlete: AthleteStub,
  scope: ContactScope,
  research: string,
  citations: string[],
): Promise<{ contacts: ContactRow[]; findings: ContactFinding[] }> {
  if (!research) return { contacts: [], findings: [] };

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: buildSystemPrompt(scope) },
        { role: "user", content: buildUserPrompt(athlete, research, citations) },
      ],
      response_format: { type: "json_object" },
    });
    const raw = response.choices[0]?.message?.content;
    if (!raw) return { contacts: [], findings: [] };

    const data = JSON.parse(raw) as { contacts?: any[]; findings?: any[] };
    const rawContacts = Array.isArray(data.contacts) ? data.contacts : [];
    const rawFindings = Array.isArray(data.findings) ? data.findings : [];
    const today = new Date().toISOString().split("T")[0];

    const contacts: ContactRow[] = [];
    let droppedUnusable = 0;
    let droppedLowConfidence = 0;

    for (const c of rawContacts) {
      if (!isUsableContact(c?.name, c?.org)) {
        droppedUnusable++;
        continue;
      }
      const sourceDomain = resolveStandaloneDomain(c.sourceDomain, citations);
      const baseConfidence = typeof c.confidence === "number" ? Math.max(70, c.confidence) : 70;
      const confidence = adjustConfidenceByDomain(baseConfidence, sourceDomain, false);

      if (confidence < MIN_CONTACT_CONFIDENCE) {
        droppedLowConfidence++;
        continue;
      }

      contacts.push({
        role: String(c.role ?? (scope === "coaching" ? "Coach" : "Representative")),
        category:
          c.category === "coaching" || c.category === "medical" ||
          c.category === "management" || c.category === "sponsorship" || c.category === "media"
            ? c.category
            : scope === "coaching" ? "coaching" : "management",
        name: String(c.name).trim(),
        org: String(c.org).trim(),
        orgType: c.orgType ? String(c.orgType) : null,
        status: confidence >= 85 ? "verified" : "unconfirmed",
        confidence,
        publicEmail: c.publicEmail ? String(c.publicEmail) : null,
        website: c.website ? String(c.website) : null,
        note: c.note ? String(c.note) : null,
        lastVerified: today,
        dateDiscovered: today,
        sourceDomain,
        sourceExcerpt: c.sourceExcerpt ? String(c.sourceExcerpt) : null,
      });
    }

    if (droppedUnusable > 0 || droppedLowConfidence > 0) {
      logger.warn(
        { athleteId: athlete.id, name: athlete.name, scope, droppedUnusable, droppedLowConfidence, kept: contacts.length },
        "contacts-agent: dropped invalid or low-confidence contacts",
      );
    }

    const findings: ContactFinding[] = rawFindings
      .filter((f: any) => f?.status === "confirmed_absent" || f?.status === "no_evidence")
      .map((f: any) => ({
        scope,
        status: f.status as "confirmed_absent" | "no_evidence",
        note: typeof f.note === "string" ? f.note : "",
      }));

    return { contacts, findings };
  } catch (err) {
    logger.warn(
      { err, athleteId: athlete.id, name: athlete.name, scope },
      "contacts-agent: extraction failed — skipping this scope this run",
    );
    return { contacts: [], findings: [] };
  }
}

async function runScope(athlete: AthleteStub, scope: ContactScope): Promise<{ contacts: ContactRow[]; findings: ContactFinding[] }> {
  const { research, citations } = await researchContacts(athlete, scope);
  return extractContacts(athlete, scope, research, citations);
}

/**
 * Runs the ContactsAgent: two independent research+extraction cycles
 * (coaching/medical, and management/sponsorship representation) in
 * parallel, merging their validated contacts and their absence/no-evidence
 * findings. Never throws — a scope that fails to research or extract
 * simply contributes nothing rather than blocking the other scope or the
 * rest of the pipeline.
 */
export async function runContactsAgent(athlete: AthleteStub): Promise<ContactsAgentResult> {
  const [coaching, representation] = await Promise.all([
    runScope(athlete, "coaching"),
    runScope(athlete, "representation"),
  ]);

  const findings = [...coaching.findings, ...representation.findings];
  for (const f of findings) {
    logger.info(
      { athleteId: athlete.id, name: athlete.name, scope: f.scope, status: f.status, note: f.note },
      "contacts-agent: finding",
    );
  }

  return {
    contacts: [...coaching.contacts, ...representation.contacts],
    findings,
  };
}
