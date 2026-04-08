import { Router } from "express";
import quotingRouter from "./quotingAI";
import messagingRouter from "./messagingAI";
import agentRouter from "./agentAI";
import growthRouter from "./growthAI";

const router = Router();

router.use("/", quotingRouter);
router.use("/", messagingRouter);
router.use("/", agentRouter);
router.use("/", growthRouter);

export default router;
