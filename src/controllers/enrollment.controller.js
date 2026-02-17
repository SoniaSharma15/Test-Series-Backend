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

      result.push({
        testSeries: enrollment.testSeriesId,
        tests: testsWithBestScore,
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Get My Enrollments Error:", error);
    res.status(500).json({ message: error.message });
  }
};

