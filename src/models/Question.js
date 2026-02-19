import mongoose from "mongoose";

/* =====================================================
   OPTION SCHEMA (Exactly 4 options required everywhere)
===================================================== */
const optionSchema = new mongoose.Schema({
  id: {
    type: String, // "A", "B", "C", "D"
    enum: ["A", "B", "C", "D"],
    required: true,
  },
  text: {
    english: { type: String, required: true },
    hindi: { type: String },
  },
});


/* =====================================================
   CHILD QUESTION SCHEMA (Used in Passage)
===================================================== */
const childQuestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["MCQ", "MSQ", "ASSERTION_REASON", "MATH"],
    required: true,
  },

  /* -------- Normal Question Text -------- */
  questionText: {
    english: { type: String },
    hindi: { type: String },
  },

  /* -------- Assertion Reason -------- */
  assertion: {
    english: { type: String },
    hindi: { type: String },
  },

  reason: {
    english: { type: String },
    hindi: { type: String },
  },

  /* -------- Math Image -------- */
  image: {
    type: String, // optional
  },

  imagePublicId: {
  type: String,
},

  /* -------- 4 Options -------- */
  options: {
    type: [optionSchema],
    validate: [(val) => val.length === 4, "Exactly 4 options required"],
    required: true,
  },

  /* -------- Correct Answers -------- */
  correctAnswers: {
    type: [String], // ["A"] or ["A","C"]
    required: true,
  },

  marks: {
    type: Number,
    default: 1,
  },

  negativeMarks: {
    type: Number,
    default: 0,
  },

  explanation: {
    english: { type: String },
    hindi: { type: String },
  },
});


/* =====================================================
   MAIN QUESTION SCHEMA
===================================================== */
const questionSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },

    section: {
      type: String,
    },

    type: {
      type: String,
      enum: ["MCQ", "MSQ", "ASSERTION_REASON", "MATH", "PASSAGE"],
      required: true,
    },

    difficulty: {
      type: String,
      enum: ["EASY", "MEDIUM", "HARD"],
      default: "MEDIUM",
    },

    /* ===================================
       NORMAL QUESTION FIELDS
    =================================== */

    questionText: {
      english: { type: String },
      hindi: { type: String },
    },

    /* -------- Assertion Reason -------- */
    assertion: {
      english: { type: String },
      hindi: { type: String },
    },

    reason: {
      english: { type: String },
      hindi: { type: String },
    },

    /* -------- Math Image -------- */
    image: {
      type: String, // optional (mainly for MATH)
    },

    options: {
      type: [optionSchema],
      validate: {
        validator: function (val) {
          if (this.type === "PASSAGE") return true;
          return val.length === 4;
        },
        message: "Exactly 4 options required",
      },
    },

    correctAnswers: {
      type: [String],
    },

    marks: {
      type: Number,
      default: 1,
    },

    negativeMarks: {
      type: Number,
      default: 0,
    },

    explanation: {
      english: { type: String },
      hindi: { type: String },
    },

    /* ===================================
       PASSAGE TYPE FIELDS
    =================================== */

    passageText: {
      english: { type: String },
      hindi: { type: String },
    },

    passageQuestions: {
      type: [childQuestionSchema],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Question", questionSchema);
