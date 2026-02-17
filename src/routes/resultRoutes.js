import express from "express";
import { getMyResults, getResultDetail } from "../controllers/resultController.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/my-results", protect, getMyResults);
router.get("/detail/:attemptId", protect, getResultDetail);

export default router;
