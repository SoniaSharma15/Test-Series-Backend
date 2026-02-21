import "dotenv/config";

import app from "./app.js";
import connectDB from "./config/db.js";

/* =====================================================
   1️⃣ Handle Uncaught Exceptions (Sync Errors)
===================================================== */
process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT EXCEPTION! Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

/* =====================================================
   2️⃣ Start Server Only After DB Connected
===================================================== */
const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ Database Connected Successfully");

    const PORT = process.env.PORT || 5000;

    const server = app.listen(PORT, () => {
      console.log(
        `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
      );
    });

    /* =====================================================
       3️⃣ Handle Unhandled Promise Rejections
    ===================================================== */
    process.on("unhandledRejection", (err) => {
      console.error("💥 UNHANDLED REJECTION! Shutting down...");
      console.error(err.name, err.message);

      server.close(() => {
        process.exit(1);
      });
    });

    /* =====================================================
       4️⃣ Graceful Shutdown (Ctrl + C / Production Stop)
    ===================================================== */
    process.on("SIGTERM", () => {
      console.log("👋 SIGTERM received. Shutting down gracefully...");
      server.close(() => {
        console.log("💤 Process terminated");
      });
    });

  } catch (error) {
    console.error("❌ Failed to connect to database");
    console.error(error.message);
    process.exit(1);
  }
};

startServer();