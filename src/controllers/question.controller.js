// server/src/controllers/question.controller.js
import Question from "../models/Question.js";
import cloudinary from "../config/cloudinary.js";

const parseIfJSON = (v) => {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
};

const ensureArray = (v) => (Array.isArray(v) ? v : []);

const validateOptions4 = (options) =>
  Array.isArray(options) &&
  options.length === 4 &&
  options.every((x) => String(x).trim().length > 0);

const safeCloudinaryDestroy = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (e) {
    console.error("Cloudinary destroy failed:", e?.message || e);
  }
};

export const createQuestion = async (req, res) => {
  try {
    // ✅ multipart/form-data strings -> parse
    req.body.options = parseIfJSON(req.body.options);
    req.body.meta = parseIfJSON(req.body.meta);

    // ✅ marks numeric
    req.body.marks = toNumber(req.body.marks);

    // ✅ if image uploaded (uploadToCloudinary middleware sets this)
    if (req.uploadedFile) {
      req.body.questionImage = req.uploadedFile; // { url, publicId }
    }

    const { type, options, correctAnswer } = req.body;

    // -------------------------
    // VALIDATIONS by type
    // -------------------------
    if (type === "MCQ" || type === "MATH") {
      const opts = ensureArray(options);

      if (!validateOptions4(opts)) {
        return res.status(400).json({ message: `${type} must have 4 options` });
      }
      if (!correctAnswer || !String(correctAnswer).trim()) {
        return res.status(400).json({ message: "Correct answer required" });
      }

      req.body.options = opts;
    }

    if (type === "ASSERTION_REASON") {
      const opts = ensureArray(options);

      if (!validateOptions4(opts)) {
        return res
          .status(400)
          .json({ message: "ASSERTION_REASON must have 4 options" });
      }
      if (!correctAnswer || !String(correctAnswer).trim()) {
        return res.status(400).json({ message: "Correct answer required" });
      }

      req.body.options = opts;
    }

    if (type === "THEORETICAL") {
      req.body.options = [];
      req.body.correctAnswer = "";
    }

    if (type === "PASSAGE") {
      req.body.options = ensureArray(options);
      req.body.correctAnswer = correctAnswer || "";
    }

    const question = await Question.create(req.body);
    return res.status(201).json(question);
  } catch (error) {
    // ✅ proper status for mongoose validation errors
    if (error?.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    // ✅ multipart/form-data strings -> parse
    req.body.options = parseIfJSON(req.body.options);
    req.body.meta = parseIfJSON(req.body.meta);

    // ✅ marks numeric
    if (req.body.marks !== undefined) req.body.marks = toNumber(req.body.marks);

    // If a new image is uploaded, delete old image from Cloudinary
    let oldPublicId = "";
    if (req.uploadedFile) {
      const existing = await Question.findById(req.params.id).select("questionImage");
      oldPublicId = existing?.questionImage?.publicId || "";
      req.body.questionImage = req.uploadedFile; // replace with new
    }

    const { type, options, correctAnswer } = req.body;

    // -------------------------
    // VALIDATIONS by type
    // -------------------------
    if (type === "MCQ" || type === "MATH") {
      const opts = ensureArray(options);

      if (!validateOptions4(opts)) {
        return res.status(400).json({ message: `${type} must have 4 options` });
      }
      if (!correctAnswer || !String(correctAnswer).trim()) {
        return res.status(400).json({ message: "Correct answer required" });
      }

      req.body.options = opts;
    }

    if (type === "ASSERTION_REASON") {
      const opts = ensureArray(options);

      if (!validateOptions4(opts)) {
        return res
          .status(400)
          .json({ message: "ASSERTION_REASON must have 4 options" });
      }
      if (!correctAnswer || !String(correctAnswer).trim()) {
        return res.status(400).json({ message: "Correct answer required" });
      }

      req.body.options = opts;
    }

    if (type === "THEORETICAL") {
      req.body.options = [];
      req.body.correctAnswer = "";
    }

    if (type === "PASSAGE") {
      req.body.options = ensureArray(options);
      req.body.correctAnswer = correctAnswer || "";
    }

    const updated = await Question.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true, // ✅ keeps schema validation on update
    });

    if (!updated) {
      // if we uploaded new image but question not found, cleanup new upload
      if (req.uploadedFile?.publicId) await safeCloudinaryDestroy(req.uploadedFile.publicId);
      return res.status(404).json({ message: "Question not found" });
    }

    // ✅ delete old cloudinary image AFTER successful update
    if (req.uploadedFile && oldPublicId) {
      await safeCloudinaryDestroy(oldPublicId);
    }

    return res.json(updated);
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const q = await Question.findById(req.params.id).select("questionImage");
    if (!q) return res.status(404).json({ message: "Question not found" });

    const publicId = q?.questionImage?.publicId || "";

    await Question.findByIdAndDelete(req.params.id);

    if (publicId) {
      await safeCloudinaryDestroy(publicId);
    }

    return res.json({ message: "Question deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getQuestionsByTest = async (req, res) => {
  try {
    const questions = await Question.find({ testId: req.params.testId }).sort({
      createdAt: -1,
    });

    return res.json(questions);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
