import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/requireAuth.js";

// Public routes — no authentication required
import healthRouter from "./health";
import contactFormRouter from "./contact";
import stripePublicRouter from "./stripe-public";

// Protected routes — Clerk session required
import dashboardRouter from "./dashboard";
import athletesRouter from "./athletes";
import intelligenceRouter from "./intelligence";
import alertsRouter from "./alerts";
import competitionsRouter from "./competitions";
import contactsRouter from "./contacts";
import timelineRouter from "./timeline";
import chatRouter from "./chat";
import stripeProtectedRouter from "./stripe";
import summaryRouter from "./summary";
import adminRouter from "./admin";

const router: IRouter = Router();

// ── Public endpoints (no auth) ────────────────────────────────────────────────
router.use(healthRouter);        // GET  /health
router.use(contactFormRouter);   // POST /contact
router.use(stripePublicRouter);  // GET  /stripe/prices, GET /stripe/products-with-prices, POST /stripe/checkout

// ── Auth gate — everything below requires a valid Clerk session ───────────────
router.use(requireAuth);

// ── Protected endpoints ───────────────────────────────────────────────────────
router.use(dashboardRouter);
router.use(athletesRouter);
router.use(intelligenceRouter);
router.use(alertsRouter);
router.use(competitionsRouter);
router.use(contactsRouter);
router.use(timelineRouter);
router.use(chatRouter);
router.use(stripeProtectedRouter); // POST /stripe/portal, GET /stripe/subscription
router.use(summaryRouter);
router.use(adminRouter);

export default router;
