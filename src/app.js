import express from "express";
import cors from "cors":
/* ==============================
   Route Imports
============================== */
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import testSeriesRoutes from "./routes/testSeries.routes.js";
import testRoutes from "./routes/test.routes.js";
import questionRoutes from "./routes/question.routes.js";
import studentRoutes from "./routes/student.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import enrollmentRoutes from "./routes/enrollment.routes.js";
import attemptRoutes from "./routes/attempt.routes.js";
import adminEnrollmentRoutes from "./routes/adminEnrollmentRoutes.js";
import userRoutes from "./routes/user.routes.js";
import resultRoute from "./routes/resultRoutes.js";

const app = express();

/* ==============================
   CORS Configuration
============================== */

// const allowedOrigins = [
//   "https://testseries.thebrilliantbihar.com",
//   "https://www.testseries.thebrilliantbihar.com",
//    "https://thebrilliantbihar.com",
//    "https://www.thebrilliantbihar.com",

//   // Optional (for development)
//   "http://localhost:3000",
//   "http://localhost:5173",
// ];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       // Allow requests with no origin (Postman / mobile apps)
//       if (!origin) return callback(null, true);

//       if (allowedOrigins.includes(origin)) {
//         return callback(null, true);
//       }

//       console.error("Blocked by CORS:", origin);
//       return callback(new Error("Not allowed by CORS"));
//     },
//     credentials: true,
//   })
// );




app.use(
  cors({
    origin: "*",
  })
);

/* ==============================
   Middlewares
============================== */
app.use(express.json());

/* ==============================
   Health Check API
============================== */
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running 🚀",
    timestamp: new Date().toISOString(),
  });
});

/* ==============================
   Routes
============================== */
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/test-series", testSeriesRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/admin/enrollments", adminEnrollmentRoutes);
app.use("/api/user", userRoutes);
app.use("/api/results", resultRoute);

/* ==============================
   404 Handler
============================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

/* ==============================
   Global Error Handler
============================== */
app.use((err, req, res, next) => {
  console.error("ERROR:", err.message);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
  });
});

export default app;
