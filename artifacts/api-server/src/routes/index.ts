import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import customersRouter from "./customers";
import salesRouter from "./sales";
import debtsRouter from "./debts";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import salesPredictionRouter from "./sales-prediction";
import aiInsightsRouter from "./ai-insights";
import authRouter from "./auth";
import usersRouter from "./users";
import adminRouter from "./admin";
import registrationsRouter from "./registrations";
import verificationsRouter from "./verifications";
import deliveriesRouter from "./deliveries";
import suppliersRouter from "./suppliers";
import rfqsRouter from "./rfqs";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(registrationsRouter);
router.use(verificationsRouter);

router.use(requireAuth);

router.use(productsRouter);
router.use(customersRouter);
router.use(salesRouter);
router.use(debtsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(salesPredictionRouter);
router.use(aiInsightsRouter);
router.use(usersRouter);
router.use(adminRouter);
router.use(deliveriesRouter);
router.use(suppliersRouter);
router.use(rfqsRouter);

export default router;
