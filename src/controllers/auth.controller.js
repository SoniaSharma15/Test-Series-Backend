import {
  registerService,
  loginService,
  forgotPasswordService,
  resetPasswordService,
} from "../services/auth.service.js";

export const register = async (req, res, next) => {
  try {
    const data = await registerService(req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const data = await loginService(req.body);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    await forgotPasswordService(req.body.email);
    res.status(200).json({ message: "Reset link sent" });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    await resetPasswordService(
      req.params.token,
      req.body.password
    );
    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  res.status(200).json({ message: "Logged out" });
};
