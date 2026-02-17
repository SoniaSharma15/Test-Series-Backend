import express from "express";
import {
  getAllEnrollments,
  manualEnroll,
  renewEnrollment,
  updateEnrollmentStatus,
} from "../controllers/adminEnrollmentController.js";

import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRole } from "../middlewares/role.middleware.js";

const router = express.Router();

// Get all enrollments (Admin)
router.get(
  "/",
  protect,
  authorizeRole("admin"),
  getAllEnrollments
);
router.patch("/:id/renew",protect,
  authorizeRole("admin"), renewEnrollment);


// Manual enroll student
router.post(
  "/",
  protect,
  authorizeRole("admin"),
  manualEnroll
);

// Update enrollment status
router.put(
  "/:id",
  protect,
  authorizeRole("admin"),
  updateEnrollmentStatus
);


export default router;
