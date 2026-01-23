/**
 * OpenAPI Generator Script
 * Generates OpenAPI 3.1 specification from registered schemas and paths
 *
 * Usage: npx ts-node scripts/generate-openapi.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// Import paths to register them
import '../src/openapi/paths';
import { generateOpenAPIDocument } from '../src/openapi/registry';

const OUTPUT_DIR = path.join(__dirname, '..', 'openapi');
const OUTPUT_YAML = path.join(OUTPUT_DIR, 'openapi.yaml');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'openapi.json');

async function main() {
  console.log('🔄 Generating OpenAPI specification...\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate the OpenAPI document
  const document = generateOpenAPIDocument();

  // Write YAML format
  const yamlContent = yaml.stringify(document, { indent: 2 });
  fs.writeFileSync(OUTPUT_YAML, yamlContent, 'utf-8');
  console.log(`✅ Generated: ${OUTPUT_YAML}`);

  // Write JSON format
  const jsonContent = JSON.stringify(document, null, 2);
  fs.writeFileSync(OUTPUT_JSON, jsonContent, 'utf-8');
  console.log(`✅ Generated: ${OUTPUT_JSON}`);

  // Print summary
  const pathCount = Object.keys(document.paths || {}).length;
  const schemaCount = Object.keys(document.components?.schemas || {}).length;

  console.log('\n📊 Summary:');
  console.log(`   Paths: ${pathCount}`);
  console.log(`   Schemas: ${schemaCount}`);
  console.log(`   Version: ${document.info.version}`);
  console.log('\n✨ OpenAPI specification generated successfully!');
}

main().catch(console.error);
