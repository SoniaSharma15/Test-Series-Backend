import Attempt from "../models/Attempt.js";
import Question from "../models/Question.js";
import Test from "../models/Test.js";

/* 1️⃣ Start Attempt */
export const startAttempt = async (req, res) => {
  try {
    const { testId } = req.body;
    const studentId = req.user._id;

    const test = await Test.findById(testId);
    if (!test)
      return res.status(404).json({ message: "Test not found" });

    // ❌ Prevent ANY previous attempt
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
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      lastHeartbeat: new Date(),
    });

    res.status(201).json({
      attemptId: newAttempt._id,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const getPerformance = async (req, res) => {
  try {
    const studentId = req.user._id;

    const attempts = await Attempt.find({ studentId });

    const totalAttempts = attempts.length;

    let averageScore = 0;
    let highestScore = 0;
    let passCount = 0;

    for (const attempt of attempts) {
      averageScore += attempt.score;

      if (attempt.score > highestScore) {
        highestScore = attempt.score;
      }

      const test = await Test.findById(attempt.testId);

      if (test && attempt.score >= test.passingMarks) {
        passCount++;
      }
    }

    if (totalAttempts > 0) {
      averageScore = averageScore / totalAttempts;
    }

    const passFailRatio =
      totalAttempts > 0
        ? `${passCount}/${totalAttempts}`
        : "0/0";

    const recentResults = attempts
      .sort((a, b) => b.submittedAt - a.submittedAt)
      .slice(0, 5);

      // ✅ GET LATEST ATTEMPT WITH BATCH + TEST NAME
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

const latestBatchName =
  latestAttempt?.testId?.testSeriesId?.title || "N/A";

const latestTestName =
  latestAttempt?.testId?.name || "N/A";


    res.json({
      totalAttempts,
      averageScore,
      highestScore,
      passFailRatio,
      recentResults,
        latestBatchName,     // ✅ ADD THIS
  latestTestName       // ✅ ADD THIS
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getExamData = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await Attempt.findById(attemptId)
      .populate("testId");

    if (!attempt) {
      return res.status(404).json({
        status: "NOT_FOUND",
        message: "Attempt not found",
      });
    }

    if (attempt.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: "UNAUTHORIZED",
        message: "Unauthorized access",
      });
    }

    // ✅ Handle completed
    if (attempt.status === "COMPLETED" || attempt.status === "AUTO_SUBMITTED") {
      return res.status(409).json({
        status: "COMPLETED",
        message: "Exam already submitted",
      });
    }

    // ✅ Handle terminated
    if (attempt.status === "TERMINATED") {
      return res.status(403).json({
        status: "TERMINATED",
        message: "Exam terminated due to violations",
      });
    }

    // ✅ Server-side time validation
    const now = new Date();
    const elapsed = (now - attempt.startedAt) / 1000;

    if (elapsed > attempt.duration * 60) {
      attempt.status = "AUTO_SUBMITTED";
      attempt.submittedAt = new Date();
      await attempt.save();

      return res.status(409).json({
        status: "TIME_EXPIRED",
        message: "Time expired",
      });
    }

    const questions = await Question.find({
      testId: attempt.testId._id,
    });

    return res.json({
      status: "ACTIVE",
      test: attempt.testId,
      questions,
      startedAt: attempt.startedAt,
      duration: attempt.duration,
    });

  } catch (error) {
    return res.status(500).json({
      status: "SERVER_ERROR",
      message: error.message,
    });
  }
};





export const submitAttempt = async (req, res) => {
  try {
    const { attemptId, answers = [] } = req.body;

    /* ================= VALIDATE ATTEMPT ================= */

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (attempt.status !== "IN_PROGRESS") {
      return res.status(400).json({ message: "Already submitted" });
    }

    const now = new Date();
    const elapsedSeconds = (now - attempt.startedAt) / 1000;

    attempt.status =
      elapsedSeconds > attempt.duration * 60
        ? "AUTO_SUBMITTED"
        : "COMPLETED";

    /* ================= FETCH QUESTIONS ================= */

    const questions = await Question.find({
      testId: attempt.testId,
    }).lean();

    /* ================= FAST LOOKUP MAP ================= */

    const answerMap = new Map();

    for (const ans of answers) {
      if (!ans.questionId) continue;

      const key = ans.questionId.toString();

      // Prevent duplicate overwrite
      if (!answerMap.has(key)) {
        answerMap.set(key, ans);
      }
    }

    /* ================= NORMALIZATION ================= */

    const normalize = (val) =>
      String(val ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();

    const normalizeArray = (arr) =>
      (arr || []).map((a) => normalize(a));

    const safeNumber = (val) =>
      isNaN(Number(val)) ? 0 : Number(val);

    /* ================= SCORING ================= */

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let attemptedCount = 0;

    const evaluatedAnswers = [];

    for (const q of questions) {
      const studentAnswer = answerMap.get(q._id.toString());

      if (!studentAnswer) continue;

      let hasAnswer = false;

      if (q.type === "MSQ") {
        hasAnswer =
          Array.isArray(studentAnswer.selectedAnswers) &&
          studentAnswer.selectedAnswers.length > 0;
      } else {
        hasAnswer =
          studentAnswer.selectedAnswer !== undefined &&
          studentAnswer.selectedAnswer !== null &&
          studentAnswer.selectedAnswer !== "";
      }

      if (!hasAnswer) continue;

      attemptedCount++;

      let isCorrect = false;

      /* ================= MSQ ================= */

      if (q.type === "MSQ") {
        const correctSet = new Set(
          normalizeArray(q.correctAnswers)
        );

        const selectedSet = new Set(
          normalizeArray(studentAnswer.selectedAnswers)
        );

        isCorrect =
          correctSet.size === selectedSet.size &&
          [...correctSet].every((ans) =>
            selectedSet.has(ans)
          );
      }

      /* ================= OBJECTIVE ================= */

      else if (
        q.type !== "THEORETICAL" &&
        q.type !== "PASSAGE"
      ) {
        const studentVal = normalize(
          studentAnswer.selectedAnswer
        );
        const correctVal = normalize(q.correctAnswer);

        isCorrect = studentVal === correctVal;
      }

      /* ================= SCORE UPDATE ================= */

      if (isCorrect) {
        score += safeNumber(q.marks);
        correctCount++;
      } else {
        wrongCount++;

        if (q.negativeMarks) {
          score -= safeNumber(q.negativeMarks);
        }
      }

      /* Store evaluated result for future-proof result page */

      evaluatedAnswers.push({
        questionId: q._id,
        selectedAnswer: studentAnswer.selectedAnswer || null,
        selectedAnswers: studentAnswer.selectedAnswers || [],
        isCorrect,
      });
    }

    /* ================= FINALIZE ================= */

    score = Number(score.toFixed(2));

    attempt.answers = evaluatedAnswers; // store evaluated answers
    attempt.score = score;
    attempt.correctCount = correctCount;
    attempt.wrongCount = wrongCount;
    attempt.attemptedCount = attemptedCount;
    attempt.submittedAt = now;

    await attempt.save();

    return res.json({
      message: "Test submitted successfully",
      score,
      correctCount,
      wrongCount,
      attemptedCount,
      status: attempt.status,
    });

  } catch (error) {
    console.error("Submit Attempt Error:", error);
    return res.status(500).json({
      message: error.message || "Server Error",
    });
  }
};






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


export const getTestById = async (req, res) => {
  const test = await Test.findById(req.params.id);
  res.json(test);
};

export const heartbeat = async (req, res) => {
  const { attemptId } = req.body;

  await Attempt.findByIdAndUpdate(attemptId, {
    lastHeartbeat: new Date(),
  });

  res.json({ status: "alive" });
};


export const reportViolation = async (req, res) => {
  const { attemptId, type } = req.body;

  const attempt = await Attempt.findById(attemptId);

  if (!attempt || attempt.status !== "IN_PROGRESS")
    return res.json();

  if (type === "TAB") attempt.tabSwitchCount += 1;
  if (type === "FULLSCREEN") attempt.fullscreenExitCount += 1;

  if (attempt.tabSwitchCount >= 3) {
    attempt.status = "TERMINATED";
  }

  await attempt.save();

  res.json({ message: "Violation recorded" });
};


export const getPublicTestDetails = async (req, res) => {
  try {
    const { testId } = req.params;

    const test = await Test.findById(testId).select(
      "name duration totalMarks passingMarks"
    );

    if (!test) {
      return res.status(404).json({
        message: "Test not found",
      });
    }

    res.json(test);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


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

    if (!attempt) {
      return res.json(null);
    }

    const timeSpent =
      (new Date(attempt.submittedAt) - new Date(attempt.startedAt)) / 60000;

    res.json({
      batchName: attempt.testId?.testSeriesId?.title || "N/A",
      testName: attempt.testId?.name || "N/A",
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
