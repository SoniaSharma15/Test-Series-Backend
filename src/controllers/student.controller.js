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

export const getStudentGlobalRank = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const studentId = req.user._id.toString();
    const now = new Date();

    // 1) Current student's valid active enrollments
    const studentEnrollments = await Enrollment.find({
      studentId,
      status: "active",
      accessGranted: true,
    }).populate("testSeriesId");

    const validStudentEnrollments = studentEnrollments.filter((enrollment) => {
      const series = enrollment.testSeriesId;
      if (!series) return false;

      if (!series.startDate || !series.duration) return true;

      const start = new Date(series.startDate);
      const expiry = new Date(start);
      expiry.setDate(expiry.getDate() + series.duration);

      return now <= expiry;
    });

    if (validStudentEnrollments.length === 0) {
      return res.json({
        globalRank: null,
        message: "Student not enrolled in any active valid series",
      });
    }

    // 2) Get all valid enrollments of all students
    const allEnrollments = await Enrollment.find({
      status: "active",
      accessGranted: true,
    }).populate("testSeriesId", "_id startDate duration");

    const validEnrollments = allEnrollments.filter((enrollment) => {
      const series = enrollment.testSeriesId;
      if (!series) return false;

      if (!series.startDate || !series.duration) return true;

      const start = new Date(series.startDate);
      const expiry = new Date(start);
      expiry.setDate(expiry.getDate() + series.duration);

      return now <= expiry;
    });

    if (validEnrollments.length === 0) {
      return res.json({
        globalRank: null,
        message: "No active participants found",
      });
    }

    // 3) Allowed studentIds and testSeriesIds
    const validStudentIds = [...new Set(validEnrollments.map(e => e.studentId.toString()))];
    const validSeriesIds = [...new Set(validEnrollments.map(e => e.testSeriesId._id.toString()))];

    // 4) Tests only from valid active series
    const validTests = await Test.find({
      testSeriesId: { $in: validSeriesIds },
    }).select("_id testSeriesId");

    const validTestIds = validTests.map((t) => t._id.toString());

    // 5) Attempts only for valid students + valid tests
    const attempts = await Attempt.find({
      studentId: { $in: validStudentIds },
      testId: { $in: validTestIds },
      status: { $in: ["COMPLETED", "AUTO_SUBMITTED"] },
    }).select("studentId score correctCount attemptedCount testId");

    const statsMap = new Map();

    attempts.forEach((a) => {
      const sid = a.studentId.toString();

      if (!statsMap.has(sid)) {
        statsMap.set(sid, {
          studentId: sid,
          totalScore: 0,
          totalCorrect: 0,
          totalAttemptedQuestions: 0,
          totalAttempts: 0,
        });
      }

      const item = statsMap.get(sid);
      item.totalScore += a.score || 0;
      item.totalCorrect += a.correctCount || 0;
      item.totalAttemptedQuestions += a.attemptedCount || 0;
      item.totalAttempts += 1;
    });

    // only students who actually participated
    const leaderboard = Array.from(statsMap.values())
      .filter((s) => s.totalAttempts > 0)
      .map((s) => ({
        studentId: s.studentId,
        totalAttempts: s.totalAttempts,
        avgAccuracy:
          s.totalAttemptedQuestions > 0
            ? (s.totalCorrect / s.totalAttemptedQuestions) * 100
            : 0,
        averageScore:
          s.totalAttempts > 0 ? s.totalScore / s.totalAttempts : 0,
      }));

    leaderboard.sort((a, b) => {
      if (b.avgAccuracy !== a.avgAccuracy) {
        return b.avgAccuracy - a.avgAccuracy;
      }
      if (b.totalAttempts !== a.totalAttempts) {
        return b.totalAttempts - a.totalAttempts;
      }
      return b.averageScore - a.averageScore;
    });

    const currentStudent = leaderboard.find(
      (item) => item.studentId === studentId
    );

    if (!currentStudent) {
      return res.json({
        globalRank: null,
        message: "Student has not attempted any active test yet",
      });
    }

    const rankIndex = leaderboard.findIndex(
      (item) => item.studentId === studentId
    );

    return res.json({
      globalRank: rankIndex + 1,
      totalParticipants: leaderboard.length,
      totalAttempts: currentStudent.totalAttempts,
      avgAccuracy: Math.round(currentStudent.avgAccuracy * 100) / 100,
      averageScore: Math.round(currentStudent.averageScore * 100) / 100,
    });
  } catch (error) {
    console.error("Global Rank Error:", error);
    return res.status(500).json({ message: error.message });
  }
};