// seedAdmin.js

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const MONGO_URI="mongodb://mongo:gOGWifbblswQORkGpeliwWvJQIcvCOCF@interchange.proxy.rlwy.net:54928";


const seedAdmin = async () => {
  try {
    // ✅ Connect DB
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected");

    const adminEmail = "admin@gmail.com";
    const adminPassword = "Admin@123"; // change if needed

    // ✅ Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      process.exit();
    }

    // ✅ Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // ✅ Create Admin
    const admin = await User.create({
      name: "Super Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
    });

    console.log("🎉 Admin Created Successfully!");
    console.log("Email:", admin.email);
    console.log("Password:", adminPassword);

    process.exit();
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
};

seedAdmin();
