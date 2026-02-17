import User from "../models/User.js";
import TestSeries from "../models/TestSeries.js";
import Test from "../models/Test.js";
import Enrollment from "../models/Enrollment.js";
import Attempt from "../models/Attempt.js";
import Payment from "../models/Payment.js";

export const getAdminDashboard = async (req, res) => {
  try {
    // Total Students
    const totalStudents = await User.countDocuments({
      role: "student",
    });

    // Total Test Series
    const totalTestSeries = await TestSeries.countDocuments();

    // Total Tests
    const totalTests = await Test.countDocuments();

    // Total Revenue
    const revenue = await Payment.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const totalRevenue =
      revenue.length > 0 ? revenue[0].total : 0;

    // Recent Enrollments (last 5)
    const recentEnrollments = await Enrollment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("studentId", "name email")
      .populate("testSeriesId", "title");

    // Recent Attempts (last 5)
    const recentAttempts = await Attempt.find()
      .sort({ submittedAt: -1 })
      .limit(5)
      .populate("studentId", "name email")
      .populate("testId", "name");

    res.json({
      totalStudents,
      totalTestSeries,
      totalTests,
      totalRevenue,
      recentEnrollments,
      recentAttempts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
