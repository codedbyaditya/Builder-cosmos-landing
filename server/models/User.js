import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      minlength: 6,
      // Not required for Google OAuth users
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
    },

    // OAuth Information
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    provider: {
      type: String,
      enum: ["email", "google"],
      default: "email",
    },

    // Profile Information
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "agent", "admin"],
      default: "user",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // Detailed Profile
    profile: {
      firstName: String,
      lastName: String,
      dateOfBirth: Date,
      gender: {
        type: String,
        enum: ["male", "female", "other"],
      },
      location: {
        address: String,
        city: String,
        state: String,
        country: {
          type: String,
          default: "India",
        },
        pincode: String,
        coordinates: {
          type: [Number], // [longitude, latitude]
          index: "2dsphere",
        },
      },
      occupation: {
        type: String,
        enum: [
          "farmer",
          "agricultural_expert",
          "researcher",
          "student",
          "other",
        ],
        default: "farmer",
      },
      farmSize: {
        type: Number, // in acres
        min: 0,
      },
    },

    // Preferences
    preferences: {
      language: {
        type: String,
        enum: ["en", "hi", "mr"],
        default: "en",
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        sms: {
          type: Boolean,
          default: false,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
      theme: {
        type: String,
        enum: ["light", "dark", "auto"],
        default: "light",
      },
    },

    // Subscription & Usage
    subscription: {
      plan: {
        type: String,
        enum: ["free", "basic", "premium", "enterprise"],
        default: "free",
      },
      status: {
        type: String,
        enum: ["active", "inactive", "cancelled", "expired"],
        default: "active",
      },
      startDate: Date,
      endDate: Date,
      autoRenew: {
        type: Boolean,
        default: false,
      },
    },

    usage: {
      chatMessages: {
        type: Number,
        default: 0,
      },
      soilAnalysis: {
        type: Number,
        default: 0,
      },
      fileUploads: {
        type: Number,
        default: 0,
      },
      lastReset: {
        type: Date,
        default: Date.now,
      },
    },

    // Security
    lastLogin: Date,
    loginCount: {
      type: Number,
      default: 0,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    // Metadata
    registrationSource: {
      type: String,
      enum: ["web", "mobile", "api"],
      default: "web",
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: [
      {
        content: String,
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        isPrivate: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  {
    timestamps: true,
    collection: "users",
  },
);

// Indexes for performance
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ "profile.location.coordinates": "2dsphere" });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ resetPasswordToken: 1 }, { sparse: true });
userSchema.index({ emailVerificationToken: 1 }, { sparse: true });

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  if (this.profile?.firstName && this.profile?.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.name;
});

// Pre-save middleware
userSchema.pre("save", async function (next) {
  // Hash password only if it's modified and exists
  if (this.isModified("password") && this.password) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }

  // Set email verification for Google users
  if (this.provider === "google" && !this.isEmailVerified) {
    this.isEmailVerified = true;
  }

  next();
});

// Instance methods
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) {
    return false; // Google OAuth users don't have passwords
  }
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

userSchema.methods.generatePasswordResetToken = function () {
  const crypto = require("crypto");
  const token = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = token;
  this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  return token;
};

userSchema.methods.generateEmailVerificationToken = function () {
  const crypto = require("crypto");
  const token = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = token;
  this.emailVerificationExpires = Date.now() + 86400000; // 24 hours
  return token;
};

userSchema.methods.incrementUsage = function (type) {
  if (this.usage[type] !== undefined) {
    this.usage[type] += 1;
  }
  return this.save();
};

userSchema.methods.resetMonthlyUsage = function () {
  this.usage.chatMessages = 0;
  this.usage.soilAnalysis = 0;
  this.usage.fileUploads = 0;
  this.usage.lastReset = new Date();
  return this.save();
};

// Static methods
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

userSchema.statics.findByGoogleId = function (googleId) {
  return this.findOne({ googleId, isActive: true });
};

userSchema.statics.getActiveUsers = function () {
  return this.find({ isActive: true }).sort({ createdAt: -1 });
};

userSchema.statics.getUsersByRole = function (role) {
  return this.find({ role, isActive: true }).sort({ createdAt: -1 });
};

// Don't return password and sensitive fields by default
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;
  return user;
};

const User = mongoose.model("User", userSchema);

export default User;
