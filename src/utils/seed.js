import mongoose from "mongoose";
import dotenv from "dotenv";
import TestSeries from "../models/TestSeries.js";
import Test from "../models/Test.js";
import Question from "../models/Question.js";

dotenv.config();

const MONGO_URI =
  "mongodb://mongo:gOGWifbblswQORkGpeliwWvJQIcvCOCF@interchange.proxy.rlwy.net:54928";

const IMAGE =
  "https://images.unsplash.com/photo-1770215962687-93b6b860add7?w=1000&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwzfHx8ZW58MHx8fHx8";

const options = (a, b, c, d) => [
  { id: "A", text: a },
  { id: "B", text: b },
  { id: "C", text: c },
  { id: "D", text: d },
];

const generateQuestions = (testId) => [
  // ================= MCQ =================
  {
    testId,
    type: "MCQ",
    section: "Polity",
    difficulty: "MEDIUM",
    questionText: {
      english: "Which Schedule of the Constitution deals with Anti-Defection?",
      hindi: "संविधान की कौन-सी अनुसूची दल-बदल विरोधी कानून से संबंधित है?",
    },
    options: options(
      { english: "Ninth", hindi: "नवम" },
      { english: "Tenth", hindi: "दसवीं" },
      { english: "Eleventh", hindi: "ग्यारहवीं" },
      { english: "Twelfth", hindi: "बारहवीं" }
    ),
    correctAnswers: ["B"],
    marks: 2,
    negativeMarks: 0.33,
  },

  // ================= MSQ =================
  {
    testId,
    type: "MSQ",
    section: "Environment",
    difficulty: "HARD",
    questionText: {
      english: "Which of the following are Biosphere Reserves in India?",
      hindi: "निम्नलिखित में से कौन भारत में बायोस्फीयर रिजर्व हैं?",
    },
    options: options(
      { english: "Nilgiri", hindi: "नीलगिरि" },
      { english: "Sundarbans", hindi: "सुंदरबन" },
      { english: "Kaziranga", hindi: "काज़ीरंगा" },
      { english: "Nanda Devi", hindi: "नंदा देवी" }
    ),
    correctAnswers: ["A", "B", "D"],
    marks: 2,
    negativeMarks: 0.33,
  },

  // ================= ASSERTION REASON =================
  {
    testId,
    type: "ASSERTION_REASON",
    section: "Geography",
    difficulty: "MEDIUM",
    assertion: {
      english: "Western Ghats receive heavy rainfall.",
      hindi: "पश्चिमी घाटों में अधिक वर्षा होती है।",
    },
    reason: {
      english: "They block southwest monsoon winds.",
      hindi: "वे दक्षिण-पश्चिम मानसून हवाओं को अवरुद्ध करते हैं।",
    },
    options: options(
      {
        english: "Both A and R are true and R explains A",
        hindi: "A और R दोनों सत्य हैं और R, A की व्याख्या करता है",
      },
      {
        english: "Both A and R true but R not explanation",
        hindi: "दोनों सत्य हैं पर R व्याख्या नहीं करता",
      },
      { english: "A true R false", hindi: "A सत्य, R असत्य" },
      { english: "A false R true", hindi: "A असत्य, R सत्य" }
    ),
    correctAnswers: ["A"],
    marks: 2,
    negativeMarks: 0.33,
  },

  // ================= MATH =================
  {
    testId,
    type: "MATH",
    section: "CSAT",
    difficulty: "EASY",
    questionText: {
      english: "If the ratio of A:B is 3:4 and B:C is 2:5, find A:C.",
      hindi: "यदि A:B = 3:4 और B:C = 2:5, तो A:C ज्ञात कीजिए।",
    },
    options: options(
      { english: "3:10", hindi: "3:10" },
      { english: "6:20", hindi: "6:20" },
      { english: "3:5", hindi: "3:5" },
      { english: "4:5", hindi: "4:5" }
    ),
    correctAnswers: ["A"],
    marks: 2,
    negativeMarks: 0.33,
  },

  // ================= PASSAGE =================
  {
    testId,
    type: "PASSAGE",
    section: "Economy",
    difficulty: "MEDIUM",
    passageText: {
      english:
        "Inflation refers to the general increase in prices of goods and services in an economy over a period of time.",
      hindi:
        "मुद्रास्फीति से आशय अर्थव्यवस्था में वस्तुओं और सेवाओं के मूल्यों में सामान्य वृद्धि से है।",
    },
    passageQuestions: [
      {
        type: "MCQ",
        questionText: {
          english: "Which institution controls inflation in India?",
          hindi: "भारत में मुद्रास्फीति को कौन नियंत्रित करता है?",
        },
        options: options(
          { english: "SEBI", hindi: "सेबी" },
          { english: "RBI", hindi: "आरबीआई" },
          { english: "Finance Ministry", hindi: "वित्त मंत्रालय" },
          { english: "NITI Aayog", hindi: "नीति आयोग" }
        ),
        correctAnswers: ["B"],
        marks: 2,
        negativeMarks: 0.33,
      },
      {
        type: "MCQ",
        questionText: {
          english: "Which of the following increases inflation?",
          hindi: "निम्न में से कौन मुद्रास्फीति बढ़ाता है?",
        },
        options: options(
          { english: "Decrease in demand", hindi: "मांग में कमी" },
          { english: "Increase in money supply", hindi: "मुद्रा आपूर्ति में वृद्धि" },
          { english: "Lower fuel prices", hindi: "ईंधन मूल्य में कमी" },
          { english: "Higher production", hindi: "उत्पादन में वृद्धि" }
        ),
        correctAnswers: ["B"],
        marks: 2,
        negativeMarks: 0.33,
      },
    ],
  },
];

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB Connected");

    await TestSeries.deleteMany();
    await Test.deleteMany();
    await Question.deleteMany();

    const titles = [
      "UPSC Prelims 2024 GS Full Length Test Series",
      "UPSC Prelims 2024 Sectional Test Series",
    ];

    for (let s = 0; s < 2; s++) {
      const series = await TestSeries.create({
        title: titles[s],
        description: "UPSC CSE Prelims based real exam pattern test series.",
        price: 0,
        originalPrice: 0,
        discount: 0,
        duration: 180,
        startDate: new Date(),
        language: "English & Hindi",
        features: ["UPSC Level", "Detailed Explanation", "All India Ranking"],
        subjects: [
          "Polity",
          "History",
          "Economy",
          "Geography",
          "Environment",
        ],
        thumbnail: IMAGE,
      });

      for (let t = 1; t <= 5; t++) {
        const test = await Test.create({
          testSeriesId: series._id,
          subject: "General Studies Paper 1",
          name: `Test ${t}`,
          duration: 120,
          totalMarks: 40,
          passingMarks: 13,
          scheduledTime: new Date(),
        });

        const questions = [];

        for (let i = 0; i < 4; i++) {
          questions.push(...generateQuestions(test._id));
        }

        await Question.insertMany(questions.slice(0, 20));
      }
    }

    console.log("✅ Full UPSC Test Series Seeded Successfully");
    process.exit();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

seedData();