import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Apierror } from "../utlis/apiError.js";
import { ApiResponse } from "../utlis/ApiResponse.js";
import { asyncHandler } from "../utlis/asyncHandler.js";

// POST /api/v1/playlists
const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name?.trim() || !description?.trim()) {
    throw new Apierror(400, "Name and description are required");
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

// GET /api/v1/playlists/user/:userId
const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new Apierror(400, "Invalid user id");
  }

  const playlists = await Playlist.find({ owner: userId }).sort({
    createdAt: -1,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, playlists, "User playlists fetched successfully"));
});

// GET /api/v1/playlists/:playlistId
const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new Apierror(400, "Invalid playlist id");
  }

  const playlist = await Playlist.findById(playlistId).populate({
    path: "videos",
    populate: { path: "owner", select: "fullname username avatar" },
  });

  if (!playlist) {
    throw new Apierror(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

// Small helper so add/remove can reuse owner + existence checks.
const findOwnedPlaylist = async (playlistId, userId) => {
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new Apierror(404, "Playlist not found");
  }
  if (playlist.owner.toString() !== userId.toString()) {
    throw new Apierror(403, "You are not allowed to modify this playlist");
  }
  return playlist;
};

// PATCH /api/v1/playlists/add/:videoId/:playlistId
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;

  if (!isValidObjectId(videoId) || !isValidObjectId(playlistId)) {
    throw new Apierror(400, "Invalid video or playlist id");
  }

  await findOwnedPlaylist(playlistId, req.user._id);

  // $addToSet avoids inserting the same video twice.
  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $addToSet: { videos: videoId } },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video added to playlist"));
});

// PATCH /api/v1/playlists/remove/:videoId/:playlistId
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;

  if (!isValidObjectId(videoId) || !isValidObjectId(playlistId)) {
    throw new Apierror(400, "Invalid video or playlist id");
  }

  await findOwnedPlaylist(playlistId, req.user._id);

  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $pull: { videos: videoId } },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video removed from playlist"));
});

// PATCH /api/v1/playlists/:playlistId  (owner only)
const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!isValidObjectId(playlistId)) {
    throw new Apierror(400, "Invalid playlist id");
  }

  const playlist = await findOwnedPlaylist(playlistId, req.user._id);

  if (name?.trim()) playlist.name = name;
  if (description?.trim()) playlist.description = description;
  await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

// DELETE /api/v1/playlists/:playlistId  (owner only)
const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new Apierror(400, "Invalid playlist id");
  }

  await findOwnedPlaylist(playlistId, req.user._id);
  await Playlist.findByIdAndDelete(playlistId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  updatePlaylist,
  deletePlaylist,
};
