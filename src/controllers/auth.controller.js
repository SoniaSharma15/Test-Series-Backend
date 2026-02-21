import {
  registerService,
  loginService,
  forgotPasswordService,
  resetPasswordService,
} from "../services/auth.service.js";

/* ================= REGISTER ================= */
export const register = async (req, res, next) => {
  try {
    const data = await registerService(req.body);

    res.status(201).json({
      success: true,
      ...data,
    });
  } catch (error) {
    next(error);
  }
};

/* ================= LOGIN ================= */
export const login = async (req, res, next) => {
  try {
    const data = await loginService(req.body);

    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    next(error);
  }
};

/* ================= FORGOT PASSWORD ================= */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      const err = new Error("Email is required");
      err.statusCode = 400;
      throw err;
    }

    await forgotPasswordService(email);

    // Always same response (prevent enumeration)
    res.status(200).json({
      success: true,
      message: "If the email exists, a reset link has been sent",
    });
  } catch (error) {
    next(error);
  }
};

/* ================= RESET PASSWORD ================= */
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      const err = new Error("Invalid request");
      err.statusCode = 400;
      throw err;
    }

    await resetPasswordService(token, password);

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    next(error);
  }
};

/* ================= LOGOUT ================= */
export const logout = (req, res) => {
  // If later using cookies, clear here
  // res.clearCookie("token");

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};