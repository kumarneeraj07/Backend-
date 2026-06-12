import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    // mongoose.connect resolves with the connection instance, so we can
    // read the host from the value it returns instead of a stale reference.
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );
    console.log(
      `\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.error("MONGODB connection error", error);
    // Exit with a non-zero code so the process reports a real failure.
    process.exit(1);
  }
};

export default connectDB;
