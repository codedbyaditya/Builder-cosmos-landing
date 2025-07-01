import express from "express";
import multer from "multer";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import {
  createSuccessResponse,
  createErrorResponse,
  createFileResponse,
} from "../utils/response.js";
import { authenticate } from "../middleware/auth.js";
import { validateFile } from "../middleware/validation.js";

const router = express.Router();

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
});

// All routes require authentication
router.use(authenticate);

// Upload single image
router.post(
  "/image",
  upload.single("image"),
  validateFile({
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    required: true,
  }),
  async (req, res) => {
    try {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: "bindisa-uploads",
        resource_type: "image",
      });

      res.json(
        createFileResponse("Image uploaded successfully", {
          filename: result.public_id,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          url: result.secure_url,
        }),
      );
    } catch (error) {
      res
        .status(500)
        .json(createErrorResponse("Failed to upload image", error.message));
    }
  },
);

// Upload multiple images
router.post(
  "/images",
  upload.array("images", 5),
  validateFile({
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    required: true,
  }),
  async (req, res) => {
    try {
      const uploadPromises = req.files.map((file) =>
        uploadToCloudinary(file.buffer, {
          folder: "bindisa-uploads",
          resource_type: "image",
        }),
      );

      const results = await Promise.all(uploadPromises);

      const files = results.map((result, index) => ({
        filename: result.public_id,
        originalName: req.files[index].originalname,
        size: req.files[index].size,
        mimeType: req.files[index].mimetype,
        url: result.secure_url,
      }));

      res.json(
        createSuccessResponse("Images uploaded successfully", { files }),
      );
    } catch (error) {
      res
        .status(500)
        .json(createErrorResponse("Failed to upload images", error.message));
    }
  },
);

// Upload document
router.post(
  "/document",
  upload.single("document"),
  validateFile({
    allowedTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    required: true,
  }),
  async (req, res) => {
    try {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: "bindisa-documents",
        resource_type: "raw",
      });

      res.json(
        createFileResponse("Document uploaded successfully", {
          filename: result.public_id,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          url: result.secure_url,
        }),
      );
    } catch (error) {
      res
        .status(500)
        .json(createErrorResponse("Failed to upload document", error.message));
    }
  },
);

// Delete file
router.delete("/:publicId", async (req, res) => {
  try {
    const { publicId } = req.params;
    await deleteFromCloudinary(publicId);
    res.json(createSuccessResponse("File deleted successfully"));
  } catch (error) {
    res
      .status(500)
      .json(createErrorResponse("Failed to delete file", error.message));
  }
});

export default router;
