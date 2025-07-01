import express from "express";
import User from "../models/User.js";
import SoilAnalysis from "../models/SoilAnalysis.js";
import Chat from "../models/Chat.js";
import {
  createSuccessResponse,
  createAnalyticsResponse,
} from "../utils/response.js";
import { authorize } from "../middleware/auth.js";

const router = express.Router();

// All routes require admin access
router.use(authorize("admin", "expert"));

// Get dashboard overview
router.get("/dashboard", async (req, res) => {
  try {
    const { period = "30d" } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    if (period === "7d") {
      startDate.setDate(endDate.getDate() - 7);
    } else if (period === "30d") {
      startDate.setDate(endDate.getDate() - 30);
    } else if (period === "90d") {
      startDate.setDate(endDate.getDate() - 90);
    }

    // Get user statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalUsers = await User.countDocuments({ isActive: true });
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startDate },
    });

    // Get soil analysis statistics
    const soilStats = await SoilAnalysis.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalAnalyses = await SoilAnalysis.countDocuments();
    const newAnalyses = await SoilAnalysis.countDocuments({
      createdAt: { $gte: startDate },
    });

    // Get chat statistics
    const chatStats = await Chat.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgSatisfaction: { $avg: "$satisfaction.rating" },
        },
      },
    ]);

    const analytics = {
      overview: {
        totalUsers,
        newUsers,
        totalAnalyses,
        newAnalyses,
        activeChats: chatStats.find((s) => s._id === "active")?.count || 0,
        avgSatisfaction:
          chatStats.reduce((acc, s) => acc + (s.avgSatisfaction || 0), 0) /
            chatStats.length || 0,
      },
      userBreakdown: userStats,
      soilAnalysisBreakdown: soilStats,
      chatBreakdown: chatStats,
      growth: {
        userGrowth: (
          (newUsers / Math.max(totalUsers - newUsers, 1)) *
          100
        ).toFixed(1),
        analysisGrowth: (
          (newAnalyses / Math.max(totalAnalyses - newAnalyses, 1)) *
          100
        ).toFixed(1),
      },
    };

    res.json(
      createAnalyticsResponse(
        "Dashboard analytics fetched successfully",
        analytics,
        {
          from: startDate.toISOString(),
          to: endDate.toISOString(),
          duration: period,
        },
      ),
    );
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    res
      .status(500)
      .json(createErrorResponse("Failed to fetch analytics", error.message));
  }
});

// Get user analytics
router.get("/users", async (req, res) => {
  try {
    const { period = "30d" } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    if (period === "7d") {
      startDate.setDate(endDate.getDate() - 7);
    } else if (period === "30d") {
      startDate.setDate(endDate.getDate() - 30);
    } else {
      startDate.setDate(endDate.getDate() - 90);
    }

    // User registration trends
    const registrationTrends = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            role: "$role",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    // Geographic distribution
    const geoDistribution = await User.aggregate([
      {
        $match: { "address.state": { $exists: true, $ne: "" } },
      },
      {
        $group: {
          _id: "$address.state",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json(
      createAnalyticsResponse("User analytics fetched successfully", {
        registrationTrends,
        geoDistribution,
      }),
    );
  } catch (error) {
    res
      .status(500)
      .json(
        createErrorResponse("Failed to fetch user analytics", error.message),
      );
  }
});

// Get soil analysis analytics
router.get("/soil-analysis", async (req, res) => {
  try {
    // Soil health trends
    const healthTrends = await SoilAnalysis.aggregate([
      {
        $match: { healthScore: { $exists: true } },
      },
      {
        $group: {
          _id: {
            range: {
              $switch: {
                branches: [
                  { case: { $lte: ["$healthScore", 40] }, then: "Poor" },
                  { case: { $lte: ["$healthScore", 60] }, then: "Fair" },
                  { case: { $lte: ["$healthScore", 80] }, then: "Good" },
                  { case: { $gte: ["$healthScore", 80] }, then: "Excellent" },
                ],
                default: "Unknown",
              },
            },
          },
          count: { $sum: 1 },
          avgScore: { $avg: "$healthScore" },
        },
      },
    ]);

    // Crop recommendations
    const cropRecommendations = await SoilAnalysis.aggregate([
      {
        $unwind: "$recommendations.cropSuitability",
      },
      {
        $group: {
          _id: "$recommendations.cropSuitability.crop",
          count: { $sum: 1 },
          avgSuitability: {
            $avg: "$recommendations.cropSuitability.suitability",
          },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json(
      createAnalyticsResponse("Soil analysis analytics fetched successfully", {
        healthTrends,
        cropRecommendations,
      }),
    );
  } catch (error) {
    res
      .status(500)
      .json(
        createErrorResponse("Failed to fetch soil analytics", error.message),
      );
  }
});

export default router;
