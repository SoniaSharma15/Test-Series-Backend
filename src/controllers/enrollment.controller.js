import Enrollment from "../models/Enrollment.js";
import TestSeries from "../models/TestSeries.js";
import Test from "../models/Test.js";
import Attempt from "../models/Attempt.js";

export const getMyEnrollments = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const studentId = req.user._id;
    const now = new Date();

    const enrollments = await Enrollment.find({
      studentId,
    }).populate("testSeriesId");

    const result = [];

    for (const enrollment of enrollments) {
      const series = enrollment.testSeriesId;
      if (!series) continue;

      /* ================= EXPIRY LOGIC ================= */

      let expiryDate = null;

      if (series.startDate && series.duration) {
        const start = new Date(series.startDate);
        expiryDate = new Date(start);
        expiryDate.setDate(start.getDate() + series.duration);
      }

      if (expiryDate && now > expiryDate) {
        continue;
      }

      /* ================= FETCH TESTS ================= */

      const tests = await Test.find({
        testSeriesId: series._id,
      });

      const testsWithBestScore = [];

      for (const test of tests) {

        // ✅ Only count completed attempts
        const attempts = await Attempt.find({
          studentId,
          testId: test._id,
          status: { $in: ["COMPLETED", "AUTO_SUBMITTED"] },
        });

        let bestScore = 0;
        let alreadyAttempted = false;

        if (attempts.length > 0) {
          alreadyAttempted = true;

          bestScore = Math.max(
            ...attempts.map((a) => a.score || 0)
          );
        }

        testsWithBestScore.push({
          test,
          bestScore,
          alreadyAttempted,   // 🔥 IMPORTANT FIELD
        });
      }

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

    res.json(result);
  } catch (error) {
    console.error("Get My Enrollments Error:", error);
    res.status(500).json({ message: error.message });
  }
};
