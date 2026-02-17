// server/src/routes/question.routes.js
import express from "express";
import {
  createQuestion,
  getQuestionsByTest,
  updateQuestion,
  deleteQuestion,
} from "../controllers/question.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRole } from "../middlewares/role.middleware.js";
import { upload, uploadToCloudinary } from "../middlewares/upload.middleware.js";

const router = express.Router();

// ✅ CREATE (supports image upload)
router.post(
  "/",
  protect,
  authorizeRole("admin"),
  upload.single("image"),
  uploadToCloudinary,
  createQuestion
);

// ✅ UPDATE (supports image upload)
router.put(
  "/:id",
  protect,
  authorizeRole("admin"),
  upload.single("image"),
  uploadToCloudinary,
  updateQuestion
);

// ✅ GET by testId (fixes your 404)
router.get(
  "/:testId",
  protect,
  authorizeRole("admin"),
  getQuestionsByTest
);

// ✅ DELETE
router.delete(
  "/:id",
  protect,
  authorizeRole("admin"),
  deleteQuestion
);

export default router;
