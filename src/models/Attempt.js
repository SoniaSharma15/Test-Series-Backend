import mongoose from "mongoose";

/* =====================================================
   ANSWER SNAPSHOT SCHEMA
===================================================== */

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
    required: true,
  },

  // For PASSAGE → which sub question
  childIndex: {
    type: Number,
    default: null,
  },

  questionType: {
    type: String,
    enum: ["MCQ", "MSQ", "ASSERTION_REASON", "MATH"],
    required: true,
  },

  selectedAnswers: {
    type: [String], // Always array (["A"] for MCQ)
    default: [],
  },

  correctAnswersSnapshot: {
    type: [String],
    required: true,
  },

  marks: {
    type: Number,
    required: true,
  },

  negativeMarks: {
    type: Number,
    default: 0,
  },

  isCorrect: {
    type: Boolean,
    default: false,
  },

  marksAwarded: {
    type: Number,
    default: 0,
  },
});


/* =====================================================
   ATTEMPT SCHEMA
===================================================== */

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
      type: Number, // locked at start (minutes)
      required: true,
    },

    status: {
      type: String,
      enum: [
        "IN_PROGRESS",
        "COMPLETED",
        "AUTO_SUBMITTED",
        "TERMINATED",
      ],
      default: "IN_PROGRESS",
      index: true,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    submittedAt: Date,

    totalMarks: {
      type: Number,
      default: 0,
    },

    obtainedMarks: {
      type: Number,
      default: 0,
    },

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

    unattemptedCount: {
      type: Number,
      default: 0,
    },

    answers: [answerSchema],

    /* ===============================
       Anti-Cheat / Tracking Fields
    ================================ */

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


/* =====================================================
   INDEXES
===================================================== */

// Prevent duplicate active attempt
attemptSchema.index(
  { studentId: 1, testId: 1, status: 1 }
);

// Fast result lookup
attemptSchema.index({ studentId: 1, testId: 1 });

export default mongoose.model("Attempt", attemptSchema);
