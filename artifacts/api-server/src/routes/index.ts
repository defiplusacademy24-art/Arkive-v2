import { Router, type IRouter } from "express";
import healthRouter from "./health";
import walletAuthRouter from "./wallet-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", walletAuthRouter);

export default router;
