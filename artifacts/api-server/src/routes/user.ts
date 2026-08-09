/**
 * user.ts — Authenticated user identity endpoints
 *
 * GET /api/user/me — returns the caller's resolved email and admin flag.
 *
 * Admin status is determined server-side by comparing the Clerk primary email
 * (case-insensitive) against the FOUNDER_EMAIL environment variable, via the
 * shared isFounderEmail() in lib/founderAccess.ts — the single source of
 * truth for admin detection, also used by routes/admin.ts's requireAdmin.
 * The frontend must not repeat this logic.
 */

import { Router, type IRouter } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { logger } from "../lib/logger.js";
import { isFounderEmail } from "../lib/founderAccess.js";

const router: IRouter = Router();

// GET /api/user/me
router.get("/user/me", async (req, res): Promise<void> => {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId;

    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await clerkClient.users.getUser(userId);

    // Resolve email: prefer the primaryEmailAddressId match, fall back to
    // first verified address, then first address of any kind.
    const primaryEmail =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ??
      user.emailAddresses.find((e) => e.verification?.status === "verified")
        ?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      null;

    const isAdmin = isFounderEmail(primaryEmail);

    res.json({ isAdmin, email: primaryEmail ?? null });
  } catch (err) {
    logger.error({ err }, "Failed to resolve /user/me");
    res.status(500).json({ error: "Failed to resolve user identity" });
  }
});

export default router;
