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
<<<<<<< HEAD
=======
    const now = new Date();
>>>>>>> 9a34fba00782953920ea37f9244a28f3a4943fbe

    const enrollments = await Enrollment.find({
      studentId,
    }).populate("testSeriesId");

    const result = [];

    for (const enrollment of enrollments) {
<<<<<<< HEAD
      if (!enrollment.testSeriesId) continue;

      const tests = await Test.find({
        testSeriesId: enrollment.testSeriesId._id,
=======
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
>>>>>>> 9a34fba00782953920ea37f9244a28f3a4943fbe
      });

      const testsWithBestScore = [];

      for (const test of tests) {
<<<<<<< HEAD
        const attempts = await Attempt.find({
          studentId,
          testId: test._id,
        });

        let bestScore = 0;

        if (attempts.length > 0) {
=======

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

>>>>>>> 9a34fba00782953920ea37f9244a28f3a4943fbe
          bestScore = Math.max(
            ...attempts.map((a) => a.score || 0)
          );
        }

        testsWithBestScore.push({
          test,
          bestScore,
<<<<<<< HEAD
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
=======
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
>>>>>>> 9a34fba00782953920ea37f9244a28f3a4943fbe
      });
    }

    res.json(result);
<<<<<<< HEAD
=======

>>>>>>> 9a34fba00782953920ea37f9244a28f3a4943fbe
  } catch (error) {
    console.error("Get My Enrollments Error:", error);
    res.status(500).json({ message: error.message });
  }
};
<<<<<<< HEAD

=======
>>>>>>> 9a34fba00782953920ea37f9244a28f3a4943fbe
