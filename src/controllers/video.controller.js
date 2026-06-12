import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Apierror } from "../utlis/apiError.js";
import { ApiResponse } from "../utlis/ApiResponse.js";
import { asyncHandler } from "../utlis/asyncHandler.js";
import {
  uploadOnCloudnairy,
  deleteFromCloudnairy,
} from "../utlis/coludinary.js";

// GET /api/v1/videos
// List videos with pagination, optional text search, owner filter and sorting.
const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const matchStage = {
    // Only show videos that are published to the public.
    published: true,
  };

  // Optional full-text style search on title and description.
  if (query) {
    matchStage.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  // Optional filter by a specific channel/owner.
  if (userId && isValidObjectId(userId)) {
    matchStage.owner = new mongoose.Types.ObjectId(userId);
  }

  const aggregate = Video.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [{ $project: { fullname: 1, username: 1, avatar: 1 } }],
      },
    },
    { $addFields: { owner: { $first: "$owner" } } },
    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const videos = await Video.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

// POST /api/v1/videos
// Upload a new video file + thumbnail and create the record.
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title?.trim() || !description?.trim()) {
    throw new Apierror(400, "Title and description are required");
  }

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath) {
    throw new Apierror(400, "Video file is required");
  }
  if (!thumbnailLocalPath) {
    throw new Apierror(400, "Thumbnail is required");
  }

  const videoFile = await uploadOnCloudnairy(videoFileLocalPath);
  const thumbnail = await uploadOnCloudnairy(thumbnailLocalPath);

  if (!videoFile) {
    throw new Apierror(500, "Failed to upload video file");
  }
  if (!thumbnail) {
    throw new Apierror(500, "Failed to upload thumbnail");
  }

  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    // Cloudinary returns duration (in seconds) for video uploads.
    duration: videoFile.duration || 0,
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"));
});

// GET /api/v1/videos/:videoId
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new Apierror(400, "Invalid video id");
  }

  const video = await Video.findById(videoId).populate(
    "owner",
    "fullname username avatar"
  );

  if (!video) {
    throw new Apierror(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

// PATCH /api/v1/videos/:videoId
// Update title, description and optionally the thumbnail. Owner only.
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new Apierror(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new Apierror(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new Apierror(403, "You are not allowed to edit this video");
  }

  if (title?.trim()) video.title = title;
  if (description?.trim()) video.description = description;

  // Replace the thumbnail if a new one was uploaded.
  const thumbnailLocalPath = req.file?.path;
  if (thumbnailLocalPath) {
    const thumbnail = await uploadOnCloudnairy(thumbnailLocalPath);
    if (!thumbnail) {
      throw new Apierror(500, "Failed to upload thumbnail");
    }
    // Clean up the old thumbnail to avoid orphaned files.
    await deleteFromCloudnairy(video.thumbnail, "image");
    video.thumbnail = thumbnail.url;
  }

  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"));
});

// DELETE /api/v1/videos/:videoId  (owner only)
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new Apierror(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new Apierror(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new Apierror(403, "You are not allowed to delete this video");
  }

  // Remove the underlying files from Cloudinary, then the DB record.
  await deleteFromCloudnairy(video.videoFile, "video");
  await deleteFromCloudnairy(video.thumbnail, "image");
  await Video.findByIdAndDelete(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

// PATCH /api/v1/videos/toggle/publish/:videoId  (owner only)
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new Apierror(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new Apierror(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new Apierror(403, "You are not allowed to modify this video");
  }

  video.published = !video.published;
  await video.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { published: video.published },
        "Publish status toggled successfully"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
