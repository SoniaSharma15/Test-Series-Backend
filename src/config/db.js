import mongoose from "mongoose";

const dropObsoleteIndexes = async (conn) => {
  try {
    const db = conn.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    if (collectionNames.includes("enrollments")) {
      const enrollmentsCollection = db.collection("enrollments");
      const indexes = await enrollmentsCollection.indexes();

      for (const idx of indexes) {
        const isObsolete =
          idx.name === "student_1_batch_1" ||
          (idx.key &&
            (idx.key.student !== undefined || idx.key.batch !== undefined));

        if (isObsolete) {
          console.log(`⚠️ Dropping obsolete index on enrollments: ${idx.name}`);
          try {
            await enrollmentsCollection.dropIndex(idx.name);
            console.log(`✅ Successfully dropped obsolete index: ${idx.name}`);
          } catch (dropErr) {
            console.warn(`Could not drop ${idx.name}:`, dropErr.message);
          }
        }
      }
    }
  } catch (err) {
    console.warn("Notice during obsolete index cleanup:", err.message);
  }
};

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: process.env.NODE_ENV !== "production", // disable in prod
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Clean up any legacy conflicting indexes from older schemas
    await dropObsoleteIndexes(conn);

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
