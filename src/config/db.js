import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: process.env.NODE_ENV !== "production", // disable in prod
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    process.exit(1); // Stop server if DB fails
  }
};

/* ================= DB EVENT LISTENERS ================= */

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB Disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("🔁 MongoDB Reconnected");
});

export default connectDB;