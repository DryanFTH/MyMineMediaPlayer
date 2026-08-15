import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const isWindows = process.platform === "win32";
const isLinux = process.platform === "linux";

if (!isWindows && !isLinux) {
  console.log(
    `Platform "${process.platform}" tidak didukung untuk sidecar unrar (hanya Windows & Linux). Skip.`
  );
  process.exit(0);
}

const scriptPath = isWindows
  ? join(__dirname, "prepare-sidecar.ps1")
  : join(__dirname, "prepare-sidecar.sh");

const result = isWindows
  ? spawnSync("powershell", ["-ExecutionPolicy", "Bypass", "-File", scriptPath], {
      stdio: "inherit",
    })
  : spawnSync("bash", [scriptPath], { stdio: "inherit" });

if (result.error) {
  console.error("Gagal menjalankan script sidecar:", result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
