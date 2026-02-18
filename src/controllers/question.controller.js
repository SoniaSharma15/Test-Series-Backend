// controllers/question.controller.js
import Question from "../models/Question.js";

/* =========================
   Helpers
========================= */
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

const normalizeLang = (req) => {
  // accepts: req.body.lang OR req.body.meta.lang
  const meta = parseIfJSON(req.body.meta) || {};
  const raw = String(req.body.lang || meta.lang || "english")
    .trim()
    .toLowerCase();

  if (raw === "hi" || raw === "hindi") return "hindi";
  return "english"; // default
};

const getOptText = (opt, lang) => String(opt?.[lang] || "").trim();

const validateOptions4ByLang = (options, lang) => {
  if (!Array.isArray(options) || options.length !== 4) return false;
  // ✅ selected language required, other can be empty
  return options.every((o) => getOptText(o, lang).length > 0);
};

const normalizeCorrectAnswers = (v) => {
  // supports:
  // - ["a","b"]
  // - '["a","b"]'
  // - "a,b"
  const parsed = parseIfJSON(v);

  if (Array.isArray(parsed)) {
    return parsed.map((x) => String(x || "").trim()).filter(Boolean);
  }

  if (typeof parsed === "string") {
    return parsed
      .split(",")
      .map((x) => String(x || "").trim())
      .filter(Boolean);
  }

  return [];
};

const validateMSQAnswersByLang = (options, correctAnswers, lang) => {
  const optList = options.map((o) => getOptText(o, lang));

  const cleaned = ensureArray(correctAnswers)
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  // ✅ at least 2
  if (cleaned.length < 2) return false;

  // ✅ unique
  if (new Set(cleaned).size !== cleaned.length) return false;

  // ✅ must match options in selected language
  return cleaned.every((ans) => optList.includes(ans));
};

