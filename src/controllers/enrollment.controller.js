import Enrollment from "../models/Enrollment.js";
import TestSeries from "../models/TestSeries.js";
import Test from "../models/Test.js";
import Attempt from "../models/Attempt.js";

export const getMyEnrollments = async (req, res, next) => {
  try {
    const studentId = req.user?._id;

    if (!studentId) {
      const err = new Error("Unauthorized");
      err.statusCode = 401;
      throw err;
    }

    const now = new Date();

    /* ================= FETCH ENROLLMENTS ================= */

    const enrollments = await Enrollment.find({ studentId })
      .populate("testSeriesId");

    if (!enrollments.length) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const result = [];

    for (const enrollment of enrollments) {
      const series = enrollment.testSeriesId;
      if (!series) continue;

      /* ================= EXPIRY CHECK ================= */

      let expiryDate = null;

      if (series.startDate && series.duration) {
        const start = new Date(series.startDate);
        expiryDate = new Date(start);
        expiryDate.setDate(start.getDate() + series.duration);
      }

      if (expiryDate && now > expiryDate) continue;

      /* ================= FETCH ALL TESTS ================= */

      const tests = await Test.find({
        testSeriesId: series._id,
      });

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

      /* ================= REMAINING DAYS ================= */

      let remainingDays = null;

      if (expiryDate) {
        remainingDays = Math.ceil(
          (expiryDate - now) / (1000 * 60 * 60 * 24)
        );
        if (remainingDays < 0) remainingDays = 0;
      }

      result.push({
        testSeries: series,
        tests: testsWithBestScore,
        expiryDate,
        remainingDays,
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
