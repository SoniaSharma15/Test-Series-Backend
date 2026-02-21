import User from "../models/User.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import generateToken from "../utils/generateToken.js";
import { sendEmail } from "./email.service.js";
import {
  registrationTemplate,
  resetPasswordTemplate,
} from "../utils/emailTemplates.js";

/* =====================================================
   REGISTER
===================================================== */
export const registerService = async (data) => {
  let { name, email, password, mobile } = data;

  if (!name || !email || !password || !mobile) {
    const err = new Error("All fields are required");
    err.statusCode = 400;
    throw err;
  }

  name = name.trim();
  email = email.trim().toLowerCase();
  mobile = mobile.trim();

  // Basic password validation
  if (password.length < 6) {
    const err = new Error("Password must be at least 6 characters");
    err.statusCode = 400;
    throw err;
  }

  const mobileRegex = /^[6-9]\d{9}$/;
  if (!mobileRegex.test(mobile)) {
    const err = new Error("Invalid mobile number");
    err.statusCode = 400;
    throw err;
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { mobile }],
  });

  if (existingUser) {
    const err = new Error("Email or Mobile already registered");
    err.statusCode = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    mobile,
    password: hashedPassword,
  });

  const token = generateToken(user._id);

  // Non-blocking email
  sendEmail(
    user.email,
    "🎉 Welcome to Brilliant Test Series",
    registrationTemplate(user.name)
  ).catch((err) => console.error("Email failed:", err.message));

  const safeUser = user.toObject();
  delete safeUser.password;

  return { user: safeUser, token };
};

/* =====================================================
   LOGIN
===================================================== */
export const loginService = async (data) => {
  let { email, password } = data;

  if (!email || !password) {
    const err = new Error("Email and password are required");
    err.statusCode = 400;
    throw err;
  }

  email = email.trim().toLowerCase();

  const user = await User.findOne({ email });

  if (!user || user.isBlocked) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const token = generateToken(user._id);

  const safeUser = user.toObject();
  delete safeUser.password;

  return { user: safeUser, token };
};

/* =====================================================
   FORGOT PASSWORD
===================================================== */
export const forgotPasswordService = async (email) => {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) return true;

  const user = await User.findOne({ email: normalizedEmail });

  // Prevent email enumeration
  if (!user) return true;

  const resetToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  await User.findByIdAndUpdate(user._id, {
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: Date.now() + 15 * 60 * 1000,
  });

  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    console.error("FRONTEND_URL missing in env");
    return true; // don't expose internal issue
  }

  const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

  await sendEmail(
    user.email,
    "🔐 Reset Your Password - Brilliant Test Series",
    resetPasswordTemplate(user.name, resetLink)
  );

  return true;
};

/* =====================================================
   RESET PASSWORD
===================================================== */
export const resetPasswordService = async (token, newPassword) => {
  if (!token || !newPassword || newPassword.length < 6) {
    const err = new Error("Invalid request");
    err.statusCode = 400;
    throw err;
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    const err = new Error("Invalid or expired token");
    err.statusCode = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  user.password = hashedPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpiry = null;

  await user.save();

  return true;
};