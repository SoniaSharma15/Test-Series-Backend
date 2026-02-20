import Attempt from "../models/Attempt.js";
import Question from "../models/Question.js";
import Test from "../models/Test.js";

/* =====================================================
   1️⃣ START ATTEMPT
===================================================== */
export const startAttempt = async (req, res) => {
  try {
    const { testId } = req.body;
    const studentId = req.user._id;

    const test = await Test.findById(testId);
    if (!test)
      return res.status(404).json({ message: "Test not found" });

    const existingAttempt = await Attempt.findOne({
      studentId,
      testId,
      status: { $in: ["IN_PROGRESS", "COMPLETED", "AUTO_SUBMITTED"] },
    });

    if (existingAttempt) {
      return res.status(400).json({
        message: "You have already attempted this test",
        alreadyAttempted: true,
      });
    }

    const newAttempt = await Attempt.create({
      studentId,
      testId,
      attemptNumber: 1,
      duration: test.duration,
      startedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      lastHeartbeat: new Date(),
      status: "IN_PROGRESS",
      tabSwitchCount: 0,
      fullscreenExitCount: 0,
    });

    res.status(201).json({ attemptId: newAttempt._id });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   2️⃣ GET PERFORMANCE
===================================================== */
export const getPerformance = async (req, res) => {
  try {
    const studentId = req.user._id;

    const attempts = await Attempt.find({ studentId })
      .populate("testId");

    const totalAttempts = attempts.length;

    let averageScore = 0;
    let highestScore = 0;
    let passCount = 0;

    for (const attempt of attempts) {
      const score = attempt.score || 0;

      averageScore += score;
      if (score > highestScore) highestScore = score;

      if (
        attempt.testId &&
        score >= attempt.testId.passingMarks
      ) {
        passCount++;
      }
    }

    averageScore =
      totalAttempts > 0
        ? Number((averageScore / totalAttempts).toFixed(2))
        : 0;

    const passFailRatio =
      totalAttempts > 0 ? `${passCount}/${totalAttempts}` : "0/0";

    const recentResults = attempts
      .filter(a => a.submittedAt)
      .sort((a, b) => b.submittedAt - a.submittedAt)
      .slice(0, 5);

    const latestAttempt = await Attempt.findOne({
      studentId,
      status: { $in: ["COMPLETED", "AUTO_SUBMITTED"] }
    })
      .sort({ submittedAt: -1 })
      .populate({
        path: "testId",
        populate: {
          path: "testSeriesId",
          select: "title"
        }
      });

    res.json({
      totalAttempts,
      averageScore,
      highestScore,
      passFailRatio,
      recentResults,
      latestBatchName:
        latestAttempt?.testId?.testSeriesId?.title || "N/A",
      latestTestName:
        latestAttempt?.testId?.name || "N/A"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   3️⃣ GET EXAM DATA
===================================================== */
export const getExamData = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await Attempt.findById(attemptId)
      .populate("testId");

    if (!attempt)
      return res.status(404).json({ status: "NOT_FOUND" });

    if (attempt.studentId.toString() !== req.user._id.toString())
      return res.status(403).json({ status: "UNAUTHORIZED" });

    if (["COMPLETED", "AUTO_SUBMITTED"].includes(attempt.status))
      return res.status(409).json({ status: "COMPLETED" });

    if (attempt.status === "TERMINATED")
      return res.status(403).json({ status: "TERMINATED" });

    const elapsed =
      (Date.now() - new Date(attempt.startedAt)) / 1000;

    if (elapsed > attempt.duration * 60) {
      attempt.status = "AUTO_SUBMITTED";
      attempt.submittedAt = new Date();
      await attempt.save();
      return res.status(409).json({ status: "TIME_EXPIRED" });
    }

    const questions = await Question.find({
      testId: attempt.testId._id
    }).sort({ createdAt: 1 });

    res.json({
      status: "ACTIVE",
      test: attempt.testId,
      questions,
      startedAt: attempt.startedAt,
      duration: attempt.duration,
    });

  } catch (error) {
    res.status(500).json({
      status: "SERVER_ERROR",
      message: error.message,
    });
  }
};

/* =====================================================
   4️⃣ SUBMIT ATTEMPT
===================================================== */
export const submitAttempt = async (req, res) => {
  try {
    const { attemptId } = req.body;
    const answers = Array.isArray(req.body.answers)
      ? req.body.answers
      : [];

    const attempt = await Attempt.findById(attemptId);
    if (!attempt)
      return res.status(404).json({ message: "Attempt not found" });

    if (attempt.status !== "IN_PROGRESS")
      return res.status(400).json({ message: "Already submitted" });

    const elapsed =
      (Date.now() - new Date(attempt.startedAt)) / 1000;

    attempt.status =
      elapsed > attempt.duration * 60
        ? "AUTO_SUBMITTED"
        : "COMPLETED";

    const questions = await Question.find({
      testId: attempt.testId,
    });

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let attemptedCount = 0;

    questions.forEach((q) => {
      const studentAnswer = answers.find(
        (a) => String(a.questionId) === String(q._id)
      );

      if (!studentAnswer) return;

      let hasAnswer = false;

      if (q.type === "MSQ") {
        hasAnswer =
          Array.isArray(studentAnswer.selectedAnswers) &&
          studentAnswer.selectedAnswers.length > 0;
      } else {
        hasAnswer = !!studentAnswer.selectedAnswer;
      }

      if (!hasAnswer) return;

      attemptedCount++;

      let isCorrect = false;

      if (q.type === "MSQ") {
        const correctSet = new Set(q.correctAnswers || []);
        const selectedSet = new Set(
          studentAnswer.selectedAnswers || []
        );

        isCorrect =
          correctSet.size === selectedSet.size &&
          [...correctSet].every(ans => selectedSet.has(ans));
      } else {
        isCorrect =
          studentAnswer.selectedAnswer === q.correctAnswer;
      }

      if (isCorrect) {
        score += Number(q.marks) || 0;
        correctCount++;
      } else {
        wrongCount++;
        score -= Number(q.negativeMarks) || 0;
      }
    });

    score = Number(score.toFixed(2));

    attempt.answers = answers;
    attempt.score = score;
    attempt.correctCount = correctCount;
    attempt.wrongCount = wrongCount;
    attempt.attemptedCount = attemptedCount;
    attempt.submittedAt = new Date();

    await attempt.save();

    res.json({ message: "Test submitted", score });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   5️⃣ GET RESULT
===================================================== */
export const getResult = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await Attempt.findById(attemptId)
      .populate("testId")
      .populate("answers.questionId");

    if (!attempt)
      return res.status(404).json({ message: "Not found" });

    res.json(attempt);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   6️⃣ HEARTBEAT
===================================================== */
export const heartbeat = async (req, res) => {
  const { attemptId } = req.body;

  await Attempt.findByIdAndUpdate(attemptId, {
    lastHeartbeat: new Date(),
  });

  res.json({ status: "alive" });
};

/* =====================================================
   7️⃣ VIOLATION
===================================================== */
export const reportViolation = async (req, res) => {
  const { attemptId, type } = req.body;

  const attempt = await Attempt.findById(attemptId);
  if (!attempt || attempt.status !== "IN_PROGRESS")
    return res.json();

  attempt.tabSwitchCount =
    (attempt.tabSwitchCount || 0) +
    (type === "TAB" ? 1 : 0);

  attempt.fullscreenExitCount =
    (attempt.fullscreenExitCount || 0) +
    (type === "FULLSCREEN" ? 1 : 0);

  if (
    attempt.tabSwitchCount >= 3 ||
    attempt.fullscreenExitCount >= 3
  ) {
    attempt.status = "TERMINATED";
  }

  await attempt.save();

  res.json({ message: "Violation recorded" });
};

/* =====================================================
   8️⃣ PUBLIC TEST DETAILS
===================================================== */
export const getPublicTestDetails = async (req, res) => {
  try {
    const { testId } = req.params;

    const test = await Test.findById(testId)
      .select("name duration totalMarks passingMarks");

    if (!test)
      return res.status(404).json({ message: "Test not found" });

    res.json(test);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   9️⃣ RECENT PERFORMANCE
===================================================== */
export const getRecentPerformance = async (req, res) => {
  try {
    const studentId = req.user._id;

    const attempt = await Attempt.findOne({
      studentId,
      status: { $in: ["COMPLETED", "AUTO_SUBMITTED"] }
    })
      .sort({ submittedAt: -1 })
      .populate({
        path: "testId",
        populate: {
          path: "testSeriesId",
          select: "title"
        }
      });

    if (!attempt) return res.json(null);

    const timeSpent =
      (new Date(attempt.submittedAt) -
        new Date(attempt.startedAt)) / 60000;

    res.json({
      batchName:
        attempt.testId?.testSeriesId?.title || "N/A",
      testName:
        attempt.testId?.name || "N/A",
      score: attempt.score,
      timeSpent: Math.round(timeSpent),
      attempted: attempt.attemptedCount,
      correct: attempt.correctCount,
      wrong: attempt.wrongCount,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
