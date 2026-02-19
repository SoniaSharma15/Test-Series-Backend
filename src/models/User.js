// models/User.js

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // ✅ NEW FIELD ADDED
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"],
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["admin", "student"],
      default: "student",
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    resetPasswordToken: String,
    resetPasswordExpiry: Date,
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
