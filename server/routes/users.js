import express from "express";
import User from "../models/User.js";
import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
} from "../utils/response.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validation.js";
import { updateProfileSchema } from "../schemas/authSchemas.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user profile
router.get("/profile", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(createSuccessResponse("Profile fetched successfully", { user }));
  } catch (error) {
    res
      .status(500)
      .json(createErrorResponse("Failed to fetch profile", error.message));
  }
});

// Update user profile
router.put("/profile", validate(updateProfileSchema), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json(createSuccessResponse("Profile updated successfully", { user }));
  } catch (error) {
    res
      .status(500)
      .json(createErrorResponse("Failed to update profile", error.message));
  }
});

// Get farmers list (public endpoint for showcasing)
router.get("/farmers", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const farmers = await User.find({ role: "farmer", isActive: true })
      .select("name farmDetails.farmName farmDetails.cropTypes address")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments({ role: "farmer", isActive: true });

    res.json(
      createPaginatedResponse("Farmers fetched successfully", farmers, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      }),
    );
  } catch (error) {
    res
      .status(500)
      .json(createErrorResponse("Failed to fetch farmers", error.message));
  }
});

// Admin routes
router.get("/", authorize("admin"), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;

    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password -refreshTokens")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json(
      createPaginatedResponse("Users fetched successfully", users, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      }),
    );
  } catch (error) {
    res
      .status(500)
      .json(createErrorResponse("Failed to fetch users", error.message));
  }
});

export default router;
