import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRole } from "../middlewares/role.middleware.js";
import { getAdminDashboard } from "../controllers/admin.controller.js";

const router = express.Router();

router.get(
  "/dashboard",
  protect,
  authorizeRole("admin"),
  getAdminDashboard
);

export default router;
