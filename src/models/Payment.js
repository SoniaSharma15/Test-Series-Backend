import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    testSeriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestSeries",
    },
    paymentId: String,
    orderId: String,
    amount: Number,
    status: String,
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
