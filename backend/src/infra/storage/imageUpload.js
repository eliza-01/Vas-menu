// backend/src/infra/storage/imageUpload.js
/**
 * Multer middleware for dish images.
 */
const multer = require("multer");
const path = require("path");
const { buildStoredFilename } = require("./uploadsStatic");

function createImageUpload(uploadDir) {
  const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, buildStoredFilename(file.originalname)),
  });

  const fileFilter = (req, file, cb) => {
    const ok = /^image\//.test(file.mimetype);
    cb(ok ? null : new Error("Only image uploads are allowed"), ok);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 8 * 1024 * 1024 },
  });
}

module.exports = { createImageUpload };
