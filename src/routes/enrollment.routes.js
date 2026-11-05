import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRole } from "../middlewares/role.middleware.js";
import {
  enrollInFreeSeries,
  getMyEnrollments,
} from "../controllers/enrollment.controller.js";

const router = express.Router();

router.get(
  "/my",
  protect,
  authorizeRole("student"),
  getMyEnrollments
);

router.post(
  "/free",
  protect,
  authorizeRole("student"),
  enrollInFreeSeries
);

export default router;
