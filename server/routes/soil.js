import express from "express";
import multer from "multer";
import {
  submitSoilSample,
  getUserSoilAnalyses,
  getSoilAnalysis,
  updateSoilAnalysis,
  getSoilRecommendations,
  uploadSoilImages,
  deleteSoilImage,
  getNearbyAnalyses,
  getSoilStatistics,
  exportSoilData,
} from "../controllers/soilController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validation.js";
import { soilAnalysisSchema } from "../schemas/soilSchemas.js";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Public routes
router.get("/nearby", getNearbyAnalyses);

// Protected routes (require authentication)
router.use(authenticate);

// Soil analysis CRUD operations
router.post("/analysis", validate(soilAnalysisSchema), submitSoilSample);
router.get("/analysis", getUserSoilAnalyses);
router.get("/analysis/:id", getSoilAnalysis);
router.get("/analysis/:id/recommendations", getSoilRecommendations);

// File upload routes
router.post(
  "/analysis/:id/images",
  upload.array("images", 5),
  uploadSoilImages,
);
router.delete("/analysis/:id/images/:imageId", deleteSoilImage);

// Statistics and export
router.get("/statistics", getSoilStatistics);
router.get("/export", exportSoilData);

// Admin routes (require admin or expert role)
router.put("/analysis/:id", authorize("admin", "expert"), updateSoilAnalysis);

export default router;
