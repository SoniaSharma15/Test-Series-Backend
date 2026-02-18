import express from "express";
import {
  createTest,
  getTestsBySeries,
  deleteTest,updateTest
} from "../controllers/test.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRole } from "../middlewares/role.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRole("admin"),
  createTest
);

router.get(
  "/by-series/:seriesId",
  protect,
  authorizeRole("admin"),
  getTestsBySeries
);
router.put("/:id", protect, authorizeRole("admin"), updateTest);

router.delete(
  "/:id",
  protect,
  authorizeRole("admin"),
  deleteTest
);

export default router;
