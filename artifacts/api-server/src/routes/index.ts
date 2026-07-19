import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import athletesRouter from "./athletes";
import intelligenceRouter from "./intelligence";
import alertsRouter from "./alerts";
import competitionsRouter from "./competitions";
import contactsRouter from "./contacts";
import timelineRouter from "./timeline";
import chatRouter from "./chat";
import stripeRouter from "./stripe";
import summaryRouter from "./summary";
import contactFormRouter from "./contact";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(athletesRouter);
router.use(intelligenceRouter);
router.use(alertsRouter);
router.use(competitionsRouter);
router.use(contactsRouter);
router.use(timelineRouter);
router.use(chatRouter);
router.use(stripeRouter);
router.use(summaryRouter);
router.use(contactFormRouter);
router.use(adminRouter);

export default router;
