import express from "express";
import { createSuccessResponse } from "../utils/response.js";

const router = express.Router();

// Get success stories
router.get("/", (req, res) => {
  const successStories = [
    {
      id: 1,
      title: "Ramesh's Rice Revolution",
      farmer: {
        name: "Ramesh Kumar",
        location: "Patna, Bihar",
        farmSize: "5 acres",
        crops: ["Rice", "Wheat"],
      },
      challenge:
        "Low yield and high fertilizer costs were making farming unprofitable for Ramesh.",
      solution:
        "Bindisa's soil analysis revealed nitrogen deficiency and pH imbalance. We provided a customized fertilizer plan and organic amendments.",
      results: {
        yieldIncrease: "40%",
        costReduction: "25%",
        profitImprovement: "65%",
        timeframe: "2 seasons",
      },
      testimonial:
        "Bindisa's scientific approach transformed my farming. Now I get better yield with less cost.",
      image: "/success-stories/ramesh-kumar.jpg",
      date: "2024-01-15",
      verified: true,
    },
    {
      id: 2,
      title: "Sunita's Organic Success",
      farmer: {
        name: "Sunita Devi",
        location: "Gaya, Bihar",
        farmSize: "3 acres",
        crops: ["Vegetables", "Pulses"],
      },
      challenge:
        "Transition to organic farming was challenging with pest issues and low initial yields.",
      solution:
        "Comprehensive soil health improvement plan with organic practices and integrated pest management.",
      results: {
        yieldIncrease: "35%",
        costReduction: "30%",
        profitImprovement: "50%",
        timeframe: "3 seasons",
      },
      testimonial:
        "The organic transition was smooth with Bindisa's guidance. My vegetables are now premium quality.",
      image: "/success-stories/sunita-devi.jpg",
      date: "2024-02-20",
      verified: true,
    },
    {
      id: 3,
      title: "Kumar Brothers' Tech Farming",
      farmer: {
        name: "Amit & Rohit Kumar",
        location: "Nawada, Bihar",
        farmSize: "12 acres",
        crops: ["Maize", "Sugarcane"],
      },
      challenge:
        "Managing large farm efficiently and optimizing input costs across different crops.",
      solution:
        "IoT-based monitoring system with precision agriculture tools and data-driven recommendations.",
      results: {
        yieldIncrease: "45%",
        costReduction: "35%",
        profitImprovement: "70%",
        timeframe: "4 seasons",
      },
      testimonial:
        "Technology integration made our farming scientific and profitable. We're now helping other farmers too.",
      image: "/success-stories/kumar-brothers.jpg",
      date: "2024-03-10",
      verified: true,
    },
  ];

  res.json(
    createSuccessResponse("Success stories fetched successfully", {
      stories: successStories,
      count: successStories.length,
    }),
  );
});

// Get specific success story
router.get("/:id", (req, res) => {
  const { id } = req.params;
  // This would normally fetch from database
  res.json(
    createSuccessResponse("Success story fetched successfully", {
      story: {
        id: parseInt(id),
        title: "Success Story Title",
        description: "Story description...",
      },
    }),
  );
});

export default router;
