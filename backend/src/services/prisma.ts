import { PrismaClient } from "@prisma/client";
import { logger } from "@/utils/logger";

export class PrismaService {
  private static instance: PrismaClient | null = null;

  public static getInstance(): PrismaClient {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaClient({
        log:
          process.env.NODE_ENV === "development"
            ? ["query", "info", "warn", "error"]
            : ["error"],
        errorFormat: "pretty",
      });

      // Handle connection events
      PrismaService.instance.$on("query" as never, (event: any) => {
        if (process.env.NODE_ENV === "development") {
          logger.debug(`Query: ${event.query}`);
          logger.debug(`Params: ${event.params}`);
          logger.debug(`Duration: ${event.duration}ms`);
        }
      });

      // Test connection
      PrismaService.instance
        .$connect()
        .then(() => {
          logger.info("✅ Database connected successfully");
        })
        .catch((error) => {
          logger.error("❌ Database connection failed:", error);
          process.exit(1);
        });
    }

    return PrismaService.instance;
  }

  public static async disconnect(): Promise<void> {
    if (PrismaService.instance) {
      await PrismaService.instance.$disconnect();
      PrismaService.instance = null;
      logger.info("🔒 Database disconnected");
    }
  }
}
