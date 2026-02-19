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

/* --------------------------------------------
   1️⃣ Get Student By Email
---------------------------------------------*/

export const createUserByAdmin = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, email, password, role, testSeriesId,mobile } = req.body;

    if (!name || !email || !password || !role || !mobile) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create(
      [{
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role,
      }],
      { session }
    );

    let courseTitle = null;

    if (role === "student" && testSeriesId) {
      const enrollment = await Enrollment.create(
        [{
          studentId: newUser[0]._id,
          testSeriesId,
          source: "admin",
          amount: 0,
          status: "active",
        }],
        { session }
      );

      // Get Course Title
      const series = await mongoose.model("TestSeries").findById(testSeriesId);
      courseTitle = series?.title || null;
    }

    await session.commitTransaction();
    session.endSession();

    // ✅ Send Detailed Email
    await sendEmail(
      normalizedEmail,
      "🎉 Your Account Has Been Created",
      adminCreatedAccountTemplate({
        name,
        email: normalizedEmail,
        password, // plain password sent
        role,
        courseTitle,
      })
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(500).json({
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { studentId, testSeriesId } = req.body;

    if (!studentId || !testSeriesId) {
      return res.status(400).json({
        success: false,
        message: "StudentId and TestSeriesId are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(studentId) ||
      !mongoose.Types.ObjectId.isValid(testSeriesId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
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

    const existing = await Enrollment.findOne({
      studentId,
      testSeriesId,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Test series already assigned",
      });
    }

    await Enrollment.create(
      [{
        studentId,
        testSeriesId,
        amount: 0,
        source: "admin",
        status: "active",
      }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // 🔥 Fetch Course Title
    const series = await TestSeries.findById(testSeriesId);

    // ✅ Send Detailed Email
    await sendEmail(
      student.email,
      "🎓 New Course Assigned",
      courseAssignedTemplate({
        name: student.name,
        email: student.email,
        courseTitle: series?.title || "Your Assigned Course",
      })
    );

    return res.status(201).json({
      success: true,
      message: "Test series assigned successfully",
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("AssignTestSeries Error:", error);

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
