import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utlis/ApiResponse.js";
import { asyncHandler } from "../utlis/asyncHandler.js";

// GET /api/v1/dashboard/stats
// Aggregate stats for the logged-in user's channel:
// total videos, total views, total subscribers and total video likes.
const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = new mongoose.Types.ObjectId(req.user._id);

  // Videos uploaded by the channel + sum of their views.
  const videoStats = await Video.aggregate([
    { $match: { owner: channelId } },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalViews: { $sum: "$views" },
      },
    },
  ]);

  // Number of people subscribed to this channel.
  const totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  // Total likes across all of this channel's videos.
  const likeStats = await Like.aggregate([
    {
      $match: { video: { $exists: true, $ne: null } },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
      },
    },
    { $unwind: "$video" },
    { $match: { "video.owner": channelId } },
    { $count: "totalLikes" },
  ]);

  const stats = {
    totalVideos: videoStats[0]?.totalVideos || 0,
    totalViews: videoStats[0]?.totalViews || 0,
    totalSubscribers,
    totalLikes: likeStats[0]?.totalLikes || 0,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "Channel stats fetched successfully"));
});

// GET /api/v1/dashboard/videos
// All videos uploaded by the logged-in user's channel.
const getChannelVideos = asyncHandler(async (req, res) => {
  const videos = await Video.find({ owner: req.user._id }).sort({
    createdAt: -1,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
