import User from "../models/User.js";
import Enrollment from "../models/Enrollment.js";
import TestSeries from "../models/TestSeries.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { sendEmail } from "../services/email.service.js";
import {
  adminCreatedAccountTemplate,
  courseAssignedTemplate,
  adminPasswordChangedTemplate,
} from "../utils/emailTemplates.js";


/* ==========================================
   GET ALL USERS (Admin Only)
========================================== */
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({})
      .select("-password -resetPasswordToken -resetPasswordExpiry")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    error.statusCode = 500;
    next(error);
  }
};


export const createUserByAdmin = async (req, res, next) => {
  try {
    const { name, email, password, role, testSeriesId, mobile } = req.body;

    if (!name || !email || !password || !role || !mobile) {
      const err = new Error("All required fields must be provided");
      err.statusCode = 400;
      throw err;
    }

    if (!["admin", "student"].includes(role)) {
      const err = new Error("Invalid role");
      err.statusCode = 400;
      throw err;
    }

    if (password.length < 6) {
      const err = new Error("Password must be at least 6 characters");
      err.statusCode = 400;
      throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMobile = mobile.trim();

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(normalizedMobile)) {
      const err = new Error("Invalid mobile number");
      err.statusCode = 400;
      throw err;
    }

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { mobile: normalizedMobile }],
    });

    if (existingUser) {
      const err = new Error("Email or Mobile already exists");
      err.statusCode = 409;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      mobile: normalizedMobile,
      password: hashedPassword,
      role,
    });

    let courseTitle = null;

    if (role === "student" && testSeriesId) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const series = await TestSeries.findById(testSeriesId).session(session);

        if (series) {
          await Enrollment.create(
            [{
              studentId: newUser._id,
              testSeriesId,
              source: "admin",
              amount: 0,
              status: "active",
            }],
            { session }
          );

          await TestSeries.findByIdAndUpdate(
            testSeriesId,
            { $inc: { totalEnrollments: 1 } },
            { session }
          );

          courseTitle = series.title;
        }

        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
      } finally {
        session.endSession();
      }
    }

    // Non-blocking email
    sendEmail(
      normalizedEmail,
      "🎉 Your Account Has Been Created",
      adminCreatedAccountTemplate({
        name,
        email: normalizedEmail,
        mobile: normalizedMobile,
        password,
        role,
        courseTitle,
      })
    ).catch(() => {});

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile,
        role: newUser.role,
      },
    });

  } catch (error) {
    next(error);
  }
};


export const getStudentByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    // Basic validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const student = await User.findOne({
      email: email.trim().toLowerCase(),
      role: "student",
    }).select("_id name email");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error("GetStudentByEmail Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};


/* --------------------------------------------
   2️⃣ Assign Test Series
---------------------------------------------*/
export const assignTestSeries = async (req, res, next) => {
  try {
    const { studentId, testSeriesId } = req.body;

    /* ================= VALIDATION ================= */

    if (!studentId || !testSeriesId) {
      const err = new Error("StudentId and TestSeriesId are required");
      err.statusCode = 400;
      throw err;
    }

    if (
      !mongoose.Types.ObjectId.isValid(studentId) ||
      !mongoose.Types.ObjectId.isValid(testSeriesId)
    ) {
      const err = new Error("Invalid StudentId or TestSeriesId");
      err.statusCode = 400;
      throw err;
    }

    /* ================= CHECK STUDENT ================= */

    const student = await User.findOne({
      _id: studentId,
      role: "student",
    });

    if (!student) {
      const err = new Error("Student not found");
      err.statusCode = 404;
      throw err;
    }

    /* ================= CHECK TEST SERIES ================= */

    const series = await TestSeries.findById(testSeriesId);

    if (!series) {
      const err = new Error("Test series not found");
      err.statusCode = 404;
      throw err;
    }

    /* ================= DUPLICATE CHECK ================= */

    const existingEnrollment = await Enrollment.findOne({
      studentId,
      testSeriesId,
    });

    if (existingEnrollment) {
      const err = new Error("Test series already assigned");
      err.statusCode = 409;
      throw err;
    }

    /* ================= CREATE ENROLLMENT ================= */

    await Enrollment.create({
      studentId,
      testSeriesId,
      amount: 0,
      source: "admin",
      status: "active",
    });

    await TestSeries.findByIdAndUpdate(testSeriesId, {
      $inc: { totalEnrollments: 1 },
    });

    /* ================= SEND EMAIL ================= */

    try {
      await sendEmail(
        student.email,
        "📚 New Test Series Assigned",
        courseAssignedTemplate({
          name: student.name,
          email: student.email,
          courseTitle: series.title,
        })
      );
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
    }

    /* ================= RESPONSE ================= */

    res.status(201).json({
      success: true,
      message: "Test series assigned successfully",
    });

  } catch (error) {
    next(error);
  }
};




/* --------------------------------------------
   3️⃣ Change Student Password
---------------------------------------------*/
export const changeStudentPassword = async (req, res, next) => {
  try {
    const { studentId, newPassword } = req.body;

    if (!studentId || !newPassword) {
      const err = new Error("StudentId and newPassword are required");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      const err = new Error("Invalid Student ID");
      err.statusCode = 400;
      throw err;
    }

    if (newPassword.length < 6) {
      const err = new Error("Password must be at least 6 characters");
      err.statusCode = 400;
      throw err;
    }

    const student = await User.findOne({
      _id: studentId,
      role: "student",
    });

    if (!student) {
      const err = new Error("Student not found");
      err.statusCode = 404;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    student.password = hashedPassword;
    await student.save();

    sendEmail(
      student.email,
      "🔐 Your Password Has Been Updated",
      adminPasswordChangedTemplate({
        name: student.name,
        email: student.email,
        newPassword,
      })
    ).catch(() => {});

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });

  } catch (error) {
    next(error);
  }
};
