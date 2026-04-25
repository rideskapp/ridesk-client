import React from "react";
import { useTranslation } from "react-i18next";
import { useUploadThing } from "@/utils/uploadthing";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";

interface CustomUploadButtonProps {
  endpoint: "schoolLogo" | "instructorProfilePic";
  headers?: () => HeadersInit;
  onClientUploadComplete: (res: Array<{ url: string; name: string; size: number; key: string; ufsUrl?: string }>) => void;
  onUploadError?: (error: Error) => void;
  buttonText: string;
  disabled?: boolean;
}

export const CustomUploadButton: React.FC<CustomUploadButtonProps> = ({
  endpoint,
  headers,
  onClientUploadComplete,
  onUploadError,
  buttonText,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const { token } = useAuthStore();
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  // Automatically include auth token if headers are not provided
  const getHeaders = React.useCallback(() => {
    if (headers) {
      return headers();
    }
    // Default: include auth token if available
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
      };
    }
    return {};
  }, [headers, token]);

  const { startUpload, isUploading } = useUploadThing(endpoint, {
    onClientUploadComplete,
    onUploadError,
    headers: getHeaders,
  });

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      startUpload(Array.from(files));
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
      <Button
        type="button"
        onClick={handleClick}
        disabled={disabled || isUploading}
        className="bg-gray-200 text-black hover:bg-gray-300 border-none rounded-md px-4 py-2 text-sm font-medium cursor-pointer"
      >
        {isUploading ? t("schoolProfile.uploading") : buttonText}
      </Button>
    </>
  );
};

