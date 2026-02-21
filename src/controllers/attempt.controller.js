import Attempt from "../models/Attempt.js";
import Question from "../models/Question.js";
import Test from "../models/Test.js";
import mongoose from "mongoose";
/* =====================================================
   1️⃣ START ATTEMPT
===================================================== */
export const startAttempt = async (req, res, next) => {
  try {
    const { testId } = req.body;
    const studentId = req.user?._id;

    /* ================= VALIDATION ================= */

    if (!testId) {
      const err = new Error("TestId is required");
      err.statusCode = 400;
      throw err;
    }

    if (!studentId) {
      const err = new Error("Unauthorized");
      err.statusCode = 401;
      throw err;
    }

    /* ================= CHECK TEST ================= */

    const test = await Test.findById(testId);

    if (!test) {
      const err = new Error("Test not found");
      err.statusCode = 404;
      throw err;
    }

    /* ================= PREVENT MULTIPLE ACTIVE ================= */

    const existingAttempt = await Attempt.findOne({
      studentId,
      testId,
      status: "IN_PROGRESS",
    });

    if (existingAttempt) {
      return res.status(200).json({
        success: true,
        attemptId: existingAttempt._id,
        resumed: true,
      });
    }

    /* ================= ATTEMPT NUMBER ================= */

    const attemptCount = await Attempt.countDocuments({
      studentId,
      testId,
    });

    const attemptNumber = attemptCount + 1;

    /* ================= CREATE ATTEMPT ================= */

    const attempt = await Attempt.create({
      studentId,
      testId,
      attemptNumber,
      duration: test.duration,
      startedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "unknown",
      lastHeartbeat: new Date(),
      status: "IN_PROGRESS",
      tabSwitchCount: 0,
      fullscreenExitCount: 0,
    });

    /* ================= RESPONSE ================= */

    res.status(201).json({
      success: true,
      attemptId: attempt._id,
      resumed: false,
    });

  } catch (error) {
    next(error);
  }
};

/* =====================================================
   2️⃣ GET PERFORMANCE
===================================================== */
export const getPerformance = async (req, res, next) => {
  try {
    const studentId = req.user?._id;

    if (!studentId) {
      const err = new Error("Unauthorized");
      err.statusCode = 401;
      throw err;
    }

    /* ================= FETCH COMPLETED ATTEMPTS ================= */

    const attempts = await Attempt.find({
      studentId,
      status: { $in: ["COMPLETED", "AUTO_SUBMITTED"] },
    })
      .populate({
        path: "testId",
        populate: {
          path: "testSeriesId",
          select: "title",
        },
      })
      .sort({ submittedAt: -1 }); // DB level sorting

    const totalAttempts = attempts.length;

    if (totalAttempts === 0) {
      return res.json({
        success: true,
        totalAttempts: 0,
        averageScore: 0,
        highestScore: 0,
        passFailRatio: "0/0",
        recentResults: [],
        latestBatchName: "N/A",
        latestTestName: "N/A",
      });
    }

    /* ================= CALCULATIONS ================= */

    let totalPercentage = 0;
    let highestScore = 0;
    let passCount = 0;

    for (const attempt of attempts) {
      const totalMarks = attempt.totalMarks || 0;
      const obtainedMarks = attempt.obtainedMarks || 0;

      const percentage =
        totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;

      totalPercentage += percentage;

      if (percentage > highestScore) {
        highestScore = percentage;
      }

      const passingMarks = attempt.testId?.passingMarks || 0;

      if (percentage >= passingMarks) {
        passCount++;
      }
    }

    const averageScore = totalPercentage / totalAttempts;
    const passFailRatio = `${passCount}/${totalAttempts}`;

    /* ================= RECENT RESULTS ================= */

    const recentResults = attempts.slice(0, 5).map((attempt) => {
      const totalMarks = attempt.totalMarks || 0;
      const obtainedMarks = attempt.obtainedMarks || 0;

      return {
        score:
          totalMarks > 0
            ? (obtainedMarks / totalMarks) * 100
            : 0,
      };
    });

    /* ================= LATEST ATTEMPT INFO ================= */

    const latestAttempt = attempts[0];

    const latestBatchName =
      latestAttempt?.testId?.testSeriesId?.title || "N/A";

    const latestTestName =
      latestAttempt?.testId?.name || "N/A";

    /* ================= RESPONSE ================= */

    res.status(200).json({
      success: true,
      totalAttempts,
      averageScore: Number(averageScore.toFixed(2)),
      highestScore: Number(highestScore.toFixed(2)),
      passFailRatio,
      recentResults,
      latestBatchName,
      latestTestName,
    });

  } catch (error) {
    next(error);
  }
};


