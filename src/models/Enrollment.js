import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    testSeriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestSeries",
      required: true,
      index: true,
    },

    // 🔹 Who created this enrollment?
    source: {
      type: String,
      enum: ["payment", "admin", "free"],
      default: "free",
    },

    // 🔹 Payment reference (optional)
    paymentId: {
      type: String,
    },

    amount: {
      type: Number,
      default: 0,
    },

    // 🔹 Enrollment state
    status: {
      type: String,
      enum: ["active", "cancelled", "refunded"],
      default: "active",
    },

    purchaseDate: {
      type: Date,
      default: Date.now,
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    accessGranted: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// 🔐 Prevent duplicate enrollment
enrollmentSchema.index(
  { studentId: 1, testSeriesId: 1 },
  { unique: true }
);

export default mongoose.model("Enrollment", enrollmentSchema);
