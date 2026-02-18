import Enrollment from "../models/Enrollment.js";
import Test from "../models/Test.js";
import Attempt from "../models/Attempt.js";

export const getStudentDashboard = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const studentId = req.user._id;

    // 1️⃣ Active Enrollments
    const activeEnrollments = await Enrollment.find({
      studentId,
      status: "active",
      accessGranted: true,
    }).populate("testSeriesId");

    const activeSeriesIds = activeEnrollments
      .filter((e) => e.testSeriesId)
      .map((e) => e.testSeriesId._id);

    // 2️⃣ Tests of Active Series
    const activeTests = await Test.find({
      testSeriesId: { $in: activeSeriesIds },
    });

    const activeTestIds = activeTests.map((t) => t._id);

    // 3️⃣ Attempts
    const attempts = await Attempt.find({
      studentId,
      testId: { $in: activeTestIds },
      status: { $in: ["COMPLETED", "AUTO_SUBMITTED"] },
    }).sort({ submittedAt: -1 });

    const totalAttempts = attempts.length;

    // =========================
    // 📊 GLOBAL CALCULATIONS
    // =========================

    let totalScore = 0;
    let highestScore = 0;
    let totalCorrect = 0;
    let totalAttemptedQuestions = 0;

    attempts.forEach((a) => {
      const score = a.score || 0;

      totalScore += score;
      totalCorrect += a.correctCount || 0;
      totalAttemptedQuestions += a.attemptedCount || 0;

      if (score > highestScore) {
        highestScore = score;
      }
    });

    const averageScore =
      totalAttempts > 0 ? totalScore / totalAttempts : 0;

    const avgAccuracy =
      totalAttemptedQuestions > 0
        ? (totalCorrect / totalAttemptedQuestions) * 100
        : 0;

    const lastScore = attempts[0]?.score || 0;

    const round2 = (num) => Math.round(num * 100) / 100;

    // =========================
    // 🎯 SMART SERIES DATA
    // =========================

    const smartSeries = activeEnrollments
      .filter((enrollment) => enrollment.testSeriesId)
      .map((enrollment) => {
        const seriesId = enrollment.testSeriesId._id;

        const seriesTests = activeTests.filter(
          (t) =>
            t.testSeriesId.toString() === seriesId.toString()
        );

        const seriesTestIds = seriesTests.map((t) =>
          t._id.toString()
        );

        const seriesAttempts = attempts.filter((a) =>
          seriesTestIds.includes(a.testId.toString())
        );

        const totalTests = seriesTests.length;
        const attemptedTests = seriesAttempts.length;
        const pendingTests = totalTests - attemptedTests;

        const progress =
          totalTests > 0
            ? Math.round((attemptedTests / totalTests) * 100)
            : 0;

        const durationDays =
          enrollment.testSeriesId?.duration || 0;

        let calculatedExpiry = null;

        if (durationDays > 0 && enrollment.purchaseDate) {
          calculatedExpiry = new Date(enrollment.purchaseDate);
          calculatedExpiry.setDate(
            calculatedExpiry.getDate() + durationDays
          );
        }

        return {
          _id: seriesId,
          title: enrollment.testSeriesId.title,
          expiryDate: calculatedExpiry,
          totalTests,
          attemptedTests,
          pendingTests,
          progress,
        };
      });

    // =========================
    // 📈 Performance Graph
    // =========================

    const performanceGraphData = attempts
      .slice(0, 10)
      .reverse()
      .map((a) => ({
        score: round2(a.score),
        date: a.submittedAt,
      }));

    // =========================
    // 🚀 RESPONSE
    // =========================

    res.json({
      studentName: req.user.name,
      studentId: req.user._id,

      enrolledSeries: smartSeries,

      totalAttempts,
      averageScore: round2(averageScore),
      highestScore: round2(highestScore),
      lastScore: round2(lastScore),
      avgAccuracy: round2(avgAccuracy),
      overallProficiency: round2(averageScore),
      testsTakenCount: totalAttempts,

      performanceGraphData,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