export const getExamData = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user?._id;

    /* ================= VALIDATION ================= */

    if (!attemptId) {
      const err = new Error("AttemptId is required");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      const err = new Error("Invalid AttemptId");
      err.statusCode = 400;
      throw err;
    }

    if (!studentId) {
      const err = new Error("Unauthorized");
      err.statusCode = 401;
      throw err;
    }

    /* ================= FETCH ATTEMPT ================= */

    const attempt = await Attempt.findById(attemptId)
      .populate("testId");

    if (!attempt) {
      const err = new Error("Attempt not found");
      err.statusCode = 404;
      throw err;
    }

    /* ================= OWNERSHIP CHECK ================= */

    if (attempt.studentId.toString() !== studentId.toString()) {
      const err = new Error("Unauthorized access");
      err.statusCode = 403;
      throw err;
    }

    /* ================= STATUS CHECK ================= */

    if (attempt.status !== "IN_PROGRESS") {
      const err = new Error("Test already submitted");
      err.statusCode = 409;
      throw err;
    }

    /* ================= FETCH QUESTIONS ================= */

    const questions = await Question.find({
      testId: attempt.testId._id,
      isActive: true,
    })
      .select("-correctAnswer -explanation") // 🔥 prevent cheating
      .lean();

    /* ================= RESPONSE ================= */

    res.status(200).json({
      success: true,
      test: attempt.testId,
      questions,
      startedAt: attempt.startedAt,
      duration: attempt.duration,
    });

  } catch (error) {
    next(error);
  }
};



export const submitAttempt = async (req, res, next) => {
  try {
    const { attemptId, answers = [] } = req.body;
    const studentId = req.user?._id;

    /* ================= VALIDATION ================= */

    if (!attemptId) {
      const err = new Error("AttemptId is required");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      const err = new Error("Invalid AttemptId");
      err.statusCode = 400;
      throw err;
    }

    const attempt = await Attempt.findById(attemptId);

    if (!attempt) {
      const err = new Error("Attempt not found");
      err.statusCode = 404;
      throw err;
    }

    if (attempt.studentId.toString() !== studentId.toString()) {
      const err = new Error("Unauthorized");
      err.statusCode = 403;
      throw err;
    }

    if (attempt.status !== "IN_PROGRESS") {
      const err = new Error("Attempt already submitted");
      err.statusCode = 409;
      throw err;
    }

    /* ================= FETCH QUESTIONS ================= */

    const questions = await Question.find({
      testId: attempt.testId,
      isActive: true,
    }).lean();

    /* ================= FLATTEN QUESTIONS ================= */

    const flattened = [];

    for (const q of questions) {
      if (q.type === "PASSAGE") {
        q.passageQuestions?.forEach((child, index) => {
          flattened.push({
            parentId: q._id.toString(),
            childIndex: index,
            ...child,
          });
        });
      } else {
        flattened.push({
          parentId: q._id.toString(),
          childIndex: null,
          ...q,
        });
      }
    }

    /* ================= MAP ANSWERS ================= */

    const answerMap = new Map();

    for (const ans of answers) {
      if (!ans.questionId) continue;

      const key = `${ans.questionId}_${ans.childIndex ?? "main"}`;

      let selected = [];

      if (Array.isArray(ans.selectedAnswers)) {
        selected = ans.selectedAnswers;
      } else if (ans.selectedAnswer) {
        selected = [ans.selectedAnswer];
      }

      answerMap.set(key, selected);
    }

    /* ================= SCORING ================= */

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

      const questionMarks = Number(q.marks) || 0;
      const negativeMarks = Number(q.negativeMarks) || 0;

      totalMarks += questionMarks;

      let isCorrect = false;
      let marksAwarded = 0;

      if (selected.length > 0) {
        attemptedCount++;

        const isExactMatch =
          selected.length === correct.length &&
          selected.every((a) => correct.includes(a));

        if (isExactMatch) {
          isCorrect = true;
          marksAwarded = questionMarks;
          correctCount++;
        } else {
          marksAwarded = -Math.abs(negativeMarks);
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
        marks: questionMarks,
        negativeMarks,
        isCorrect,
        marksAwarded,
      });
    }

    /* ================= FINALIZE ================= */

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

    /* ================= RESPONSE ================= */

    res.status(200).json({
      success: true,
      message: "Test submitted successfully",
      totalMarks,
      obtainedMarks: attempt.obtainedMarks,
      correctCount,
      wrongCount,
      attemptedCount,
      unattemptedCount: attempt.unattemptedCount,
    });

  } catch (error) {
    next(error);
  }
};


