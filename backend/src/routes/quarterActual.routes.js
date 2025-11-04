import express from "express";
import { authenticateToken } from "../middlewares/auth.js";
import { saveQuarterActuals, getPreviousQuarterActuals, getQuarterActuals } from "../controllers/quarterActual.controller.js";

const router = express.Router();

router.get("/", authenticateToken, getQuarterActuals);
router.post("/", authenticateToken, saveQuarterActuals);
router.get("/previous", authenticateToken, getPreviousQuarterActuals);

export default router;
