import express from "express";
import { createSuccessResponse } from "../utils/response.js";

const router = express.Router();

// Get team members
router.get("/", (req, res) => {
  const teamMembers = [
    {
      id: 1,
      name: "Santosh Kumar",
      role: "Founder & CEO",
      bio: "Visionary leader with 10+ years in agricultural technology and sustainable farming practices.",
      image: "/team/santosh-kumar.jpg",
      expertise: [
        "Agricultural Innovation",
        "Business Strategy",
        "Sustainable Farming",
      ],
      education: "B.Tech in Agriculture Engineering",
      experience: "10+ years",
      social: {
        linkedin: "https://linkedin.com/in/santosh-kumar-bindisa",
        email: "santosh@bindisaagritech.com",
      },
    },
    {
      id: 2,
      name: "Dr. Bindi Sharma",
      role: "Chief Technology Officer",
      bio: "Expert in soil science and agricultural technology with Ph.D. in Soil Chemistry.",
      image: "/team/bindi-sharma.jpg",
      expertise: [
        "Soil Science",
        "Agricultural Technology",
        "Research & Development",
      ],
      education: "Ph.D. in Soil Chemistry",
      experience: "8+ years",
      social: {
        linkedin: "https://linkedin.com/in/bindi-sharma-bindisa",
        email: "bindi@bindisaagritech.com",
      },
    },
    {
      id: 3,
      name: "Dipa Patel",
      role: "Head of Operations",
      bio: "Operations expert ensuring smooth delivery of services to farmers across regions.",
      image: "/team/dipa-patel.jpg",
      expertise: [
        "Operations Management",
        "Farmer Relations",
        "Quality Assurance",
      ],
      education: "MBA in Operations Management",
      experience: "6+ years",
      social: {
        linkedin: "https://linkedin.com/in/dipa-patel-bindisa",
        email: "dipa@bindisaagritech.com",
      },
    },
    {
      id: 4,
      name: "Raj Kumar Singh",
      role: "Agricultural Scientist",
      bio: "Field expert specializing in crop optimization and farming best practices.",
      image: "/team/raj-singh.jpg",
      expertise: ["Crop Science", "Field Research", "Farmer Training"],
      education: "M.Sc. in Agriculture",
      experience: "7+ years",
      social: {
        linkedin: "https://linkedin.com/in/raj-singh-bindisa",
        email: "raj@bindisaagritech.com",
      },
    },
  ];

  res.json(
    createSuccessResponse("Team members fetched successfully", {
      members: teamMembers,
      count: teamMembers.length,
    }),
  );
});

// Get single team member
router.get("/:id", (req, res) => {
  const { id } = req.params;
  // This would normally fetch from database
  res.json(
    createSuccessResponse("Team member fetched successfully", {
      member: {
        id: parseInt(id),
        name: "Team Member",
        role: "Position",
        bio: "Bio information...",
      },
    }),
  );
});

export default router;
