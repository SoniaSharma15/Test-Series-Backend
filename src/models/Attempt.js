import mongoose from "mongoose";

const attemptSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
      index: true,
    },

    attemptNumber: {
      type: Number,
      required: true,
    },

    duration: {
      type: Number, // lock duration at start (minutes)
      required: true,
    },

    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
        },
        selectedAnswer: String, // ✅ MCQ, MATH, AR
        selectedAnswers: [String], // ✅ MSQ (multiple)
      },
    ],

    score: {
      type: Number,
      default: 0,
    },

    // ✅ ADDED FIELDS (for performance analytics)
    correctCount: {
      type: Number,
      default: 0,
    },

    wrongCount: {
      type: Number,
      default: 0,
    },

    attemptedCount: {
      type: Number,
      default: 0,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    submittedAt: Date,

    status: {
      type: String,
      enum: [
        "IN_PROGRESS",
        "COMPLETED",
        "AUTO_SUBMITTED",
        "TERMINATED"
      ],
      default: "IN_PROGRESS",
      index: true,
    },

    tabSwitchCount: {
      type: Number,
      default: 0,
    },

    fullscreenExitCount: {
      type: Number,
      default: 0,
    },

    ipAddress: String,
    userAgent: String,

    lastHeartbeat: Date,
  },
  { timestamps: true }
);

/* Prevent duplicate active attempt */
attemptSchema.index(
  { studentId: 1, testId: 1, status: 1 }
);

export default mongoose.model("Attempt", attemptSchema);
