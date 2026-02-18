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
      enum: ["payment", "admin"],
      default: "payment",
    },

    // 🔹 Payment reference (only required for payment source)
    paymentId: {
      type: String,
      required: function () {
        return this.source === "payment";
      },
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // 🔹 Enrollment state (NOT payment state)
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
