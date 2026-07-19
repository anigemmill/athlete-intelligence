/**
 * contact.ts — Public contact form submissions
 *
 * POST /api/contact
 *   Saves an enquiry to the database. No auth required.
 *   Rate-limited to prevent spam.
 */

import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { contactEnquiriesTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// 10 submissions per hour per IP — blocks spam bots while allowing
// legitimate users to resubmit after a form error
const contactRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "Too many submissions — please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

router.post("/contact", contactRateLimit, async (req, res): Promise<void> => {
  const { type, name, org, email, role, athletes, message } = req.body ?? {};

  if (!name || !org || !email) {
    res.status(400).json({ error: "name, org, and email are required" });
    return;
  }

  try {
    const [row] = await db
      .insert(contactEnquiriesTable)
      .values({
        type: type ?? "general",
        name: String(name).trim(),
        org: String(org).trim(),
        email: String(email).trim().toLowerCase(),
        role: role ? String(role).trim() : null,
        athletes: athletes ? String(athletes).trim() : null,
        message: message ? String(message).trim() : null,
      })
      .returning({ id: contactEnquiriesTable.id });

    logger.info({ id: row.id, email, type }, "Contact enquiry saved");
    res.json({ ok: true, id: row.id });
  } catch (err: any) {
    logger.error({ err }, "Failed to save contact enquiry");
    res.status(500).json({ error: "Failed to save enquiry" });
  }
});

export default router;
