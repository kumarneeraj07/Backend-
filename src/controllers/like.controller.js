import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Apierror } from "../utlis/apiError.js";
import { ApiResponse } from "../utlis/ApiResponse.js";
import { asyncHandler } from "../utlis/asyncHandler.js";

// Shared helper: like the target if not liked yet, otherwise remove the like.
// "field" is one of "video", "comment" or "tweet".
const toggleLike = async (field, targetId, userId) => {
  const existingLike = await Like.findOne({
    [field]: targetId,
    likedBy: userId,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return { liked: false };
  }

  await Like.create({ [field]: targetId, likedBy: userId });
  return { liked: true };
};

// POST /api/v1/likes/toggle/v/:videoId
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new Apierror(400, "Invalid video id");
  }

  const result = await toggleLike("video", videoId, req.user._id);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        result.liked ? "Video liked" : "Video like removed"
      )
    );
});

// POST /api/v1/likes/toggle/c/:commentId
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new Apierror(400, "Invalid comment id");
  }

  const result = await toggleLike("comment", commentId, req.user._id);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        result.liked ? "Comment liked" : "Comment like removed"
      )
    );
});

// POST /api/v1/likes/toggle/t/:tweetId
const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new Apierror(400, "Invalid tweet id");
  }

  const result = await toggleLike("tweet", tweetId, req.user._id);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        result.liked ? "Tweet liked" : "Tweet like removed"
      )
    );
});

// GET /api/v1/likes/videos
// Return all videos the current user has liked.
const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        // Only like documents that point at a video.
        video: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                { $project: { fullname: 1, username: 1, avatar: 1 } },
              ],
            },
          },
          { $addFields: { owner: { $first: "$owner" } } },
        ],
      },
    },
    { $addFields: { video: { $first: "$video" } } },
    { $project: { video: 1 } },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
