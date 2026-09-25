import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const versionInfo = {
    version: new Date().getTime().toString(),
    buildDate: new Date().toISOString()
};

// Ensure public directory exists
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(
    path.join(publicDir, 'version.json'),
    JSON.stringify(versionInfo, null, 2)
);

console.log(`Build version generated: ${versionInfo.version}`);
