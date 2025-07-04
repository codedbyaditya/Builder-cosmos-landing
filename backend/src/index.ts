import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import "express-async-errors";

// Import routes
import authRoutes from "@/routes/auth";
import userRoutes from "@/routes/users";
import soilRoutes from "@/routes/soil-analysis";
import cropRoutes from "@/routes/crop-recommendations";
import teamRoutes from "@/routes/team";
import contactRoutes from "@/routes/contact";
import chatRoutes from "@/routes/chat";
import adminRoutes from "@/routes/admin";

// Import middleware
import { errorHandler } from "@/middlewares/errorHandler";
import { notFoundHandler } from "@/middlewares/notFoundHandler";
import { authMiddleware } from "@/middlewares/auth";
import { auditMiddleware } from "@/middlewares/audit";

// Import services
import { PrismaService } from "@/services/prisma";
import { logger } from "@/utils/logger";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Prisma
const prisma = PrismaService.getInstance();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
});

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
});

app.use("/api/auth", authLimiter);
app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        process.env.CLIENT_URL || "http://localhost:3000",
        "http://localhost:3001",
        "https://bindisa-agritech.com",
        "https://www.bindisa-agritech.com",
      ];

      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-lang"],
  }),
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Audit logging middleware
app.use(auditMiddleware);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Bindisa Agritech Backend API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/soil-analysis", authMiddleware, soilRoutes);
app.use("/api/crop-recommendations", authMiddleware, cropRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/chat", authMiddleware, chatRoutes);
app.use("/api/admin", authMiddleware, adminRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info("Received shutdown signal, closing server gracefully...");

  prisma
    .$disconnect()
    .then(() => {
      logger.info("Database connections closed");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Error during database disconnection:", error);
      process.exit(1);
    });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Bindisa Agritech Backend API running on port ${PORT}`);
  logger.info(`📱 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🌐 Client URL: ${process.env.CLIENT_URL}`);
  logger.info(`🤖 OpenAI Model: ${process.env.OPENAI_MODEL}`);
});

export default app;
