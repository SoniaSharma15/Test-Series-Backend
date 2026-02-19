import Question from "../models/Question.js";
import cloudinary from "../config/cloudinary.js";

const validateOptions = (options) => {
  if (!options || options.length !== 4) {
    throw new Error("Exactly 4 options required");
  }

  const ids = options.map((o) => o.id);
  const required = ["A", "B", "C", "D"];

  if (!required.every((r) => ids.includes(r))) {
    throw new Error("Options must include A, B, C, D");
  }
};

const validateCorrectAnswers = (correctAnswers, options) => {
  if (!correctAnswers?.length) {
    throw new Error("At least one correct answer required");
  }

  const validIds = options.map((o) => o.id);

  const isValid = correctAnswers.every((ans) =>
    validIds.includes(ans)
  );

  if (!isValid) {
    throw new Error("Correct answers must match option ids");
  }
};


const validateQuestion = (data) => {
  if (data.type === "PASSAGE") {
    if (!data.passageText?.english) {
      throw new Error("Passage text required");
    }

    if (!data.passageQuestions?.length) {
      throw new Error("Passage must contain questions");
    }

    data.passageQuestions.forEach((q) => {
      validateOptions(q.options);
      validateCorrectAnswers(q.correctAnswers, q.options);

      if (q.type === "ASSERTION_REASON") {
        if (!q.assertion?.english || !q.reason?.english) {
          throw new Error("Assertion and Reason required");
        }
      } else {
        if (!q.questionText?.english) {
          throw new Error("Question text required");
        }
      }
    });
  } else {
    validateOptions(data.options);
    validateCorrectAnswers(data.correctAnswers, data.options);

    if (data.type === "ASSERTION_REASON") {
      if (!data.assertion?.english || !data.reason?.english) {
        throw new Error("Assertion and Reason required");
      }
    } else {
      if (!data.questionText?.english) {
        throw new Error("Question text required");
      }
    }
  }
};


export const createQuestion = async (req, res) => {
  console.log("========== CREATE QUESTION START ==========");

  try {
    let data = { ...req.body };

    console.log("Raw req.body:", req.body);
    console.log("Uploaded File:", req.uploadedFile);

    /* =====================================================
       1️⃣ SAFE JSON PARSE (ALL POSSIBLE OBJECT FIELDS)
    ===================================================== */

    const fieldsToParse = [
      "options",
      "correctAnswers",
      "passageQuestions",
      "questionText",
      "assertion",
      "reason",
      "explanation",
      "passageText",
    ];

    fieldsToParse.forEach((field) => {
      if (typeof data[field] === "string") {
        try {
          data[field] = JSON.parse(data[field]);
          console.log(`Parsed field: ${field}`);
        } catch (err) {
          console.log(`Failed parsing field: ${field}`);
        }
      }
    });

    console.log("After parsing:", data);

    /* =====================================================
       2️⃣ CLOUDINARY IMAGE
    ===================================================== */

    if (req.uploadedFile) {
      data.image = req.uploadedFile.url;
      data.imagePublicId = req.uploadedFile.publicId;
      console.log("Image attached:", data.image);
    }

    /* =====================================================
       3️⃣ BASIC REQUIRED CHECK
    ===================================================== */

    if (!data.testId) {
      throw new Error("testId missing");
    }

    if (!data.type) {
      throw new Error("Question type missing");
    }

    console.log("Type:", data.type);

    /* =====================================================
       4️⃣ VALIDATION LOGIC
    ===================================================== */

    if (data.type === "PASSAGE") {
      console.log("Validating PASSAGE...");

      if (!data.passageText?.english) {
        throw new Error("Passage text required");
      }

      if (!Array.isArray(data.passageQuestions) || !data.passageQuestions.length) {
        throw new Error("Passage must contain questions");
      }

      data.passageQuestions.forEach((q, index) => {
        console.log(`Validating child question ${index}`);

        validateOptions(q.options);
        validateCorrectAnswers(q.correctAnswers, q.options);

        if (q.type === "ASSERTION_REASON") {
          if (!q.assertion?.english || !q.reason?.english) {
            throw new Error(`Assertion/Reason missing in sub question ${index}`);
          }
        } else {
          if (!q.questionText?.english) {
            throw new Error(`Question text missing in sub question ${index}`);
          }
        }
      });

    } else {
      console.log("Validating NORMAL question...");

      validateOptions(data.options);
      validateCorrectAnswers(data.correctAnswers, data.options);

      if (data.type === "ASSERTION_REASON") {
        if (!data.assertion?.english || !data.reason?.english) {
          throw new Error("Assertion and Reason required");
        }
      } else {
        if (!data.questionText?.english) {
          throw new Error("Question text required");
        }
      }
    }

    console.log("Validation passed ✔");

    /* =====================================================
       5️⃣ CREATE IN DB
    ===================================================== */

    const question = await Question.create(data);

    console.log("Question created:", question._id);
    console.log("========== CREATE QUESTION SUCCESS ==========");

    res.status(201).json({
      success: true,
      message: "Question created successfully",
      data: question,
    });

  } catch (error) {
    console.log("❌ CREATE QUESTION ERROR:", error.message);
    console.log("Stack:", error.stack);
    console.log("========== CREATE QUESTION FAILED ==========");

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};




export const getQuestionsByTest = async (req, res) => {
  try {
    const { testId } = req.params;

    const questions = await Question.find({ testId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: questions.length,
      data: questions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



export const updateQuestion = async (req, res) => {
  try {
    let data = { ...req.body };

    const existing = await Question.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }
        // ✅ SAFE JSON PARSE (same as create)
    const fieldsToParse = [
      "options",
      "correctAnswers",
      "passageQuestions",
      "questionText",
      "assertion",
      "reason",
      "explanation",
      "passageText",
    ];
  fieldsToParse.forEach((field) => {
      if (typeof data[field] === "string") {
        try {
          data[field] = JSON.parse(data[field]);
        } catch (err) {
          // keep as-is if parsing fails
        }
      }
    });
   
    // If new image uploaded → delete old image
    if (req.uploadedFile) {
      if (existing.imagePublicId) {
        await cloudinary.uploader.destroy(existing.imagePublicId);
      }

      data.image = req.uploadedFile.url;
      data.imagePublicId = req.uploadedFile.publicId;
    }

    const updated = await Question.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};



export const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Delete image from Cloudinary
    if (question.imagePublicId) {
      await cloudinary.uploader.destroy(question.imagePublicId);
    }

    await question.deleteOne();

    res.status(200).json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

