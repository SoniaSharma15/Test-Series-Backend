import TestSeries from "../models/TestSeries.js";
import Enrollment from "../models/Enrollment.js";

export const createTestSeries = async (req, res) => {
  try {
    const parseNumber = (value, defaultValue = 0) => {
      const num = Number(value);
      return isNaN(num) ? defaultValue : num;
    };

    const parseJSON = (value) => {
      try {
        return value ? JSON.parse(value) : [];
      } catch {
        return [];
      }
    };

    const testSeries = await TestSeries.create({
      title: req.body.title?.trim(),
      description: req.body.description?.trim(),
      price: parseNumber(req.body.price),
      originalPrice: parseNumber(req.body.originalPrice),
      discount: parseNumber(req.body.discount),
      duration: parseNumber(req.body.duration),
      language: req.body.language?.trim(),
      startDate: req.body.startDate || null,
      offerExpiry: req.body.offerExpiry || null,
      features: parseJSON(req.body.features),
      subjects: parseJSON(req.body.subjects),
      thumbnail: req.uploadedFile?.url || "",
    });

    res.status(201).json(testSeries);
  } catch (error) {
    console.error("CREATE ERROR:", error);
    res.status(500).json({
      message: "Failed to create test series",
      error: error.message,
    });
  }
};




export const updateTestSeries = async (req, res) => {
  try {
    const parseNumber = (value, defaultValue = 0) => {
      const num = Number(value);
      return isNaN(num) ? defaultValue : num;
    };

    const parseJSON = (value) => {
      try {
        return value ? JSON.parse(value) : [];
      } catch {
        return [];
      }
    };

    const updateData = {
      title: req.body.title?.trim(),
      description: req.body.description?.trim(),
      price: parseNumber(req.body.price),
      originalPrice: parseNumber(req.body.originalPrice),
      discount: parseNumber(req.body.discount),
      duration: parseNumber(req.body.duration),
      language: req.body.language?.trim(),
      startDate: req.body.startDate || null,
      offerExpiry: req.body.offerExpiry || null,
      features: parseJSON(req.body.features),
      subjects: parseJSON(req.body.subjects),
    };

    if (req.uploadedFile?.url) {
      updateData.thumbnail = req.uploadedFile.url;
    }

    const updated = await TestSeries.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    console.error("UPDATE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};



export const deleteTestSeries = async (req, res) => {
  try {
    await TestSeries.findByIdAndDelete(req.params.id);
    res.json({ message: "Test Series deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getAllTestSeries = async (req, res) => {
  try {
    const userId = req.user?._id;
    const now = new Date();

    const seriesList = await TestSeries.find()
      .sort({ createdAt: -1 })
      .lean();

    // 🔥 Filter expired series based on duration
    const activeSeries = seriesList.filter((series) => {
      if (!series.startDate || !series.duration) return true;

      const start = new Date(series.startDate);
      const expiry = new Date(start);
      expiry.setDate(expiry.getDate() + series.duration);

      return now <= expiry;
    });

    let enrolledSet = new Set();

    if (userId) {
      const enrollments = await Enrollment.find({
        studentId: userId,
      }).select("testSeriesId");

      enrolledSet = new Set(
        enrollments.map((e) => e.testSeriesId.toString())
      );
    }

    const updated = activeSeries.map((series) => ({
      ...series,
      isEnrolled: enrolledSet.has(series._id.toString()),
    }));

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};


export const getSingleTestSeries = async (req, res) => {
  try {
    const data = await TestSeries.findById(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
