import Enrollment from "../models/Enrollment.js";
import Test from "../models/Test.js";
import Attempt from "../models/Attempt.js";

export const getStudentDashboard = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const studentId = req.user._id;
    const now = new Date();

    /* =====================================================
       1️⃣ FETCH ENROLLMENTS
    ===================================================== */

    const enrollments = await Enrollment.find({
      studentId,
      status: "active",
      accessGranted: true,
    }).populate("testSeriesId");

    /* =====================================================
       2️⃣ FILTER EXPIRED SERIES (STARTDATE + DURATION)
       🔥 SAME LOGIC AS getAllTestSeries
    ===================================================== */

    const activeEnrollments = enrollments.filter((enrollment) => {
      const series = enrollment.testSeriesId;
      if (!series) return false;

      if (!series.startDate || !series.duration) return true;

      const start = new Date(series.startDate);
      const expiry = new Date(start);
      expiry.setDate(expiry.getDate() + series.duration);

      return now <= expiry;
    });

    const activeSeriesIds = activeEnrollments.map(
      (e) => e.testSeriesId._id
    );

    /* =====================================================
       3️⃣ FETCH TESTS
    ===================================================== */

    const activeTests = await Test.find({
      testSeriesId: { $in: activeSeriesIds },
    });

    const activeTestIds = activeTests.map((t) => t._id);

    /* =====================================================
       4️⃣ FETCH ATTEMPTS
    ===================================================== */

    const attempts = await Attempt.find({
      studentId,
      testId: { $in: activeTestIds },
      status: { $in: ["COMPLETED", "AUTO_SUBMITTED"] },
    }).sort({ submittedAt: -1 });

    const totalAttempts = attempts.length;

    /* =====================================================
       📊 GLOBAL STATS
    ===================================================== */

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

    /* =====================================================
       🎯 SERIES DATA
    ===================================================== */

    const smartSeries = activeEnrollments.map((enrollment) => {
      const series = enrollment.testSeriesId;
      const seriesId = series._id;

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

      /* 🔥 Same Expiry Calculation */

      let expiryDate = null;

      if (series.startDate && series.duration) {
        const start = new Date(series.startDate);
        expiryDate = new Date(start);
        expiryDate.setDate(
          expiryDate.getDate() + series.duration
        );
      }

      return {
        _id: seriesId,
        title: series.title,
        expiryDate,
        totalTests,
        attemptedTests,
        pendingTests,
        progress,
      };
    });

    /* =====================================================
       📈 PERFORMANCE GRAPH
    ===================================================== */

    const performanceGraphData = attempts
      .slice(0, 10)
      .reverse()
      .map((a) => ({
        score: round2(a.score || 0),
        date: a.submittedAt,
      }));

    /* =====================================================
       🚀 RESPONSE
    ===================================================== */

    res.json({
      studentName: req.user.name,
      studentId,

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
    console.error("Dashboard Error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};
