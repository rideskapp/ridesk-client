import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const commit = execSync("git rev-parse --short HEAD").toString().trim();
  const buildDate = new Date().toISOString();

  const versionData = { commit, buildDate };
  const filePath = path.join(__dirname, "public", "version.json");

  fs.writeFileSync(filePath, JSON.stringify(versionData, null, 2));

  console.log("✅ Version info generated:", versionData);
} catch (error) {
  console.error("❌ Failed to generate version info:", error);
  process.exit(1);
}
