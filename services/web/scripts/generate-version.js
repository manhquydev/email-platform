
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');
const versionFile = path.join(publicDir, 'version.json');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

const versionData = {
    version: Date.now().toString(),
    buildTime: new Date().toISOString()
};

fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));

console.log(`Version ${versionData.version} generated at ${versionFile}`);
