import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/response.js";

const router = express.Router();

// Google OAuth verification and user creation/login
router.post("/google", async (req, res) => {
  try {
    const { credential, userInfo } = req.body;

    if (!credential || !userInfo) {
      return res
        .status(400)
        .json(createErrorResponse("Missing credential or user information"));
    }

    // Verify the Google JWT token (optional additional verification)
    const decoded = jwt.decode(credential);
    if (!decoded || decoded.sub !== userInfo.id) {
      return res
        .status(400)
        .json(createErrorResponse("Invalid Google credential"));
    }

    // Check if user exists in database
    let user = await User.findOne({ email: userInfo.email });

    if (!user) {
      // Create new user
      user = new User({
        googleId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        avatar: userInfo.picture,
        provider: "google",
        role: "user",
        isActive: true,
        profile: {
          firstName: userInfo.given_name || "",
          lastName: userInfo.family_name || "",
        },
        preferences: {
          language: "en",
          notifications: {
            email: true,
            sms: false,
            push: true,
          },
        },
      });

      await user.save();
    } else {
      // Update existing user with Google info if they signed up with email
      if (!user.googleId) {
        user.googleId = userInfo.id;
        user.avatar = userInfo.picture;
        user.provider = "google";
        await user.save();
      }
    }

    // Generate JWT token for our application
    const appToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    // Set secure cookie
    res.cookie("token", appToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json(
      createSuccessResponse("Google authentication successful", {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          provider: user.provider,
        },
        token: appToken,
      }),
    );
  } catch (error) {
    console.error("Google auth error:", error);
    res
      .status(500)
      .json(createErrorResponse("Google authentication failed", error.message));
  }
});

// Logout endpoint
router.post("/logout", (req, res) => {
  try {
    // Clear the authentication cookie
    res.clearCookie("token");

    res.json(createSuccessResponse("Logout successful"));
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json(createErrorResponse("Logout failed", error.message));
  }
});

export default router;
