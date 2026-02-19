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
export const getAllUsers = async (req, res) => {
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
    console.error("Get Users Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

/* --------------------------------------------
   1️⃣ Get Student By Email
---------------------------------------------*/

export const createUserByAdmin = async (req, res) => {
  try {
    const { name, email, password, role, testSeriesId, mobile } = req.body;

    /* ================= VALIDATION ================= */

    if (!name || !email || !password || !role || !mobile) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    if (!["admin", "student"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMobile = mobile.trim();

    // Indian 10 digit validation
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(normalizedMobile)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number",
      });
    }

    /* ================= CHECK EXISTING ================= */

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const existingMobile = await User.findOne({ mobile: normalizedMobile });
    if (existingMobile) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already exists",
      });
    }

    /* ================= HASH PASSWORD ================= */

    const hashedPassword = await bcrypt.hash(password, 12);

    /* ================= CREATE USER ================= */

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      mobile: normalizedMobile,
      password: hashedPassword,
      role,
    });

    let courseTitle = null;

    /* ================= AUTO ENROLL IF STUDENT ================= */

    if (role === "student" && testSeriesId) {
      try {
        const series = await TestSeries.findById(testSeriesId);

        if (series) {
          await Enrollment.create({
            studentId: newUser._id,
            testSeriesId,
            source: "admin",
            amount: 0,
            status: "active",
          });

          await TestSeries.findByIdAndUpdate(testSeriesId, {
            $inc: { totalEnrollments: 1 },
          });

          courseTitle = series.title;
        }
      } catch (enrollmentError) {
        if (enrollmentError.code !== 11000) {
          console.error("Enrollment error:", enrollmentError);
        }
      }
    }

    /* ================= SEND EMAIL SAFELY ================= */

    try {
      await sendEmail(
        normalizedEmail,
        "🎉 Your Account Has Been Created",
        adminCreatedAccountTemplate({
          name,
          email: normalizedEmail,
          mobile: normalizedMobile, // ✅ optional if you want in template
          password, // intentionally sending plain password
          role,
          courseTitle,
        })
      );
    } catch (emailError) {
      console.error("Email failed but user created:", emailError);
    }

    /* ================= RESPONSE ================= */

    return res.status(201).json({
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
    console.error("CreateUserByAdmin Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
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
export const assignTestSeries = async (req, res) => {
  try {
    const { studentId, testSeriesId } = req.body;

    if (!studentId || !testSeriesId) {
      return res.status(400).json({
        success: false,
        message: "StudentId and TestSeriesId are required",
      });
    }

    const student = await User.findOne({
      _id: studentId,
      role: "student",
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

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

    return res.status(201).json({
      success: true,
      message: "Test series assigned successfully",
    });

  } catch (error) {

    console.error("AssignTestSeries Error:", error);

    // ✅ Duplicate enrollment error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Test series already assigned",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to assign test series",
    });
  }
};




/* --------------------------------------------
   3️⃣ Change Student Password
---------------------------------------------*/
export const changeStudentPassword = async (req, res) => {
  try {
    const { studentId, newPassword } = req.body;

    if (!studentId || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "StudentId and newPassword are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Student ID",
      });
    }

    // Basic password strength check
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const student = await User.findOne({
      _id: studentId,
      role: "student",
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    student.password = hashedPassword;
    await student.save();

    await sendEmail(
  student.email,
  "🔐 Your Password Has Been Updated",
  adminPasswordChangedTemplate({
    name: student.name,
    email: student.email,
    newPassword, // plain password sent
  })
);



    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });

  } catch (error) {
    console.error("ChangeStudentPassword Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update password",
    });
  }
};
