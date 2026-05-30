import { cp, readdir, stat } from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = ".output";
const PUBLIC_DIR = "public";
const ASSET_DIRS = ["_locales", "icons"];

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function syncPublicAssets() {
  const cwd = process.cwd();
  const outputRoot = path.resolve(cwd, OUTPUT_DIR);
  const publicRoot = path.resolve(cwd, PUBLIC_DIR);

  if (!(await pathExists(outputRoot))) {
    return;
  }

  const outputEntries = await readdir(outputRoot, { withFileTypes: true });
  for (const entry of outputEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const extensionRoot = path.join(outputRoot, entry.name);
    const manifestPath = path.join(extensionRoot, "manifest.json");
    if (!(await pathExists(manifestPath))) {
      continue;
    }

    for (const assetDir of ASSET_DIRS) {
      const sourceDir = path.join(publicRoot, assetDir);
      if (!(await pathExists(sourceDir))) {
        continue;
      }

      const targetDir = path.join(extensionRoot, assetDir);
      await cp(sourceDir, targetDir, { recursive: true, force: true });
    }
  }
}

syncPublicAssets().catch((error) => {
  console.error("Failed to sync extension public assets:", error);
  process.exitCode = 1;
});
