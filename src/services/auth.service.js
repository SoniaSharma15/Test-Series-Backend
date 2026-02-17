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
  const { name, email, password } = data;

  const existingUser = await User.findOne({
    email: email.trim().toLowerCase(),
  });

  if (existingUser) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email: email.trim().toLowerCase(),
    password: hashedPassword,
  });

  const token = generateToken(user._id);

  await sendEmail(
    user.email,
    "🎉 Welcome to Brilliant Test Series",
    registrationTemplate(user.name)
  );

  return { user, token };
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
  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  });

  if (!user) throw new Error("User not found");

  const resetToken = crypto.randomBytes(32).toString("hex");

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpiry = Date.now() + 15 * 60 * 1000;

  await user.save();

  // ✅ TAKE URL FROM ENV
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
};



export const resetPasswordService = async (token, newPassword) => {
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) throw new Error("Invalid or expired token");

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;

  await user.save();

  return true;
};
