import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudnairy = async (localFilePath) => {
  try {
    if (!localFilePath || !fs.existsSync(localFilePath)) return null;
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file has been uploaded successfull
    //console.log("file is uploaded on cloudniary", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
    return null;
  }
};

// Delete an asset from Cloudinary using its full URL.
// Cloudinary needs the "public_id" (the file name without extension), so we
// derive it from the last segment of the URL.
const deleteFromCloudnairy = async (fileUrl, resourceType = "image") => {
  try {
    if (!fileUrl) return null;

    const publicId = fileUrl.split("/").pop().split(".")[0];
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return response;
  } catch (error) {
    return null;
  }
};

export { uploadOnCloudnairy, deleteFromCloudnairy };
