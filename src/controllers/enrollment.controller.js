import Enrollment from "../models/Enrollment.js";
import TestSeries from "../models/TestSeries.js";
import Test from "../models/Test.js";
import Attempt from "../models/Attempt.js";
import mongoose from "mongoose";

/* =====================================================
   1️⃣ ENROLL IN FREE SERIES (All courses are free)
===================================================== */
export const enrollInFreeSeries = async (req, res, next) => {
  try {
    const { testSeriesId } = req.body;
    const studentId = req.user?._id;

    if (!studentId) {
      const err = new Error("Unauthorized");
      err.statusCode = 401;
      throw err;
    }

    if (!testSeriesId || !mongoose.Types.ObjectId.isValid(testSeriesId)) {
      const err = new Error("Invalid TestSeriesId");
      err.statusCode = 400;
      throw err;
    }

    const testSeries = await TestSeries.findById(testSeriesId);
    if (!testSeries) {
      const err = new Error("Test series not found");
      err.statusCode = 404;
      throw err;
    }

    const upsertPayload = {
      $set: {
        studentId,
        testSeriesId,
        source: "free",
        amount: 0,
        status: "active",
        accessGranted: true,
        purchaseDate: new Date(),
        expiryDate: null,
      },
    };

    // Upsert enrollment: free, active, full access, permanent (no expiry)
    try {
      await Enrollment.findOneAndUpdate(
        { studentId, testSeriesId },
        upsertPayload,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (upsertErr) {
      // If a legacy index like student_1_batch_1 caused E11000, drop it and retry
      if (
        upsertErr.code === 11000 ||
        upsertErr.message?.includes("student_1_batch_1")
      ) {
        console.warn(
          "⚠️ Caught legacy index conflict. Dropping obsolete index and retrying..."
        );
        try {
          await Enrollment.collection.dropIndex("student_1_batch_1");
        } catch (_) {}

        await Enrollment.findOneAndUpdate(
          { studentId, testSeriesId },
          upsertPayload,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } else {
        throw upsertErr;
      }
    }

    await TestSeries.findByIdAndUpdate(testSeriesId, {
      $inc: { totalEnrollments: 1 },
    });

    return res.status(200).json({
      success: true,
      message: "Free enrollment successful",
    });
  } catch (error) {
    next(error);
  }
};

/* =====================================================
   2️⃣ GET MY ENROLLMENTS (Active Batches & Tests)
===================================================== */
export const getMyEnrollments = async (req, res, next) => {
  try {
    const studentId = req.user?._id;

    if (!studentId) {
      const err = new Error("Unauthorized");
      err.statusCode = 401;
      throw err;
    }

    // Fetch all enrollments for this student (no status or expiry filters)
    const enrollments = await Enrollment.find({
      studentId,
    }).populate("testSeriesId");

    // Heal all enrollments for this student to ensure active status, accessGranted, and no expiry
    if (enrollments.length > 0) {
      await Enrollment.updateMany(
        { studentId },
        {
          $set: {
            status: "active",
            accessGranted: true,
            source: "free",
            amount: 0,
            expiryDate: null,
          },
        }
      ).catch(() => {});
    }

    // Deduplicate series by ID
    const enrolledSeriesMap = new Map();
    for (const e of enrollments) {
      if (e.testSeriesId && e.testSeriesId._id) {
        enrolledSeriesMap.set(e.testSeriesId._id.toString(), e.testSeriesId);
      }
    }

    const enrolledSeriesList = Array.from(enrolledSeriesMap.values());
    const result = [];

    for (const series of enrolledSeriesList) {
      /* ================= FETCH ALL TESTS FOR THIS BATCH ================= */
      const tests = await Test.find({
        testSeriesId: series._id,
      }).sort({ createdAt: 1 });

      const testIds = tests.map((t) => t._id);

      /* ================= FETCH ALL ATTEMPTS IN ONE QUERY ================= */
      const attempts = await Attempt.find({
        studentId,
        testId: { $in: testIds },
        status: { $in: ["COMPLETED", "AUTO_SUBMITTED"] },
      });

      /* ================= GROUP ATTEMPTS BY TEST ================= */
      const attemptMap = new Map();

      for (const attempt of attempts) {
        const key = attempt.testId.toString();

        const totalMarks = attempt.totalMarks || 0;
        const obtainedMarks = attempt.obtainedMarks || 0;

        const percentage =
          totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;

        if (!attemptMap.has(key)) {
          attemptMap.set(key, []);
        }

        attemptMap.get(key).push(percentage);
      }

      /* ================= BUILD TEST RESPONSE ================= */
      const testsWithBestScore = tests.map((test) => {
        const key = test._id.toString();
        const scores = attemptMap.get(key) || [];

        return {
          test,
          bestScore:
            scores.length > 0
              ? Number(Math.max(...scores).toFixed(2))
              : 0,
          alreadyAttempted: scores.length > 0,
        };
      });

      result.push({
        testSeries: series,
        tests: testsWithBestScore,
        expiryDate: null,
        remainingDays: null,
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });

  } catch (error) {
    next(error);
  }
};
