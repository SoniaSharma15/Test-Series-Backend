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
    enum: ["MCQ", "MATH", "ASSERTION_REASON", "PASSAGE"],
    default: "MCQ",
  },

  questionText: {
    english: { type: String },
    hindi: { type: String },
  },

  options: [optionSchema],

  correctAnswer: String,

  marks: {
    type: Number,
    required: true,
  },

  negativeMarks: {
    type: Number,
    default: 0,
  },

  allowImage: {
    type: Boolean,
    default: false,
  }
},
{ timestamps: true }
);

export default mongoose.model("Question", questionSchema);
