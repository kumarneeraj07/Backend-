import { Router } from "express";
import {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All subscription routes require a logged-in user.
router.use(verifyJWT);

// Toggle subscription for a channel, and list a channel's subscribers.
router
  .route("/c/:channelId")
  .post(toggleSubscription)
  .get(getUserChannelSubscribers);

// List all channels a particular user is subscribed to.
router.route("/u/:subscriberId").get(getSubscribedChannels);

export default router;
