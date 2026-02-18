

import mongoose from "mongoose";
import dotenv from "dotenv";
import TestSeries from "../models/TestSeries.js";
import Test from "../models/Test.js";
import Question from "../models/Question.js";

dotenv.config();

const MONGO_URI="mongodb://mongo:gOGWifbblswQORkGpeliwWvJQIcvCOCF@interchange.proxy.rlwy.net:54928";

await mongoose.connect(MONGO_URI);
console.log("Mongo Connected");

/* ================= UTIL ================= */

const IMAGE_URL =
"https://res.cloudinary.com/ddqfigth6/image/upload/v1771395121/test-series/i4mcpntsqlpb45pqe3i0.jpg";

const subjects = ["गणित", "तार्किक क्षमता", "विज्ञान"];

/* ================= QUESTION BUILDERS ================= */

const createMCQ = (testId, i) => ({
  testId,
  type: "MCQ",
  questionText: {
    english: `What is the square of ${i}?`,
    hindi: `${i} का वर्ग कितना होता है?`,
  },
  options: [
    { english: `${i}`, hindi: `${i}` },
    { english: `${i * 2}`, hindi: `${i * 2}` },
    { english: `${i * i}`, hindi: `${i * i}` },
    { english: `${i + 3}`, hindi: `${i + 3}` },
  ],
  correctAnswer: `${i * i}`,
  marks: 4,
  negativeMarks: 1,
  questionLang: "english",
});

const createMSQ = (testId) => ({
  testId,
  type: "MSQ",
  questionText: {
    english: "Select all prime numbers less than 10.",
    hindi: "10 से कम सभी अभाज्य संख्याओं का चयन कीजिए।",
  },
  options: [
    { english: "2", hindi: "2" },
    { english: "3", hindi: "3" },
    { english: "4", hindi: "4" },
    { english: "5", hindi: "5" },
  ],
  correctAnswers: ["2", "3", "5"],
  marks: 4,
  negativeMarks: 1,
  questionLang: "english",
});

const createMathWithImage = (testId) => ({
  testId,
  type: "MATH",
  questionText: {
    english:
      "Find the area of the square shown in the image. Side length = 6 cm.",
    hindi:
      "चित्र में दर्शाए गए वर्ग का क्षेत्रफल ज्ञात कीजिए। भुजा की लंबाई = 6 सेमी।",
  },
  options: [
    { english: "30 cm²", hindi: "30 वर्ग सेमी" },
    { english: "36 cm²", hindi: "36 वर्ग सेमी" },
    { english: "42 cm²", hindi: "42 वर्ग सेमी" },
    { english: "48 cm²", hindi: "48 वर्ग सेमी" },
  ],
  correctAnswer: "36 cm²",
  questionImage: {
    url: IMAGE_URL,
    publicId: "square_sample",
  },
  marks: 5,
  negativeMarks: 2,
  questionLang: "english",
});

const createAssertionReason = (testId) => ({
  testId,
  type: "ASSERTION_REASON",
  questionText: {
    english:
      "Assertion: The Earth revolves around the Sun. Reason: The Earth completes one revolution in 365 days.",
    hindi:
      "कथन: पृथ्वी सूर्य की परिक्रमा करती है। कारण: पृथ्वी 365 दिनों में एक परिक्रमा पूर्ण करती है।",
  },
  options: [
    {
      english: "Both A and R are true and R explains A",
      hindi: "कथन और कारण दोनों सत्य हैं तथा कारण, कथन की व्याख्या करता है",
    },
    {
      english: "Both A and R are true but R does not explain A",
      hindi: "दोनों सत्य हैं परंतु कारण, कथन की व्याख्या नहीं करता",
    },
    {
      english: "Assertion is true but Reason is false",
      hindi: "कथन सत्य है परंतु कारण असत्य है",
    },
    {
      english: "Both are false",
      hindi: "दोनों असत्य हैं",
    },
  ],
  correctAnswer: "Both A and R are true and R explains A",
  marks: 4,
  negativeMarks: 1,
  questionLang: "english",
});

const createPassage = (testId) => ({
  testId,
  type: "PASSAGE",
  questionText: {
    english:
      "Passage: Water boils at 100°C at sea level. Question: What is the boiling point of water at sea level?",
    hindi:
      "गद्यांश: समुद्र तल पर जल 100° सेल्सियस पर उबलता है। प्रश्न: समुद्र तल पर जल का क्वथनांक कितना है?",
  },
  options: [
    { english: "90°C", hindi: "90° सेल्सियस" },
    { english: "100°C", hindi: "100° सेल्सियस" },
    { english: "120°C", hindi: "120° सेल्सियस" },
    { english: "80°C", hindi: "80° सेल्सियस" },
  ],
  correctAnswer: "100°C",
  marks: 4,
  negativeMarks: 1,
  questionLang: "english",
});

/* ================= SEED PROCESS ================= */

await TestSeries.deleteMany();
await Test.deleteMany();
await Question.deleteMany();

for (let s = 1; s <= 3; s++) {
  const series = await TestSeries.create({
    title: `प्रतियोगी परीक्षा श्रृंखला ${s}`,
    description: "पूर्ण द्विभाषी अभ्यास परीक्षा श्रृंखला",
    price: 999,
    originalPrice: 1499,
    discount: 30,
    duration: 90,
    language: "bilingual",
    features: [
      "अंग्रेज़ी एवं हिंदी दोनों भाषाओं में प्रश्न",
      "विस्तृत विश्लेषण",
      "पूर्ण लंबाई के मॉक टेस्ट",
    ],
    subjects,
    thumbnail: IMAGE_URL,
  });

  for (let t = 1; t <= 3; t++) {
    const test = await Test.create({
      testSeriesId: series._id,
      subject: subjects[t - 1],
      name: `मॉक टेस्ट ${t} - श्रृंखला ${s}`,
      duration: 60,
      totalMarks: 40,
      passingMarks: 16,
    });

    const questions = [];

    for (let q = 1; q <= 10; q++) {
      if (q === 1) questions.push(createMSQ(test._id));
      else if (q === 2) questions.push(createMathWithImage(test._id));
      else if (q === 3) questions.push(createAssertionReason(test._id));
      else if (q === 4) questions.push(createPassage(test._id));
      else questions.push(createMCQ(test._id, q));
    }

    await Question.insertMany(questions);
  }
}

console.log("✅ द्विभाषी Seed सफलतापूर्वक पूर्ण हुआ");
process.exit();
