//require("dotenv").config({ path: "./env" });
// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
dotenv.config({
  path: "./env",
});

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.error(error);
      throw error;
    });
    app.listen(process.env.PORT || 8000, () => {
      console.log(`server is running at port: ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!!", err);
  });

/*
//first approach
import express from "express";
const app = express();

(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URL} / ${DB_NAME}`);

    app.on("error", (error) => {
      console.log("ERRROR:", error);
      throw error;
    });

    app.listen(process.env.PORT, () => {
      console.log(`App is listening on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
})();
*/
