import User from "../models/User.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import generateToken from "../utils/generateToken.js";
import { sendEmail } from "./email.service.js";
import {
  registrationTemplate,
  resetPasswordTemplate
} from "../utils/emailTemplates.js";


export const registerService = async (data) => {
  let { name, email, password, mobile } = data;

  if (!name || !email || !password || !mobile) {
    throw new Error("All fields are required");
  }

  // Normalize inputs
  name = name.trim();
  email = email.trim().toLowerCase();
  mobile = mobile.trim();

  // Validate mobile (Indian 10-digit format)
  const mobileRegex = /^[6-9]\d{9}$/;
  if (!mobileRegex.test(mobile)) {
    throw new Error("Invalid mobile number");
  }

  // Check existing email
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new Error("Email already registered");
  }

  // Check existing mobile
  const existingMobile = await User.findOne({ mobile });
  if (existingMobile) {
    throw new Error("Mobile number already registered");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await User.create({
    name,
    email,
    mobile,
    password: hashedPassword,
    mobile
  });

  // Generate JWT
  const token = generateToken(user._id);

  // Send welcome email (non-blocking)
  sendEmail(
    user.email,
    "🎉 Welcome to Brilliant Test Series",
    registrationTemplate(user.name)
  ).catch((err) => console.error("Email failed:", err.message));

  // Remove password before returning
  const safeUser = user.toObject();
  delete safeUser.password;

  return { user: safeUser, token };
};



export const loginService = async (data) => {
  const { email, password } = data;

  const user = await User.findOne({ email });
  if (!user) throw new Error("Invalid credentials");

  if (user.isBlocked) throw new Error("User is blocked");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid credentials");

  const token = generateToken(user._id);

  return { user, token };
};


export const forgotPasswordService = async (email) => {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    // 🔐 Always return true (prevent email enumeration attack)
    if (!user) return true;

    // Generate raw token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token before saving in DB (VERY IMPORTANT)
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
      throw new Error("FRONTEND_URL is not defined in .env");
    }

    const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

    await sendEmail(
      user.email,
      "🔐 Reset Your Password - Brilliant Test Series",
      resetPasswordTemplate(user.name, resetLink)
    );

    return true;
  } catch (error) {
    console.error("Forgot Password Error:", error.message);
    throw new Error("Failed to process forgot password request");
  }
};


export const resetPasswordService = async (token, newPassword) => {
  try {
    // 🔐 Hash incoming token before searching
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      throw new Error("Invalid or expired token");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ✅ Use findByIdAndUpdate (avoid validation issue)
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpiry: null,
    });

    return true;
  } catch (error) {
    console.error("Reset Password Error:", error.message);
    throw new Error("Failed to reset password");
  }
};
