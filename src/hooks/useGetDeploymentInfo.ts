import { useEffect, useState } from "react";

interface VersionInfo {
  commit: string;
  buildDate: string;
}

export const useGetDeploymentInfo = () => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    fetch("/version.json")
      .then((res) => res.json())
      .then((data: VersionInfo) => setVersionInfo(data))
      .catch((err) => console.error("Failed to load version info:", err));
  }, []);

  return versionInfo;
};
