import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      const err = new Error("JWT secret not configured");
      err.statusCode = 500;
      throw err;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const err = new Error("Not authorized");
      err.statusCode = 401;
      throw err;
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      const err = new Error("User no longer exists");
      err.statusCode = 401;
      throw err;
    }

    if (user.isBlocked) {
      const err = new Error("User account is blocked");
      err.statusCode = 403;
      throw err;
    }

    req.user = user;

    next();
  } catch (error) {
    error.statusCode = error.statusCode || 401;
    next(error);
  }
};