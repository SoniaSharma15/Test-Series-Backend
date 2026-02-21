import mongoose from "mongoose";
import Attempt from "../models/Attempt.js";
import Question from "../models/Question.js";
import Test from "../models/Test.js";

/* 1️⃣ Get All Attempts of Student */
export const getMyResults = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const studentId = req.user._id;

    const attempts = await Attempt.find({
      studentId,
      status: { $in: ["COMPLETED", "AUTO_SUBMITTED", "TERMINATED"] }
    })
      .select("testId totalMarks obtainedMarks correctCount wrongCount attemptedCount submittedAt")
      .populate({
        path: "testId",
        select: "name testSeriesId",
        populate: {
          path: "testSeriesId",
          select: "title"
        }
      })
      .sort({ submittedAt: -1 })
      .lean();

    const formatted = attempts.map(a => {
      const total = Number(a.totalMarks) || 0;
      const obtained = Number(a.obtainedMarks) || 0;

      const percentage = total > 0
        ? ((obtained / total) * 100).toFixed(1)
        : 0;

      return {
        ...a,
        score: percentage + "%"
      };
    });

    return res.json(formatted);

  } catch (error) {
    console.error("getMyResults error:", {
      userId: req.user?._id,
      message: error.message
    });

    return res.status(500).json({
      message: "Failed to fetch results"
    });
  }
};



/* 2️⃣ Get Single Attempt Detail (Question Wise Result) */
export const getResultDetail = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { attemptId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ message: "Invalid attempt ID" });
    }

    const attempt = await Attempt.findById(attemptId)
      .select("studentId testId answers score correctCount wrongCount attemptedCount")
      .lean();

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const test = await Test.findById(attempt.testId)
      .select("title duration totalMarks")
      .lean();

    if (!test) {
      return res.status(410).json({ message: "Test no longer available" });
    }

    const questions = await Question.find({
      testId: attempt.testId,
    })
      .select("type questionText options correctAnswer correctAnswers marks negativeMarks")
      .lean();

    /* 🔥 Optimize lookup using Map instead of O(n²) find */
    const answerMap = new Map();
    attempt.answers.forEach((a) => {
      if (a.questionId) {
        answerMap.set(a.questionId.toString(), a);
      }
    });

    const resultData = questions.map((q) => {
      const studentAnswer = answerMap.get(q._id.toString());

      let isCorrect = false;

      if (q.type === "MSQ") {
        const correctSet = new Set(
          Array.isArray(q.correctAnswers) ? q.correctAnswers : []
        );

        const selectedSet = new Set(
          Array.isArray(studentAnswer?.selectedAnswers)
            ? studentAnswer.selectedAnswers
            : []
        );

        isCorrect =
          correctSet.size === selectedSet.size &&
          [...correctSet].every((ans) => selectedSet.has(ans));

      } else {
        isCorrect =
          studentAnswer?.selectedAnswer === q.correctAnswer;
      }

      return {
        type: q.type,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        correctAnswers: q.correctAnswers,
        selectedAnswer: studentAnswer?.selectedAnswer || null,
        selectedAnswers: studentAnswer?.selectedAnswers || [],
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        isCorrect,
      };
    });

    return res.json({
      test,
      score: attempt.score,
      correct: attempt.correctCount,
      wrong: attempt.wrongCount,
      attempted: attempt.attemptedCount,
      resultData,
    });

  } catch (error) {
    console.error("getResultDetail error:", {
      attemptId: req.params.attemptId,
      userId: req.user?._id,
      message: error.message
    });

    return res.status(500).json({
      message: "Failed to fetch result details"
    });
  }
};