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

    const enrollments = await Enrollment.find({
      studentId,
    }).populate("testSeriesId");

    const result = [];

    for (const enrollment of enrollments) {
      if (!enrollment.testSeriesId) continue;

      const tests = await Test.find({
        testSeriesId: enrollment.testSeriesId._id,
      });

      const testsWithBestScore = [];

      for (const test of tests) {
        const attempts = await Attempt.find({
          studentId,
          testId: test._id,
        });

        let bestScore = 0;

        if (attempts.length > 0) {
          bestScore = Math.max(
            ...attempts.map((a) => a.score || 0)
          );
        }

        testsWithBestScore.push({
          test,
          bestScore,
        });
      }

      // 🔥 EXPIRY LOGIC START

      const now = new Date();

      // If expiryDate exists (from payment/admin)
      let expiryDate;

      if (enrollment.expiryDate) {
        expiryDate = new Date(enrollment.expiryDate);
      } else {
        // fallback (old enrollments)
        expiryDate = new Date(
          new Date(enrollment.createdAt).getTime() +
          enrollment.testSeriesId.duration * 24 * 60 * 60 * 1000
        );
      }

      let remainingDays = Math.ceil(
        (expiryDate - now) / (1000 * 60 * 60 * 24)
      );

      if (remainingDays < 0) remainingDays = 0;

      // 🔥 EXPIRY LOGIC END

      result.push({
        testSeries: enrollment.testSeriesId,
        tests: testsWithBestScore,
        expiryDate,
        remainingDays, // ✅ send to frontend
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Get My Enrollments Error:", error);
    res.status(500).json({ message: error.message });
  }
};

