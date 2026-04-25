import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className, size = "md", showTagline = true }) => {
  const sizeClasses = {
    sm: "h-8",
    md: "h-9",
    lg: "h-12",
  };

  const taglineSizeClasses = {
    sm: "text-[5px]",
    md: "text-[7px]",
    lg: "text-xs",
  };

  return (
    <div className={cn("flex flex-col items-start", className)}>
      <img
        src="/ridesk-logo.png"
        alt="Ridesk"
        className={cn(sizeClasses[size], "w-auto")}
      />
      {showTagline && (
        <div className={cn("font-sans font-medium text-gray-700 uppercase tracking-wider leading-tight", taglineSizeClasses[size], "mt-0.5")}>
          SIMPLIFYING WATERSPORT SCHOOLS
        </div>
      )}
    </div>
  );
};

export default Logo;
