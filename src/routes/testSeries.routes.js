import express from "express";

import {
  createTestSeries,
  updateTestSeries,
  deleteTestSeries,
  getAllTestSeries,
  getSingleTestSeries,
} from "../controllers/testSeries.controller.js";

import { upload, uploadToCloudinary } from "../middlewares/upload.middleware.js";
import { optionalAuth } from "../middlewares/optionalAuth.middleware.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRole } from "../middlewares/role.middleware.js";

const router = express.Router();

/* ===================================================
   PUBLIC ROUTES
=================================================== */

// Get all test series (with optional login)
router.get("/", optionalAuth, getAllTestSeries);

// Get single test series (with optional login)
router.get("/:id", optionalAuth, getSingleTestSeries);

/* ===================================================
   ADMIN ROUTES
=================================================== */

// Create Test Series
router.post(
  "/",
  protect,
  authorizeRole("admin"),
 upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
]),
  uploadToCloudinary,
  createTestSeries
);

// Update Test Series
router.put(
  "/:id",
  protect,
  authorizeRole("admin"),
 upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
]),
  uploadToCloudinary,
  updateTestSeries
);

// Delete Test Series
router.delete(
  "/:id",
  protect,
  authorizeRole("admin"),
  deleteTestSeries
);

export default router;
