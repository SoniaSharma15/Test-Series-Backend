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

    // Prevent multiple active attempts
    const existing = await Attempt.findOne({
      studentId,
      testId,
      status: { $in: ["IN_PROGRESS"] },
    });

    if (existing) {
      return res.status(200).json({
        attemptId: existing._id,
        resumed: true,
      });
    }

    const attemptNumber =
      (await Attempt.countDocuments({ studentId, testId })) + 1;

    const attempt = await Attempt.create({
      studentId,
      testId,
      attemptNumber,
      duration: test.duration,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      lastHeartbeat: new Date(),
    });

    res.status(201).json({
      attemptId: attempt._id,
      resumed: false,
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

    if (!attempt)
      return res.status(404).json({ message: "Attempt not found" });

    if (attempt.studentId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Unauthorized" });

    if (attempt.status !== "IN_PROGRESS")
      return res.status(409).json({ message: "Already submitted" });

    const questions = await Question.find({
      testId: attempt.testId._id,
      isActive: true,
    }).lean();

    res.json({
      test: attempt.testId,
      questions,
      startedAt: attempt.startedAt,
      duration: attempt.duration,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const submitAttempt = async (req, res) => {
  try {
    const { attemptId, answers = [] } = req.body;

    const attempt = await Attempt.findById(attemptId);
    if (!attempt)
      return res.status(404).json({ message: "Attempt not found" });

    if (attempt.studentId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Unauthorized" });

    if (attempt.status !== "IN_PROGRESS")
      return res.status(400).json({ message: "Already submitted" });

    const questions = await Question.find({
      testId: attempt.testId,
      isActive: true,
    }).lean();

    /* =====================================================
       FLATTEN QUESTIONS (Handle PASSAGE)
    ===================================================== */

    const flattened = [];

    for (const q of questions) {
      if (q.type === "PASSAGE") {
        q.passageQuestions.forEach((child, index) => {
          flattened.push({
            parentId: q._id,
            childIndex: index,
            ...child,
          });
        });
      } else {
        flattened.push({
          parentId: q._id,
          childIndex: null,
          ...q,
        });
      }
    }

    /* =====================================================
       MAP STUDENT ANSWERS
    ===================================================== */

    const answerMap = new Map();

    for (const ans of answers) {
      const key = `${ans.questionId}_${ans.childIndex ?? "main"}`;
      answerMap.set(key, ans.selectedAnswers || []);
    }

    /* =====================================================
       SCORING
    ===================================================== */

    let totalMarks = 0;
    let obtainedMarks = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let attemptedCount = 0;

    const evaluatedAnswers = [];

    for (const q of flattened) {
      const key = `${q.parentId}_${q.childIndex ?? "main"}`;
      const selected = answerMap.get(key) || [];
      const correct = q.correctAnswers || [];

      totalMarks += q.marks;

      let isCorrect = false;
      let marksAwarded = 0;

      if (selected.length > 0) {
        attemptedCount++;

        const isExactMatch =
          selected.length === correct.length &&
          selected.every((a) => correct.includes(a));

        if (isExactMatch) {
          isCorrect = true;
          marksAwarded = q.marks;
          correctCount++;
        } else {
          marksAwarded = -Math.abs(q.negativeMarks || 0);
          wrongCount++;
        }

        obtainedMarks += marksAwarded;
      }

      evaluatedAnswers.push({
        questionId: q.parentId,
        childIndex: q.childIndex,
        questionType: q.type,
        selectedAnswers: selected,
        correctAnswersSnapshot: correct,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        isCorrect,
        marksAwarded,
      });
    }

    /* =====================================================
       FINALIZE ATTEMPT
    ===================================================== */

    attempt.answers = evaluatedAnswers;
    attempt.totalMarks = totalMarks;
    attempt.obtainedMarks = Number(obtainedMarks.toFixed(2));
    attempt.correctCount = correctCount;
    attempt.wrongCount = wrongCount;
    attempt.attemptedCount = attemptedCount;
    attempt.unattemptedCount = flattened.length - attemptedCount;
    attempt.submittedAt = new Date();
    attempt.status = "COMPLETED";

    await attempt.save();

    res.json({
      message: "Test submitted successfully",
      totalMarks,
      obtainedMarks: attempt.obtainedMarks,
      correctCount,
      wrongCount,
      attemptedCount,
      unattemptedCount: attempt.unattemptedCount,
    });

  } catch (error) {
    console.error("Submit Error:", error);
    res.status(500).json({ message: error.message });
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

    /* ==========================================
       TRANSFORM ANSWERS (HANDLE PASSAGE PROPERLY)
    ========================================== */

    const transformedAnswers = attempt.answers.map((ans) => {
      const parent = ans.questionId;

      let questionData = null;

      // 🔹 If Passage → pick child question
      if (parent.type === "PASSAGE" && ans.childIndex !== null) {
        questionData = parent.passageQuestions[ans.childIndex];
      } else {
        questionData = parent;
      }

      return {
        ...ans.toObject(),
        questionData, // 🔥 send proper question
      };
    });

    res.json({
      ...attempt.toObject(),
      answers: transformedAnswers,
    });

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
