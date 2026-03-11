import Enrollment from "../models/Enrollment.js";
import Test from "../models/Test.js";
import Attempt from "../models/Attempt.js";
import User from "../models/User.js";

const round2 = (num) => Math.round((Number(num) || 0) * 100) / 100;

const isSeriesActive = (series, now = new Date()) => {
  if (!series) return false;

  if (!series.startDate || !series.duration) return true;

  const start = new Date(series.startDate);
  const expiry = new Date(start);
  expiry.setDate(expiry.getDate() + Number(series.duration || 0));

  return now <= expiry;
};

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
       2️⃣ FILTER ACTIVE / NON-EXPIRED SERIES
    ===================================================== */
    const activeEnrollments = enrollments.filter((enrollment) =>
      isSeriesActive(enrollment.testSeriesId, now)
    );

    const activeSeriesIds = activeEnrollments.map((e) => e.testSeriesId._id);

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
      const score = Number(a.obtainedMarks) || 0;

      totalScore += score;
      totalCorrect += Number(a.correctCount) || 0;
      totalAttemptedQuestions += Number(a.attemptedCount) || 0;

      if (score > highestScore) {
        highestScore = score;
      }
    });

    const averageScore = totalAttempts > 0 ? totalScore / totalAttempts : 0;

    const avgAccuracy =
      totalAttemptedQuestions > 0
        ? (totalCorrect / totalAttemptedQuestions) * 100
        : 0;

    const lastScore = Number(attempts[0]?.obtainedMarks) || 0;

    /* =====================================================
       🎯 SERIES DATA
    ===================================================== */
    const smartSeries = activeEnrollments.map((enrollment) => {
      const series = enrollment.testSeriesId;
      const seriesId = series._id.toString();

      const seriesTests = activeTests.filter(
        (t) => t.testSeriesId.toString() === seriesId
      );

      const seriesTestIds = seriesTests.map((t) => t._id.toString());

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

      let expiryDate = null;

      if (series.startDate && series.duration) {
        const start = new Date(series.startDate);
        expiryDate = new Date(start);
        expiryDate.setDate(expiryDate.getDate() + Number(series.duration));
      }

      return {
        _id: series._id,
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
        score: round2(Number(a.obtainedMarks) || 0),
        date: a.submittedAt,
      }));

    /* =====================================================
       🚀 RESPONSE
    ===================================================== */
    return res.json({
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
    return res.status(500).json({
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

    /* =====================================================
       1️⃣ CURRENT STUDENT VALID ACTIVE ENROLLMENTS
    ===================================================== */
    const studentEnrollments = await Enrollment.find({
      studentId,
      status: "active",
      accessGranted: true,
    }).populate("testSeriesId");

    const validStudentEnrollments = studentEnrollments.filter((enrollment) =>
      isSeriesActive(enrollment.testSeriesId, now)
    );

    if (validStudentEnrollments.length === 0) {
      return res.json({
        globalRank: null,
        message: "Student not enrolled in any active valid series",
      });
    }

    /* =====================================================
       2️⃣ ALL VALID ACTIVE ENROLLMENTS
    ===================================================== */
    const allEnrollments = await Enrollment.find({
      status: "active",
      accessGranted: true,
    }).populate("testSeriesId", "_id startDate duration");

    const validEnrollments = allEnrollments.filter((enrollment) =>
      isSeriesActive(enrollment.testSeriesId, now)
    );

    if (validEnrollments.length === 0) {
      return res.json({
        globalRank: null,
        message: "No active participants found",
      });
    }

    /* =====================================================
       3️⃣ VALID STUDENTS + SERIES
    ===================================================== */
    const validStudentIds = [
      ...new Set(validEnrollments.map((e) => e.studentId.toString())),
    ];

    const validSeriesIds = [
      ...new Set(validEnrollments.map((e) => e.testSeriesId._id.toString())),
    ];

    /* =====================================================
       4️⃣ VALID TESTS
    ===================================================== */
    const validTests = await Test.find({
      testSeriesId: { $in: validSeriesIds },
    }).select("_id testSeriesId");

    const validTestIds = validTests.map((t) => t._id.toString());

    /* =====================================================
       5️⃣ ATTEMPTS
    ===================================================== */
    const attempts = await Attempt.find({
      studentId: { $in: validStudentIds },
      testId: { $in: validTestIds },
      status: { $in: ["COMPLETED", "AUTO_SUBMITTED"] },
    }).select(
      "studentId obtainedMarks totalMarks correctCount attemptedCount submittedAt"
    );

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
      item.totalScore += Number(a.obtainedMarks) || 0;
      item.totalCorrect += Number(a.correctCount) || 0;
      item.totalAttemptedQuestions += Number(a.attemptedCount) || 0;
      item.totalAttempts += 1;
    });

    /* =====================================================
       6️⃣ LEADERBOARD
    ===================================================== */
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
      avgAccuracy: round2(currentStudent.avgAccuracy),
      averageScore: round2(currentStudent.averageScore),
    });
  } catch (error) {
    console.error("Global Rank Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const getStudentLeaderboard = async (req, res) => {
  try {
    const now = new Date();

    /* =====================================================
       1️⃣ ALL VALID ACTIVE ENROLLMENTS
    ===================================================== */
    const allEnrollments = await Enrollment.find({
      status: "active",
      accessGranted: true,
    }).populate("testSeriesId", "_id startDate duration");

    const validEnrollments = allEnrollments.filter((enrollment) =>
      isSeriesActive(enrollment.testSeriesId, now)
    );

    if (validEnrollments.length === 0) {
      return res.json({
        totalParticipants: 0,
        leaderboard: [],
        message: "No active leaderboard data found",
      });
    }

    const validStudentIds = [
      ...new Set(validEnrollments.map((e) => e.studentId.toString())),
    ];

    const validSeriesIds = [
      ...new Set(validEnrollments.map((e) => e.testSeriesId._id.toString())),
    ];

    /* =====================================================
       2️⃣ VALID TESTS
    ===================================================== */
    const validTests = await Test.find({
      testSeriesId: { $in: validSeriesIds },
    }).select("_id");

    const validTestIds = validTests.map((t) => t._id.toString());

    /* =====================================================
       3️⃣ ATTEMPTS
    ===================================================== */
    const attempts = await Attempt.find({
      studentId: { $in: validStudentIds },
      testId: { $in: validTestIds },
      status: { $in: ["COMPLETED", "AUTO_SUBMITTED"] },
    }).select(
      "studentId obtainedMarks totalMarks correctCount attemptedCount submittedAt"
    );

    /* =====================================================
       4️⃣ STUDENT INFO
    ===================================================== */
    const students = await User.find({
      _id: { $in: validStudentIds },
      role: "student",
    }).select("_id name ");

    const studentMap = new Map(
      students.map((s) => [
        s._id.toString(),
        {
          name: s.name,
        },
      ])
    );

    /* =====================================================
       5️⃣ AGGREGATE
    ===================================================== */
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
          highestScore: 0,
          lastAttemptedAt: null,
        });
      }

      const item = statsMap.get(sid);
      const score = Number(a.obtainedMarks) || 0;

      item.totalScore += score;
      item.totalCorrect += Number(a.correctCount) || 0;
      item.totalAttemptedQuestions += Number(a.attemptedCount) || 0;
      item.totalAttempts += 1;
      item.highestScore = Math.max(item.highestScore, score);

      if (
        !item.lastAttemptedAt ||
        new Date(a.submittedAt) > new Date(item.lastAttemptedAt)
      ) {
        item.lastAttemptedAt = a.submittedAt;
      }
    });

    /* =====================================================
       6️⃣ BUILD LEADERBOARD
    ===================================================== */
    const leaderboard = Array.from(statsMap.values())
      .filter((s) => s.totalAttempts > 0)
      .map((s) => {
        const student = studentMap.get(s.studentId);

        const averageScore =
          s.totalAttempts > 0 ? s.totalScore / s.totalAttempts : 0;

        const avgAccuracy =
          s.totalAttemptedQuestions > 0
            ? (s.totalCorrect / s.totalAttemptedQuestions) * 100
            : 0;

        return {
          studentId: s.studentId,
          name: student?.name || "Unknown Student",
          totalAttempts: s.totalAttempts,
          averageScore: round2(averageScore),
          successRate: round2(avgAccuracy),
          highestScore: round2(s.highestScore),
          lastAttemptedAt: s.lastAttemptedAt,
        };
      });

    /* =====================================================
       7️⃣ SORT
    ===================================================== */
    leaderboard.sort((a, b) => {
      if (b.successRate !== a.successRate) {
        return b.successRate - a.successRate;
      }
      if (b.totalAttempts !== a.totalAttempts) {
        return b.totalAttempts - a.totalAttempts;
      }
      return b.averageScore - a.averageScore;
    });

    /* =====================================================
       8️⃣ TOP 10
    ===================================================== */
    const top10 = leaderboard.slice(0, 10).map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

    return res.json({
      totalParticipants: leaderboard.length,
      leaderboard: top10,
    });
  } catch (error) {
    console.error("Leaderboard Error:", error);
    return res.status(500).json({ message: error.message });
  }
};