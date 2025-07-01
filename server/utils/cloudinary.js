import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload file to Cloudinary
export const uploadToCloudinary = async (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: "auto",
      folder: "bindisa-agritech",
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      },
    );

    // Convert buffer to stream and upload
    const bufferStream = new Readable();
    bufferStream.push(fileBuffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
};

// Delete file from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw error;
  }
};

// Upload multiple files
export const uploadMultipleToCloudinary = async (files, options = {}) => {
  const uploadPromises = files.map((file) =>
    uploadToCloudinary(file.buffer, {
      ...options,
      public_id: `${options.public_id || "file"}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    }),
  );

  try {
    const results = await Promise.allSettled(uploadPromises);
    return results.map((result, index) => ({
      file: files[index],
      success: result.status === "fulfilled",
      result: result.status === "fulfilled" ? result.value : null,
      error: result.status === "rejected" ? result.reason : null,
    }));
  } catch (error) {
    throw new Error(`Multiple upload failed: ${error.message}`);
  }
};

// Generate optimized image URL
export const getOptimizedImageUrl = (publicId, options = {}) => {
  const defaultOptions = {
    quality: "auto",
    fetch_format: "auto",
    ...options,
  };

  return cloudinary.url(publicId, defaultOptions);
};

// Generate video thumbnail
export const generateVideoThumbnail = async (publicId, options = {}) => {
  const thumbnailOptions = {
    resource_type: "video",
    format: "jpg",
    start_offset: "auto",
    ...options,
  };

  return cloudinary.url(publicId, thumbnailOptions);
};

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadMultipleToCloudinary,
  getOptimizedImageUrl,
  generateVideoThumbnail,
};
