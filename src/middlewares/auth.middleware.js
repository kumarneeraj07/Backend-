import { User } from "../models/user.model.js";
import { Apierror } from "../utlis/apiError.js";
import { asyncHandler } from "../utlis/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new Apierror(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new Apierror(401, "Invalid Access Token");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new Apierror(401, error?.message || "Invalid access token ");
  }
});