export const getResult = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user?._id;

    /* ================= VALIDATION ================= */

    if (!attemptId) {
      const err = new Error("AttemptId is required");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      const err = new Error("Invalid AttemptId");
      err.statusCode = 400;
      throw err;
    }

    const attempt = await Attempt.findById(attemptId)
      .populate("testId")
      .populate("answers.questionId");

    if (!attempt) {
      const err = new Error("Result not found");
      err.statusCode = 404;
      throw err;
    }

    /* ================= OWNERSHIP CHECK ================= */

    if (attempt.studentId.toString() !== studentId.toString()) {
      const err = new Error("Unauthorized access");
      err.statusCode = 403;
      throw err;
    }

    /* ================= STATUS CHECK ================= */

    if (!["COMPLETED", "AUTO_SUBMITTED"].includes(attempt.status)) {
      const err = new Error("Result not available yet");
      err.statusCode = 409;
      throw err;
    }

    /* ================= TRANSFORM ANSWERS ================= */

    const transformedAnswers = attempt.answers.map((ans) => {
      const parent = ans.questionId;

      let questionData = null;

      if (
        parent?.type === "PASSAGE" &&
        ans.childIndex !== null &&
        parent.passageQuestions?.[ans.childIndex]
      ) {
        questionData = parent.passageQuestions[ans.childIndex];
      } else {
        questionData = parent;
      }

      return {
        ...ans.toObject(),
        questionData,
      };
    });

    /* ================= RESPONSE ================= */

    res.status(200).json({
      success: true,
      ...attempt.toObject(),
      answers: transformedAnswers,
    });

  } catch (error) {
    next(error);
  }
};



export const getTestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    /* ================= VALIDATION ================= */

    if (!id) {
      const err = new Error("Test ID is required");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid Test ID");
      err.statusCode = 400;
      throw err;
    }

    /* ================= FETCH TEST ================= */

    const test = await Test.findById(id);

    if (!test) {
      const err = new Error("Test not found");
      err.statusCode = 404;
      throw err;
    }

    /* ================= RESPONSE ================= */

    res.status(200).json({
      success: true,
      data: test,
    });

  } catch (error) {
    next(error);
  }
};

export const heartbeat = async (req, res, next) => {
  try {
    const { attemptId } = req.body;
    const studentId = req.user?._id;

    /* ================= VALIDATION ================= */

    if (!attemptId) {
      const err = new Error("AttemptId is required");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      const err = new Error("Invalid AttemptId");
      err.statusCode = 400;
      throw err;
    }

    /* ================= FIND ATTEMPT ================= */

    const attempt = await Attempt.findById(attemptId);

    if (!attempt) {
      const err = new Error("Attempt not found");
      err.statusCode = 404;
      throw err;
    }

    /* ================= OWNERSHIP CHECK ================= */

    if (attempt.studentId.toString() !== studentId.toString()) {
      const err = new Error("Unauthorized");
      err.statusCode = 403;
      throw err;
    }

    /* ================= STATUS CHECK ================= */

    if (attempt.status !== "IN_PROGRESS") {
      const err = new Error("Attempt already submitted");
      err.statusCode = 409;
      throw err;
    }

    /* ================= UPDATE HEARTBEAT ================= */

    attempt.lastHeartbeat = new Date();
    await attempt.save();

    res.status(200).json({
      success: true,
      status: "alive",
    });

  } catch (error) {
    next(error);
  }
};


const evaluateAttempt = async (attempt, submittedAnswers = []) => {

  const questions = await Question.find({
    testId: attempt.testId,
    isActive: true,
  }).lean();

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

  let totalMarks = 0;
  let obtainedMarks = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let attemptedCount = 0;

  const evaluatedAnswers = [];

  for (const q of flattened) {
    totalMarks += q.marks;

    evaluatedAnswers.push({
      questionId: q.parentId,
      childIndex: q.childIndex,
      questionType: q.type,
      selectedAnswers: [],
      correctAnswersSnapshot: q.correctAnswers || [],
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      isCorrect: false,
      marksAwarded: 0,
    });
  }

  attempt.answers = evaluatedAnswers;
  attempt.totalMarks = totalMarks;
  attempt.obtainedMarks = obtainedMarks;
  attempt.correctCount = correctCount;
  attempt.wrongCount = wrongCount;
  attempt.attemptedCount = attemptedCount;
  attempt.unattemptedCount = flattened.length;
};


