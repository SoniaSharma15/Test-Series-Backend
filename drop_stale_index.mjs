import "dotenv/config";
import mongoose from "mongoose";

async function main() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected successfully!");

    const db = mongoose.connection.db;
    const enrollments = db.collection("enrollments");
    const indexes = await enrollments.indexes();
    console.log("Current indexes on enrollments:", indexes.map(i => i.name));

    for (const idx of indexes) {
      if (
        idx.name === "student_1_batch_1" ||
        (idx.key && (idx.key.student !== undefined || idx.key.batch !== undefined))
      ) {
        console.log(`Dropping obsolete index: ${idx.name}`);
        await enrollments.dropIndex(idx.name);
        console.log(`Dropped index: ${idx.name}`);
      }
    }

    console.log("Done! You can delete this script.");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
