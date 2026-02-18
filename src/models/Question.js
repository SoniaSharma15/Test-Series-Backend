import mongoose from "mongoose";

const optionSchema = new mongoose.Schema({
  english: { type: String },
  hindi: { type: String },
});

const questionSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },

    type: {
      type: String,
      enum: ["MCQ", "MSQ", "MATH", "ASSERTION_REASON", "PASSAGE"],
      default: "MCQ",
    },

    questionText: {
      english: { type: String },
      hindi: { type: String },
    },

    options: [optionSchema],

    // optional meta (stores Hindi-specific auxiliary fields like HI options, AR pieces)
    meta: {
      hi: {
        correctAnswer: { type: String },
        questionText: { type: String },
        options: [optionSchema],
        assertionText: { type: String },
        reasonText: { type: String },
      },
    },

    // ✅ MCQ / MATH / AR
    correctAnswer: { type: String, default: "" },

    // optional uploaded image (for MATH)
    questionImage: {
      url: { type: String },
      publicId: { type: String },
    },

    // ✅ MSQ (multiple answers)
    correctAnswers: [{ type: String }],

    // ✅ Question creation language (for answer validation)
    questionLang: {
      type: String,
      enum: ["english", "hindi"],
      default: "english",
    },

    marks: {
      type: Number,
      required: true,
    },

    negativeMarks: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Question", questionSchema);
