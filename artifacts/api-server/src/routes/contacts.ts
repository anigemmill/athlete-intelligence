import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { contactsTable } from "@workspace/db";
import {
  ListAthleteContactsParams,
  ListAthleteContactsResponse,
} from "@workspace/api-zod";
import type { Contact } from "@workspace/db";

const router: IRouter = Router();

function toApiContact(c: Contact) {
  return {
    id: c.id,
    athleteId: c.athleteId,
    role: c.role,
    category: c.category,
    name: c.name,
    org: c.org,
    orgType: c.orgType ?? null,
    status: c.status,
    confidence: c.confidence,
    publicEmail: c.publicEmail ?? null,
    website: c.website ?? null,
    note: c.note ?? null,
    lastVerified: c.lastVerified,
    dateDiscovered: c.dateDiscovered,
    sourceDomain: c.sourceDomain,
    sourceExcerpt: c.sourceExcerpt ?? null,
  };
}

// GET /athletes/:id/contacts
router.get("/athletes/:id/contacts", async (req, res): Promise<void> => {
  const params = ListAthleteContactsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const contacts = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.athleteId, params.data.id))
    .orderBy(contactsTable.category, contactsTable.name);

  res.json(ListAthleteContactsResponse.parse(contacts.map(toApiContact)));
});

export default router;
