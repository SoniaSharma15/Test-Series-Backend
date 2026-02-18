import mongoose from "mongoose";

const testSeriesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    originalPrice: {
      type: Number,
    },
    discount: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number, // in days
      required: true,
    },
    startDate: {
      type: Date,
    },
    language: {
      type: String,
      required: true,
    },
    features: [
      {
        type: String,
      },
    ],
    subjects: [
      {
        type: String,
      },
    ],

    thumbnail: {
      type: String, // image URL or path
    },
    offerExpiry: {
      type: Date,
    },
    totalEnrollments: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("TestSeries", testSeriesSchema);
