import mongoose from "mongoose";
import dotenv from "dotenv";
import TestSeries from "../models/TestSeries.js";
import Test from "../models/Test.js";
import Question from "../models/Question.js";

dotenv.config();



const MONGO_URI="mongodb://mongo:gOGWifbblswQORkGpeliwWvJQIcvCOCF@interchange.proxy.rlwy.net:54928";

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB Connected");


    // =========================
    // LOOP FOR 3 TEST SERIES
    // =========================
    for (let s = 1; s <= 3; s++) {
      const series = await TestSeries.create({
        title: `Competitive Exam Series ${s}`,
        description: `Comprehensive practice test series ${s} for competitive exams with detailed solutions.`,
        price: 999,
        originalPrice: 1499,
        discount: 33,
        duration: 90,
        startDate: new Date(),
        language: "bilingual",
        features: [
          "Detailed Solutions",
          "All India Ranking",
          "Performance Analysis",
        ],
        subjects: ["Mathematics", "Reasoning", "General Science"],
        thumbnail: "https://via.placeholder.com/300",
        offerExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // =========================
      // 3 TESTS PER SERIES
      // =========================
      for (let t = 1; t <= 3; t++) {
        const test = await Test.create({
          testSeriesId: series._id,
          subject: "General Science",
          name: `Test ${t} - Series ${s}`,
          duration: 60,
          totalMarks: 100,
          passingMarks: 35,
          scheduledTime: new Date(),
        });

        // =========================
        // 5 QUESTIONS PER TEST
        // =========================

        const questions = [

          // 1️⃣ MCQ
          {
            type: "MCQ",
            questionText: {
              english: "What is the chemical symbol of Gold?",
              hindi: "सोने का रासायनिक प्रतीक क्या है?"
            },
            options: [
              { english: "Au", hindi: "Au" },
              { english: "Ag", hindi: "Ag" },
              { english: "Gd", hindi: "Gd" },
              { english: "Go", hindi: "Go" },
            ],
            correctAnswer: "Au",
            marks: 4,
            negativeMarks: 1,
          },

          // 2️⃣ MSQ
          {
            type: "MSQ",
            questionText: {
              english: "Which of the following are prime numbers?",
              hindi: "निम्न में से कौन-सी संख्याएँ अभाज्य हैं?"
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
          },

          // 3️⃣ MATH
          {
            type: "MATH",
            questionText: {
              english: "Solve: 12 × 8 = ?",
              hindi: "हल कीजिए: 12 × 8 = ?"
            },
            correctAnswer: "96",
            marks: 4,
            negativeMarks: 1,
          },

          // 4️⃣ ASSERTION_REASON
          {
            type: "ASSERTION_REASON",
            questionText: {
              english:
                "Assertion (A): The Earth revolves around the Sun. Reason (R): The Sun is at the center of the Solar System.",
              hindi:
                "कथन (A): पृथ्वी सूर्य के चारों ओर परिक्रमा करती है। कारण (R): सूर्य सौरमंडल के केंद्र में है।",
            },
            options: [
              {
                english: "Both A and R are true and R is the correct explanation of A",
                hindi:
                  "A और R दोनों सत्य हैं और R, A की सही व्याख्या है",
              },
              {
                english: "Both A and R are true but R is not the correct explanation of A",
                hindi:
                  "A और R दोनों सत्य हैं लेकिन R, A की सही व्याख्या नहीं है",
              },
              {
                english: "A is true but R is false",
                hindi: "A सत्य है लेकिन R असत्य है",
              },
              {
                english: "A is false but R is true",
                hindi: "A असत्य है लेकिन R सत्य है",
              },
            ],
            correctAnswer:
              "Both A and R are true and R is the correct explanation of A",
            marks: 4,
            negativeMarks: 1,
          },

          // 5️⃣ PASSAGE
          {
            type: "PASSAGE",
            questionText: {
              english:
                "Passage: Water boils at 100°C at sea level. Question: At what temperature does water boil at sea level?",
              hindi:
                "गद्यांश: समुद्र तल पर पानी 100°C पर उबलता है। प्रश्न: समुद्र तल पर पानी किस तापमान पर उबलता है?",
            },
            options: [
              { english: "90°C", hindi: "90°C" },
              { english: "100°C", hindi: "100°C" },
              { english: "80°C", hindi: "80°C" },
              { english: "120°C", hindi: "120°C" },
            ],
            correctAnswer: "100°C",
            marks: 4,
            negativeMarks: 1,
          },
        ];

        for (let q of questions) {
          await Question.create({
            testId: test._id,
            ...q,
          });
        }
      }
    }

    console.log("✅ Seeding Completed Successfully");
    process.exit();
  } catch (error) {
    console.error("❌ Error in seeding:", error);
    process.exit(1);
  }
};

seedData();
