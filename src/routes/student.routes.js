import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRole } from "../middlewares/role.middleware.js";
import { getStudentDashboard, getStudentGlobalRank, getStudentLeaderboard } from "../controllers/student.controller.js";

const router = express.Router();

router.get(
  "/dashboard",
  protect,
  authorizeRole("student"),
  getStudentDashboard
);
router.get("/global-rank",  protect,
  authorizeRole("student"),getStudentGlobalRank);
router.get("/leaderboard",  protect,
  authorizeRole("student"),getStudentLeaderboard);
export default router;
