import TestSeries from "../models/TestSeries.js";
import Enrollment from "../models/Enrollment.js";
import cloudinary from "../config/cloudinary.js";
export const createTestSeries = async (req, res) => {
  try {
    const parseNumber = (value, def = 0) =>
      isNaN(Number(value)) ? def : Number(value);
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
      price: 0,
      originalPrice: 0,
      discount: 0,
      duration: parseNumber(req.body.duration),
      language: req.body.language?.trim(),
      startDate: req.body.startDate || null,
      offerExpiry: req.body.offerExpiry || null,
      features: parseJSON(req.body.features),
      subjects: parseJSON(req.body.subjects),
      thumbnail: req.uploadedFiles?.thumbnail || null,
      coverImage: req.uploadedFiles?.coverImage || null,
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
    const existing = await TestSeries.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({ message: "Not found" });
    }

    const parseNumber = (value, def = 0) =>
      isNaN(Number(value)) ? def : Number(value);
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
      price: 0,
      originalPrice: 0,
      discount: 0,
      duration: parseNumber(req.body.duration),
      language: req.body.language?.trim(),
      startDate: req.body.startDate || null,
      offerExpiry: req.body.offerExpiry || null,
      features: parseJSON(req.body.features),
      subjects: parseJSON(req.body.subjects),
    };

    // 🔥 Replace Thumbnail
    if (req.uploadedFiles?.thumbnail) {
      if (existing.thumbnail?.publicId) {
        await cloudinary.uploader.destroy(existing.thumbnail.publicId);
      }
      updateData.thumbnail = req.uploadedFiles.thumbnail;
    }

    // 🔥 Replace Cover
    if (req.uploadedFiles?.coverImage) {
      if (existing.coverImage?.publicId) {
        await cloudinary.uploader.destroy(existing.coverImage.publicId);
      }
      updateData.coverImage = req.uploadedFiles.coverImage;
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
    const series = await TestSeries.findById(req.params.id);

    if (!series) {
      return res.status(404).json({ message: "Not found" });
    }

    // 🔥 Delete images from cloudinary
    const deletions = [];

    if (series.thumbnail?.publicId) {
      deletions.push(
        cloudinary.uploader.destroy(series.thumbnail.publicId)
      );
    }

    if (series.coverImage?.publicId) {
      deletions.push(
        cloudinary.uploader.destroy(series.coverImage.publicId)
      );
    }

    await Promise.all(deletions);

    // 🔥 Delete DB
    await TestSeries.findByIdAndDelete(req.params.id);

    res.json({ message: "Deleted successfully 🚀" });
  } catch (error) {
    console.error("DELETE ERROR:", error);
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
    let enrolledSet = new Set();

    if (userId) {
      const enrollments = await Enrollment.find({
        studentId: userId,
        status: "active",
        accessGranted: true,
      }).select("testSeriesId");

      enrolledSet = new Set(
        enrollments.map((e) => e.testSeriesId.toString())
      );
    }

    const updated = seriesList.map((series) => ({
      ...series,
      price: 0,
      originalPrice: 0,
      discount: 0,
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
    const data = await TestSeries.findById(req.params.id).lean();
    if (!data) return res.json(null);

    const isEnrolled = req.user
      ? Boolean(
          await Enrollment.exists({
            studentId: req.user._id,
            testSeriesId: data._id,
            status: "active",
            accessGranted: true,
          })
        )
      : false;

    res.json({
      ...data,
      price: 0,
      originalPrice: 0,
      discount: 0,
      isEnrolled,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
