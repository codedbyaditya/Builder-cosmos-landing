import express from "express";
import { createSuccessResponse } from "../utils/response.js";

const router = express.Router();

// Get technology information
router.get("/", (req, res) => {
  const technologies = [
    {
      id: 1,
      name: "AI-Powered Soil Analysis",
      description:
        "Advanced machine learning algorithms analyze soil composition, pH levels, and nutrient content to provide precise recommendations.",
      features: [
        "Real-time soil health assessment",
        "Nutrient deficiency detection",
        "Crop-specific recommendations",
        "Seasonal optimization",
      ],
      benefits: [
        "Increased crop yield by 30-45%",
        "Reduced fertilizer waste",
        "Improved soil health",
        "Cost-effective farming",
      ],
      technology: ["Machine Learning", "Computer Vision", "IoT Sensors"],
      image: "/technology/soil-analysis.jpg",
    },
    {
      id: 2,
      name: "Smart Weather Monitoring",
      description:
        "IoT-enabled weather stations provide hyper-local weather data and predictions for optimal farming decisions.",
      features: [
        "Real-time weather monitoring",
        "7-day weather forecasts",
        "Pest and disease alerts",
        "Irrigation scheduling",
      ],
      benefits: [
        "Reduced crop losses",
        "Optimized water usage",
        "Early pest detection",
        "Better harvest timing",
      ],
      technology: ["IoT Sensors", "Weather APIs", "Data Analytics"],
      image: "/technology/weather-monitoring.jpg",
    },
    {
      id: 3,
      name: "Precision Agriculture Tools",
      description:
        "GPS-guided farming equipment and drones for precise field management and crop monitoring.",
      features: [
        "GPS-guided tractors",
        "Drone field mapping",
        "Variable rate application",
        "Crop health monitoring",
      ],
      benefits: [
        "Reduced input costs",
        "Uniform crop growth",
        "Efficient field operations",
        "Data-driven decisions",
      ],
      technology: ["GPS Technology", "Drones", "Precision Equipment"],
      image: "/technology/precision-agriculture.jpg",
    },
  ];

  res.json(
    createSuccessResponse("Technologies fetched successfully", {
      technologies,
      count: technologies.length,
    }),
  );
});

// Get specific technology
router.get("/:id", (req, res) => {
  const { id } = req.params;
  // This would normally fetch from database
  res.json(
    createSuccessResponse("Technology fetched successfully", {
      technology: {
        id: parseInt(id),
        name: "Technology Name",
        description: "Technology description...",
      },
    }),
  );
});

export default router;
