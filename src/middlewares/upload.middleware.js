import multer from "multer";
import cloudinary from "../config/cloudinary.js";

/* ================= STORAGE ================= */
const storage = multer.memoryStorage();

/* ================= FILE FILTER ================= */
const fileFilter = (req, file, cb) => {
  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    const err = new Error("Only image files are allowed");
    err.statusCode = 400;
    return cb(err, false);
  }
  cb(null, true);
};

/* ================= MULTER INSTANCE ================= */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

/* ================= CLOUDINARY UPLOAD ================= */
const uploadToCloudinary = async (req, res, next) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return next();
    }

    const uploadSingle = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "test-series",
            resource_type: "image",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(buffer);
      });
    };

    const uploadedFiles = {};

    // ✅ Thumbnail
    if (req.files.thumbnail?.[0]) {
      const result = await uploadSingle(req.files.thumbnail[0].buffer);
      uploadedFiles.thumbnail = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    // ✅ Cover Image
    if (req.files.coverImage?.[0]) {
      const result = await uploadSingle(req.files.coverImage[0].buffer);
      uploadedFiles.coverImage = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    req.uploadedFiles = uploadedFiles;

    next();
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    error.statusCode = error.statusCode || 500;
    next(error);
  }
};

export { upload, uploadToCloudinary };