export const reportViolation = async (req, res, next) => {
  try {
    const { attemptId, type } = req.body;
    const studentId = req.user?._id;

    /* ================= VALIDATION ================= */

    if (!attemptId || !type) {
      const err = new Error("AttemptId and type are required");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      const err = new Error("Invalid AttemptId");
      err.statusCode = 400;
      throw err;
    }

    // 🔒 Only serious violations allowed
    const allowedTypes = ["TAB", "FULLSCREEN"];

    if (!allowedTypes.includes(type)) {
      const err = new Error("Invalid violation type");
      err.statusCode = 400;
      throw err;
    }

    /* ================= ATOMIC UPDATE ================= */

    const updateField =
      type === "TAB"
        ? { $inc: { tabSwitchCount: 1 } }
        : { $inc: { fullscreenExitCount: 1 } };

    const attempt = await Attempt.findOneAndUpdate(
      {
        _id: attemptId,
        studentId,
        status: "IN_PROGRESS",
      },
      updateField,
      {
        returnDocument: "after", // ✅ Mongoose 7+
      }
    );

    if (!attempt) {
      return res.status(200).json({
        success: true,
        shouldAutoSubmit: false,
        totalViolations: 0,
      });
    }

    /* ================= COUNT TOTAL ================= */

    const totalViolations =
      (attempt.tabSwitchCount || 0) +
      (attempt.fullscreenExitCount || 0);

    const shouldAutoSubmit = totalViolations >= 5;

    /* ================= RESPONSE ================= */

    res.status(200).json({
      success: true,
      shouldAutoSubmit,
      totalViolations,
    });

  } catch (error) {
    next(error);
  }
};


export const getPublicTestDetails = async (req, res, next) => {
  try {
    const { testId } = req.params;

    /* ================= VALIDATION ================= */

    if (!testId) {
      const err = new Error("TestId is required");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      const err = new Error("Invalid TestId");
      err.statusCode = 400;
      throw err;
    }

    /* ================= FETCH TEST ================= */

    const test = await Test.findById(testId)
      .select("name duration totalMarks passingMarks");

    if (!test) {
      const err = new Error("Test not found");
      err.statusCode = 404;
      throw err;
    }

    /* ================= RESPONSE ================= */

    res.status(200).json({
      success: true,
      data: test,
    });

  } catch (error) {
    next(error);
  }
};

/* =====================================================
   9️⃣ RECENT PERFORMANCE
===================================================== */
export const getRecentPerformance = async (req, res, next) => {
  try {
    const studentId = req.user?._id;

    if (!studentId) {
      const err = new Error("Unauthorized");
      err.statusCode = 401;
      throw err;
    }

    /* ================= FETCH LATEST COMPLETED ATTEMPT ================= */

    const attempt = await Attempt.findOne({
      studentId,
      status: { $in: ["COMPLETED", "AUTO_SUBMITTED"] },
    })
      .sort({ submittedAt: -1 })
      .populate({
        path: "testId",
        populate: {
          path: "testSeriesId",
          select: "title",
        },
      });

    if (!attempt) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    /* ================= CALCULATE PERCENTAGE ================= */

    const totalMarks = Number(attempt.totalMarks) || 0;
    const obtainedMarks = Number(attempt.obtainedMarks) || 0;

    const percentage =
      totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;

    /* ================= CALCULATE TIME ================= */

    let timeSpent = 0;

    if (attempt.startedAt && attempt.submittedAt) {
      timeSpent =
        (new Date(attempt.submittedAt) - new Date(attempt.startedAt)) /
        60000;
    }

    /* ================= RESPONSE ================= */

    res.status(200).json({
      success: true,
      data: {
        batchName:
          attempt.testId?.testSeriesId?.title || "N/A",
        testName: attempt.testId?.name || "N/A",
        score: Number(percentage.toFixed(1)),
        timeSpent: Math.max(0, Math.round(timeSpent)),
        attempted: attempt.attemptedCount || 0,
        correct: attempt.correctCount || 0,
        wrong: attempt.wrongCount || 0,
        totalMarks,
        obtainedMarks,
      },
    });

  } catch (error) {
    next(error);
  }
};

