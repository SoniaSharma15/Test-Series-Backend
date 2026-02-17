import mongoose from "mongoose";

const testSchema = new mongoose.Schema(
  {
    testSeriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestSeries",
      required: true,
    },

    subject: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    duration: {
      type: Number,
      required: true,
    },

    totalMarks: {
      type: Number,
      required: true,
    },

    passingMarks: {
      type: Number,
      required: true,
    },

    scheduledTime: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Test", testSchema);
