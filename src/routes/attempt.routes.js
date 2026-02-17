import express from "express";
import {
  startAttempt,
  getExamData,
  submitAttempt,
  getResult,
  getPerformance,
  heartbeat,
  reportViolation,
  getPublicTestDetails,
  getRecentPerformance 
} from "../controllers/attempt.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRole } from "../middlewares/role.middleware.js";

const router = express.Router();

/* =====================================================
   STUDENT EXAM ROUTES
===================================================== */

/* 1️⃣ Start Attempt */
router.post(
  "/start",
  protect,
  authorizeRole("student"),
  startAttempt
);

/* 2️⃣ Get Exam Data (Secure) */
router.get(
  "/exam/:attemptId",
  protect,
  authorizeRole("student"),
  getExamData
);

/* Public Test Details (Instruction Page) */
router.get(
  "/public/:testId",
  getPublicTestDetails
);


/* 3️⃣ Submit Attempt */
router.post(
  "/submit",
  protect,
  authorizeRole("student"),
  submitAttempt
);

/* 4️⃣ Heartbeat (Live Check) */
router.post(
  "/heartbeat",
  protect,
  authorizeRole("student"),
  heartbeat
);

/* 5️⃣ Report Violation (Tab / Fullscreen Exit) */
router.post(
  "/violation",
  protect,
  authorizeRole("student"),
  reportViolation
);

/* 6️⃣ Get Single Result */
router.get(
  "/result/:attemptId",
  protect,
  authorizeRole("student"),
  getResult
);

/* 7️⃣ Student Performance Summary */
router.get(
  "/performance",
  protect,
  authorizeRole("student"),
  getPerformance
);

/* 8️⃣ Get Recent Performance */
router.get(
  "/recent-performance",
  protect,
  authorizeRole("student"),
  getRecentPerformance
);

/* =====================================================
   ADMIN ROUTES (Optional Monitoring)
===================================================== */

/* View any attempt (admin monitoring) */
router.get(
  "/admin/:attemptId",
  protect,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const attempt = await Attempt.findById(req.params.attemptId)
        .populate("studentId")
        .populate("testId");

      if (!attempt)
        return res.status(404).json({ message: "Not found" });

      res.json(attempt);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);



export default router;
