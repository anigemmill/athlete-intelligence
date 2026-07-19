import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
} from "./middlewares/clerkProxyMiddleware.js";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./lib/webhookHandlers.js";

const app: Express = express();

// ── Clerk proxy — MUST be before body parsers (streams raw bytes) ─────────────
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// ── Stripe webhook MUST be registered before express.json() ──────────────────
// Stripe requires the raw Buffer — json() would destroy it.
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }
    const sig = Array.isArray(signature) ? signature[0] : signature;
    try {
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error({ err }, "Stripe webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  },
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Restrict CORS to known origins — never mirror arbitrary origins with credentials
const ALLOWED_ORIGINS = [
  /\.replit\.app$/,
  /\.replit\.dev$/,
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
];
app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // Same-origin / server-to-server requests have no Origin header — allow
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.some((pattern) => pattern.test(origin))) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
  }),
);
// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://clerk.athleteintelligence.ai", "https://*.clerk.accounts.dev"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://api.clerk.com", "https://*.clerk.accounts.dev", "https://clerk.athleteintelligence.ai"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for Clerk OAuth
  }),
);

// 1 MB body limit — prevents oversized payload attacks
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Clerk middleware — must be before routes
app.use(clerkMiddleware());

app.use("/api", router);

// ── Global error handler — must be last middleware ────────────────────────────
// Catches any unhandled errors from routes and prevents stack trace leaks
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
