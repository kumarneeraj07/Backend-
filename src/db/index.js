import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectionInstance = mongoose.connection;

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
    console.log(`\n MongoDb connected !! DB HOST:${connectionInstance.host}`);
  } catch (error) {
    console.error("MONGODB connection error", error);
    process.exit(0);
  }
};

export default connectDB;
