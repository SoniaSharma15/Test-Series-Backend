import express from "express";
import cors from "cors";
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
import resultRoute from "./routes/resultRoutes.js"


const app = express();

app.use(cors());
app.use(express.json());

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
export default app;
