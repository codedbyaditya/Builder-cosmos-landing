import SoilAnalysis from "../models/SoilAnalysis.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/email.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
} from "../utils/response.js";
import { validateSoilData } from "../utils/validation.js";

// Submit soil sample for analysis
export const submitSoilSample = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      location,
      sampleDetails,
      physicalProperties,
      chemicalProperties,
      biologicalProperties,
    } = req.body;

    // Validate soil data
    const soilValidation = validateSoilData(req.body);
    if (soilValidation !== true) {
      return res
        .status(400)
        .json(createErrorResponse("Validation failed", soilValidation));
    }

    // Create soil analysis record
    const soilAnalysis = await SoilAnalysis.create({
      user: userId,
      location,
      sampleDetails,
      physicalProperties,
      chemicalProperties,
      biologicalProperties,
      status: "pending",
      priority: "medium",
    });

    // Send confirmation email
    const user = await User.findById(userId);
    if (user) {
      try {
        await sendEmail({
          to: user.email,
          subject: "Soil Analysis Request Received - Bindisa Agritech",
          template: "soil-analysis-confirmation",
          data: {
            name: user.name,
            sampleId: soilAnalysis.sampleId,
            language: user.preferences?.language || "en",
          },
        });
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
      }
    }

    res.status(201).json(
      createSuccessResponse("Soil sample submitted successfully", {
        soilAnalysis,
        message: "You will receive analysis results within 24-48 hours",
      }),
    );
  } catch (error) {
    console.error("Submit soil sample error:", error);
    res
      .status(500)
      .json(createErrorResponse("Failed to submit soil sample", error.message));
  }
};

// Get user's soil analyses
export const getUserSoilAnalyses = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = { user: userId };
    if (status) {
      query.status = status;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
      populate: {
        path: "user",
        select: "name email",
      },
    };

    const analyses = await SoilAnalysis.paginate(query, options);

    res.json(
      createPaginatedResponse(
        "Soil analyses fetched successfully",
        analyses.docs,
        {
          page: analyses.page,
          limit: analyses.limit,
          total: analyses.totalDocs,
        },
        { status },
      ),
    );
  } catch (error) {
    console.error("Get soil analyses error:", error);
    res
      .status(500)
      .json(
        createErrorResponse("Failed to fetch soil analyses", error.message),
      );
  }
};

// Get specific soil analysis
export const getSoilAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const analysis = await SoilAnalysis.findOne({
      _id: id,
      user: userId,
    }).populate("user", "name email farmDetails");

    if (!analysis) {
      return res
        .status(404)
        .json(createErrorResponse("Soil analysis not found"));
    }

    res.json(
      createSuccessResponse("Soil analysis fetched successfully", {
        analysis,
      }),
    );
  } catch (error) {
    console.error("Get soil analysis error:", error);
    res
      .status(500)
      .json(
        createErrorResponse("Failed to fetch soil analysis", error.message),
      );
  }
};

// Update soil analysis (for lab technicians/admins)
export const updateSoilAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Only allow certain fields to be updated
    const allowedUpdates = [
      "physicalProperties",
      "chemicalProperties",
      "biologicalProperties",
      "recommendations",
      "status",
      "priority",
      "notes",
      "analysis",
    ];

    const actualUpdates = {};
    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        actualUpdates[key] = updates[key];
      }
    });

    const analysis = await SoilAnalysis.findByIdAndUpdate(id, actualUpdates, {
      new: true,
      runValidators: true,
    }).populate("user", "name email preferences");

    if (!analysis) {
      return res
        .status(404)
        .json(createErrorResponse("Soil analysis not found"));
    }

    // Send notification email if status changed to completed
    if (actualUpdates.status === "completed" && analysis.user) {
      try {
        await sendEmail({
          to: analysis.user.email,
          subject: "Soil Analysis Results Ready - Bindisa Agritech",
          template: "soil-analysis-completed",
          data: {
            name: analysis.user.name,
            sampleId: analysis.sampleId,
            healthScore: analysis.healthScore,
            language: analysis.user.preferences?.language || "en",
            reportUrl: `${process.env.CLIENT_URL}/soil-analysis/${analysis._id}`,
          },
        });
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
      }
    }

    res.json(
      createSuccessResponse("Soil analysis updated successfully", {
        analysis,
      }),
    );
  } catch (error) {
    console.error("Update soil analysis error:", error);
    res
      .status(500)
      .json(
        createErrorResponse("Failed to update soil analysis", error.message),
      );
  }
};

// Get soil analysis recommendations
export const getSoilRecommendations = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const analysis = await SoilAnalysis.findOne({
      _id: id,
      user: userId,
    });

    if (!analysis) {
      return res
        .status(404)
        .json(createErrorResponse("Soil analysis not found"));
    }

    if (!analysis.recommendations || analysis.recommendations.length === 0) {
      return res
        .status(404)
        .json(createErrorResponse("Recommendations not yet available"));
    }

    res.json(
      createSuccessResponse("Recommendations fetched successfully", {
        recommendations: analysis.recommendations,
        healthScore: analysis.healthScore,
        sampleId: analysis.sampleId,
      }),
    );
  } catch (error) {
    console.error("Get recommendations error:", error);
    res
      .status(500)
      .json(
        createErrorResponse("Failed to fetch recommendations", error.message),
      );
  }
};

