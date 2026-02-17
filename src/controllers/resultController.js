import Attempt from "../models/Attempt.js";
import Question from "../models/Question.js";
import Test from "../models/Test.js";

/* 1️⃣ Get All Attempts of Student */
export const getMyResults = async (req, res) => {
  try {
    const studentId = req.user._id;

    const attempts = await Attempt.find({
      studentId,
      status: { $in: ["COMPLETED", "AUTO_SUBMITTED", "TERMINATED"] }
    })
      .populate({
        path: "testId",
        populate: {
          path: "testSeriesId",
          select: "title"
        }
      })
      .sort({ submittedAt: -1 });

    res.json(attempts);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* 2️⃣ Get Single Attempt Detail (Question Wise Result) */
export const getResultDetail = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await Attempt.findById(attemptId)
      .populate("testId")
      .populate("answers.questionId");

    if (!attempt)
      return res.status(404).json({ message: "Attempt not found" });

    if (attempt.studentId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Unauthorized" });

    const questions = await Question.find({
      testId: attempt.testId._id,
    });

    const resultData = questions.map((q) => {
      const studentAnswer = attempt.answers.find(
        (a) => a.questionId._id.toString() === q._id.toString()
      );

      return {
        questionText: q.questionText,   // bilingual object
        options: q.options,             // bilingual options
        correctAnswer: q.correctAnswer,
        selectedAnswer: studentAnswer?.selectedAnswer || null,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        isCorrect:
          studentAnswer?.selectedAnswer === q.correctAnswer,
      };
    });

    res.json({
      test: attempt.testId,
      score: attempt.score,
      correct: attempt.correctCount,
      wrong: attempt.wrongCount,
      attempted: attempt.attemptedCount,
      resultData,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

