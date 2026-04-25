import { generateUploadButton, generateReactHelpers } from "@uploadthing/react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

const BASE_SERVER_URL = API_BASE_URL.replace(/\/api\/?$/, "");
const UPLOADTHING_URL = `${BASE_SERVER_URL}/api/uploadthing`;

type OurFileRouter = {
  schoolLogo: any;
  instructorProfilePic: any;
};

export const UploadButton = generateUploadButton<OurFileRouter>({
  url: UPLOADTHING_URL,
});

export const { useUploadThing } = generateReactHelpers<OurFileRouter>({
  url: UPLOADTHING_URL,
});

