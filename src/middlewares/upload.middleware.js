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
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

/* ================= CLOUDINARY UPLOAD ================= */
const uploadToCloudinary = async (req, res, next) => {
  try {
    if (!req.files) return next();

    if (!cloudinary) {
      const err = new Error("Cloudinary not configured");
      err.statusCode = 500;
      throw err;
    }

    const uploadSingle = (fileBuffer) => {
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

        stream.end(fileBuffer);
      });
    };

    const uploadedFiles = {};

    // 🔹 Upload Thumbnail
    if (req.files.thumbnail) {
      const result = await uploadSingle(req.files.thumbnail[0].buffer);
      uploadedFiles.thumbnail = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    // 🔹 Upload Cover Image
    if (req.files.coverImage) {
      const result = await uploadSingle(req.files.coverImage[0].buffer);
      uploadedFiles.coverImage = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    req.uploadedFiles = uploadedFiles;

    next();
  } catch (error) {
    error.statusCode = error.statusCode || 500;
    next(error);
  }
};
export { upload, uploadToCloudinary };