// Upload soil sample images
export const uploadSoilImages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const analysis = await SoilAnalysis.findOne({
      _id: id,
      user: userId,
    });

    if (!analysis) {
      return res
        .status(404)
        .json(createErrorResponse("Soil analysis not found"));
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json(createErrorResponse("No images provided"));
    }

    const uploadedImages = [];

    for (const file of req.files) {
      try {
        const result = await uploadToCloudinary(file.buffer, {
          folder: "soil-samples",
          public_id: `${analysis.sampleId}_${Date.now()}`,
        });

        uploadedImages.push({
          type: req.body.type || "sample_photo",
          url: result.secure_url,
          public_id: result.public_id,
          caption: req.body.caption || "",
        });
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
      }
    }

    // Add images to analysis
    analysis.images.push(...uploadedImages);
    await analysis.save();

    res.json(
      createSuccessResponse("Images uploaded successfully", {
        images: uploadedImages,
        totalImages: analysis.images.length,
      }),
    );
  } catch (error) {
    console.error("Upload soil images error:", error);
    res
      .status(500)
      .json(createErrorResponse("Failed to upload images", error.message));
  }
};

// Delete soil sample image
export const deleteSoilImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;
    const userId = req.user.id;

    const analysis = await SoilAnalysis.findOne({
      _id: id,
      user: userId,
    });

    if (!analysis) {
      return res
        .status(404)
        .json(createErrorResponse("Soil analysis not found"));
    }

    const imageIndex = analysis.images.findIndex(
      (img) => img._id.toString() === imageId,
    );

    if (imageIndex === -1) {
      return res.status(404).json(createErrorResponse("Image not found"));
    }

    const image = analysis.images[imageIndex];

    // Delete from Cloudinary
    if (image.public_id) {
      try {
        await deleteFromCloudinary(image.public_id);
      } catch (deleteError) {
        console.error("Cloudinary delete error:", deleteError);
      }
    }

    // Remove from database
    analysis.images.splice(imageIndex, 1);
    await analysis.save();

    res.json(createSuccessResponse("Image deleted successfully"));
  } catch (error) {
    console.error("Delete soil image error:", error);
    res
      .status(500)
      .json(createErrorResponse("Failed to delete image", error.message));
  }
};

// Get nearby soil analyses (for comparison)
export const getNearbyAnalyses = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 10000 } = req.query;

    if (!longitude || !latitude) {
      return res
        .status(400)
        .json(createErrorResponse("Longitude and latitude are required"));
    }

    const analyses = await SoilAnalysis.findNearby(
      parseFloat(longitude),
      parseFloat(latitude),
      parseInt(maxDistance),
    )
      .select(
        "sampleId location physicalProperties.texture chemicalProperties.pH healthScore createdAt",
      )
      .limit(20);

    res.json(
      createSuccessResponse("Nearby analyses fetched successfully", {
        analyses,
        searchRadius: maxDistance,
        count: analyses.length,
      }),
    );
  } catch (error) {
    console.error("Get nearby analyses error:", error);
    res
      .status(500)
      .json(
        createErrorResponse("Failed to fetch nearby analyses", error.message),
      );
  }
};

// Get soil analysis statistics
export const getSoilStatistics = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await SoilAnalysis.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalAnalyses: { $sum: 1 },
          avgHealthScore: { $avg: "$healthScore" },
          completedAnalyses: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          pendingAnalyses: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          avgPH: { $avg: "$chemicalProperties.pH.value" },
          soilTypes: { $addToSet: "$physicalProperties.texture.textureClass" },
        },
      },
    ]);

    const recentAnalyses = await SoilAnalysis.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("sampleId status healthScore createdAt");

    res.json(
      createSuccessResponse("Statistics fetched successfully", {
        statistics: stats[0] || {
          totalAnalyses: 0,
          avgHealthScore: 0,
          completedAnalyses: 0,
          pendingAnalyses: 0,
          avgPH: 0,
          soilTypes: [],
        },
        recentAnalyses,
      }),
    );
  } catch (error) {
    console.error("Get soil statistics error:", error);
    res
      .status(500)
      .json(createErrorResponse("Failed to fetch statistics", error.message));
  }
};

// Export soil analysis data
export const exportSoilData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { format = "json", startDate, endDate } = req.query;

    const query = { user: userId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const analyses = await SoilAnalysis.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    if (format === "csv") {
      // Convert to CSV format
      const csvData = analyses.map((analysis) => ({
        SampleID: analysis.sampleId,
        Date: analysis.createdAt.toISOString().split("T")[0],
        Status: analysis.status,
        pH: analysis.chemicalProperties?.pH?.value || "",
        HealthScore: analysis.healthScore || "",
        TextureClass: analysis.physicalProperties?.texture?.textureClass || "",
        Nitrogen:
          analysis.chemicalProperties?.nutrients?.nitrogen?.available || "",
        Phosphorus:
          analysis.chemicalProperties?.nutrients?.phosphorus?.available || "",
        Potassium:
          analysis.chemicalProperties?.nutrients?.potassium?.available || "",
      }));

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=soil-analyses.csv",
      );

      // Convert to CSV string
      const csvHeader = Object.keys(csvData[0] || {}).join(",") + "\n";
      const csvRows = csvData
        .map((row) => Object.values(row).join(","))
        .join("\n");

      res.send(csvHeader + csvRows);
    } else {
      // Return JSON format
      res.json(
        createSuccessResponse("Data exported successfully", {
          analyses,
          count: analyses.length,
          exportDate: new Date().toISOString(),
        }),
      );
    }
  } catch (error) {
    console.error("Export soil data error:", error);
    res
      .status(500)
      .json(createErrorResponse("Failed to export data", error.message));
  }
};