/* =========================
   CREATE
========================= */
export const createQuestion = async (req, res) => {
  try {
    // ✅ multipart/form-data strings -> parse
    req.body.questionText = parseIfJSON(req.body.questionText);
    req.body.options = parseIfJSON(req.body.options);
    req.body.meta = parseIfJSON(req.body.meta);

    // ✅ numeric fields
    req.body.marks = toNumber(req.body.marks);
    req.body.negativeMarks = toNumber(req.body.negativeMarks);

    const type = String(req.body.type || "").trim();
    const lang = normalizeLang(req); // ✅ "english" | "hindi"

    // ✅ Store the question language for answer validation
    req.body.questionLang = lang;

    // ✅ attach uploaded image info (from upload.middleware -> uploadToCloudinary)
    if (req.uploadedFile) {
      req.body.questionImage = req.uploadedFile;
    }

    // ✅ normalize MSQ correctAnswers before validation
    if (type === "MSQ") {
      req.body.correctAnswers = normalizeCorrectAnswers(req.body.correctAnswers);
    }

    // -------------------------
    // VALIDATIONS by type
    // -------------------------
    if (type === "MCQ" || type === "MATH" || type === "ASSERTION_REASON") {
      const opts = ensureArray(req.body.options);

      if (!validateOptions4ByLang(opts, lang)) {
        return res.status(400).json({
          message: `${type} must have 4 options (${lang} required)`,
        });
      }

      const ca = String(req.body.correctAnswer || "").trim();
      if (!ca) {
        return res.status(400).json({ message: "Correct answer required" });
      }

      // ✅ strict: correctAnswer must match selected-language option
      const optList = opts.map((o) => getOptText(o, lang));
      if (!optList.includes(ca)) {
        return res.status(400).json({
          message: `Correct answer must match a ${lang} option`,
        });
      }

      req.body.options = opts;
      req.body.correctAnswers = []; // keep clean
    }

    if (type === "MSQ") {
      const opts = ensureArray(req.body.options);

      if (!validateOptions4ByLang(opts, lang)) {
        return res.status(400).json({
          message: `MSQ must have 4 options (${lang} required)`,
        });
      }

      const answers = ensureArray(req.body.correctAnswers);

      if (!validateMSQAnswersByLang(opts, answers, lang)) {
        return res.status(400).json({
          message: `MSQ correctAnswers required (min 2), unique, and must match ${lang} options`,
        });
      }

      req.body.options = opts;
      req.body.correctAnswer = ""; // keep clean
      req.body.correctAnswers = answers;
    }

    if (type === "PASSAGE") {
      // Keep flexible for PASSAGE
      req.body.options = ensureArray(req.body.options);
      req.body.correctAnswer = String(req.body.correctAnswer || "").trim();
      req.body.correctAnswers = normalizeCorrectAnswers(req.body.correctAnswers);
    }

    const question = await Question.create(req.body);
    return res.status(201).json(question);
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

/* =========================
   UPDATE
========================= */
export const updateQuestion = async (req, res) => {
  try {
    req.body.questionText = parseIfJSON(req.body.questionText);
    req.body.options = parseIfJSON(req.body.options);
    req.body.meta = parseIfJSON(req.body.meta);

    if (req.body.marks !== undefined) req.body.marks = toNumber(req.body.marks);
    if (req.body.negativeMarks !== undefined)
      req.body.negativeMarks = toNumber(req.body.negativeMarks);

    const type = String(req.body.type || "").trim();
    const lang = normalizeLang(req);

    // ✅ Store the question language for answer validation
    if (type) req.body.questionLang = lang;

    // ✅ attach uploaded image info when updating
    if (req.uploadedFile) {
      req.body.questionImage = req.uploadedFile;
    }

    // ✅ normalize MSQ correctAnswers
    if (type === "MSQ") {
      req.body.correctAnswers = normalizeCorrectAnswers(req.body.correctAnswers);
    }

    // -------------------------
    // VALIDATIONS by type (only if type provided)
    // -------------------------
    if (type === "MCQ" || type === "MATH" || type === "ASSERTION_REASON") {
      const opts = ensureArray(req.body.options);

      if (!validateOptions4ByLang(opts, lang)) {
        return res.status(400).json({
          message: `${type} must have 4 options (${lang} required)`,
        });
      }

      const ca = String(req.body.correctAnswer || "").trim();
      if (!ca) {
        return res.status(400).json({ message: "Correct answer required" });
      }

      const optList = opts.map((o) => getOptText(o, lang));
      if (!optList.includes(ca)) {
        return res.status(400).json({
          message: `Correct answer must match a ${lang} option`,
        });
      }

      req.body.options = opts;
      req.body.correctAnswers = [];
    }

    if (type === "MSQ") {
      const opts = ensureArray(req.body.options);

      if (!validateOptions4ByLang(opts, lang)) {
        return res.status(400).json({
          message: `MSQ must have 4 options (${lang} required)`,
        });
      }

      const answers = ensureArray(req.body.correctAnswers);

      if (!validateMSQAnswersByLang(opts, answers, lang)) {
        return res.status(400).json({
          message: `MSQ correctAnswers required (min 2), unique, and must match ${lang} options`,
        });
      }

      req.body.options = opts;
      req.body.correctAnswer = "";
      req.body.correctAnswers = answers;
    }

    if (type === "PASSAGE") {
      req.body.options = ensureArray(req.body.options);
      req.body.correctAnswer = String(req.body.correctAnswer || "").trim();
      req.body.correctAnswers = normalizeCorrectAnswers(req.body.correctAnswers);
    }

    const updated = await Question.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) return res.status(404).json({ message: "Question not found" });

    return res.json(updated);
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

/* =========================
   DELETE
========================= */
export const deleteQuestion = async (req, res) => {
  try {
    const q = await Question.findById(req.params.id);
    if (!q) return res.status(404).json({ message: "Question not found" });

    await Question.findByIdAndDelete(req.params.id);
    return res.json({ message: "Question deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* =========================
   GET BY TEST
========================= */
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
