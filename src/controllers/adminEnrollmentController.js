import Enrollment from "../models/Enrollment.js";
import TestSeries from "../models/TestSeries.js";
import User from "../models/User.js";


export const manualEnroll = async (req, res) => {
  try {
    const { studentId, testSeriesId } = req.body;

    const existing = await Enrollment.findOne({ studentId, testSeriesId });

    if (existing)
      return res.status(400).json({ message: "Already enrolled" });

    const testSeries = await TestSeries.findById(testSeriesId);

    const enrollment = await Enrollment.create({
      studentId,
      testSeriesId,
      amount: 0,
      source: "admin",        // 🔥 IMPORTANT
      status: "active",
      expiryDate: new Date(
        Date.now() + testSeries.duration * 24 * 60 * 60 * 1000
      ),
    });

    res.json(enrollment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getAllEnrollments = async (req, res) => {
  try {
    const {
      page = 1,
      status = "all",
      source = "all",
      search = "",
      startDate,
      endDate,
      expired,
    } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limit = 10;
    const skip = (pageNum - 1) * limit;

    const match = {};
    if (status && status !== "all") match.status = status;
    if (source && source !== "all") match.source = source;

    if (startDate && endDate) {
      match.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const now = new Date();
    const expiredBool =
      String(expired).toLowerCase() === "true" || String(expired) === "1";

    const searchStr = String(search || "").trim();
    const hasSearch = searchStr.length > 0;
    const regex = hasSearch
      ? new RegExp(searchStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      : null;

    const pipeline = [
      { $match: match },

      // join student
      {
        $lookup: {
          from: User.collection.name, // "users"
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },

      // join test series
      {
        $lookup: {
          from: TestSeries.collection.name, // "testseries"
          localField: "testSeriesId",
          foreignField: "_id",
          as: "series",
        },
      },
      { $unwind: { path: "$series", preserveNullAndEmptyArrays: true } },

      // ✅ IMPORTANT: expiryDate fallback compute
      {
        $addFields: {
          expiryDate: {
            $ifNull: [
              "$expiryDate",
              {
                $dateAdd: {
                  startDate: "$createdAt",
                  unit: "day",
                  amount: { $ifNull: ["$series.duration", 30] },
                },
              },
            ],
          },
          purchaseDate: { $ifNull: ["$purchaseDate", "$createdAt"] },
        },
      },
    ];

    // search on joined fields
    if (hasSearch) {
      pipeline.push({
        $match: {
          $or: [
            { "student.name": regex },
            { "student.email": regex },
            { "series.title": regex },
          ],
        },
      });
    }

    // ✅ expired filter AFTER expiryDate is computed
    if (expiredBool) {
      pipeline.push({ $match: { expiryDate: { $lt: now } } });
    }

    pipeline.push({
      $facet: {
        enrollments: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              amount: 1,
              status: 1,
              source: 1,
              paymentId: 1,
              accessGranted: 1,
              purchaseDate: 1,
              expiryDate: 1,
              createdAt: 1,

              studentId: {
                _id: "$student._id",
                name: "$student.name",
                email: "$student.email",
              },
              testSeriesId: {
                _id: "$series._id",
                title: "$series.title",
                duration: "$series.duration",
              },
            },
          },
        ],

        total: [{ $count: "count" }],

        statsByStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        statsBySource: [{ $group: { _id: "$source", count: { $sum: 1 } } }],

        revenue: [
          { $match: { source: "payment", status: "active" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ],

        expiredCount: [
          { $match: { expiryDate: { $lt: now } } },
          { $count: "count" },
        ],
      },
    });

    const out = await Enrollment.aggregate(pipeline);

    const first = out?.[0] || {};
    const enrollments = Array.isArray(first.enrollments) ? first.enrollments : [];
    const total = first.total?.[0]?.count || 0;

    const statsByStatus = Array.isArray(first.statsByStatus) ? first.statsByStatus : [];
    const statsBySource = Array.isArray(first.statsBySource) ? first.statsBySource : [];

    const totalRevenue = first.revenue?.[0]?.total || 0;
    const expiredCount = first.expiredCount?.[0]?.count || 0;

    return res.json({
      enrollments,
      total,
      page: pageNum,
      limit,
      stats: {
        byStatus: statsByStatus,
        bySource: statsBySource,
        expiredCount,
      },
      totalRevenue,
    });
  } catch (error) {
    console.error("getAllEnrollments error:", error);
    res.status(500).json({ message: error.message });
  }
};


/**
 * PATCH /enrollments/:id/renew
 * Body (optional): { days: number }
 * - If days not provided: uses testSeries.duration (days)
 */
export const renewEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const daysFromBody = Number(req.body?.days || 0);

    const enrollment = await Enrollment.findById(id).populate("testSeriesId");
    if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });

    const series = enrollment.testSeriesId;
    const durationDays = daysFromBody > 0 ? daysFromBody : Number(series?.duration || 30);

    const now = new Date();
    const newExpiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    enrollment.status = "active";
    enrollment.accessGranted = true;
    enrollment.expiryDate = newExpiry;

    await enrollment.save();

    return res.json({
      message: "Enrollment renewed",
      enrollment,
    });
  } catch (error) {
    console.error("renewEnrollment error:", error);
    res.status(500).json({ message: error.message });
  }
};



// 3️⃣ Update status
export const updateEnrollmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await Enrollment.findByIdAndUpdate(id, { status }, { new: true });
    res.json(updated);
  } catch (error) {
    console.error("updateEnrollmentStatus error:", error);
    res.status(500).json({ message: error.message });
  }
};


