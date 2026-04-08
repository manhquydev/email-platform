/**
 * Route Map Generator
 * Builds a stable route/method index from generated OpenAPI JSON.
 *
 * Usage:
 *   npx ts-node scripts/generate-route-map.ts
 *   npx ts-node scripts/generate-route-map.ts --check
 */

import * as fs from "fs";
import * as path from "path";

type OpenApiDocument = {
  paths?: Record<string, Record<string, unknown>>;
};

type RouteMapEntry = {
  path: string;
  methods: string[];
};

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "options", "head", "trace"]);

const OPENAPI_JSON_PATH = path.join(__dirname, "..", "openapi", "openapi.json");
const ROUTE_MAP_PATH = path.join(__dirname, "..", "openapi", "route-map.json");

function buildRouteMap(doc: OpenApiDocument): RouteMapEntry[] {
  const paths = doc.paths ?? {};
  return Object.keys(paths)
    .sort((a, b) => a.localeCompare(b))
    .map((routePath) => {
      const operations = paths[routePath] ?? {};
      const methods = Object.keys(operations)
        .filter((method) => HTTP_METHODS.has(method.toLowerCase()))
        .map((method) => method.toUpperCase())
        .sort();
      return { path: routePath, methods };
    })
    .filter((entry) => entry.methods.length > 0);
}

function main() {
  const checkMode = process.argv.includes("--check");

  if (!fs.existsSync(OPENAPI_JSON_PATH)) {
    console.error(`OpenAPI JSON not found: ${OPENAPI_JSON_PATH}`);
    process.exit(1);
  }

  const openapiRaw = fs.readFileSync(OPENAPI_JSON_PATH, "utf8");
  const openapiDoc = JSON.parse(openapiRaw) as OpenApiDocument;
  const routeMap = {
    schemaVersion: 1,
    totalRoutes: 0,
    routes: [] as RouteMapEntry[],
  };

  routeMap.routes = buildRouteMap(openapiDoc);
  routeMap.totalRoutes = routeMap.routes.length;

  const nextContent = `${JSON.stringify(routeMap, null, 2)}\n`;

  if (checkMode) {
    if (!fs.existsSync(ROUTE_MAP_PATH)) {
      console.error(`Route map missing: ${ROUTE_MAP_PATH}`);
      console.error("Run: npx ts-node scripts/generate-route-map.ts");
      process.exit(1);
    }

    const currentContent = fs.readFileSync(ROUTE_MAP_PATH, "utf8");
    if (currentContent !== nextContent) {
      console.error("Route map drift detected.");
      console.error("Run: npx ts-node scripts/generate-route-map.ts");
      process.exit(1);
    }

    console.log(`Route map is up-to-date (${routeMap.totalRoutes} routes).`);
    return;
  }

  fs.writeFileSync(ROUTE_MAP_PATH, nextContent, "utf8");
  console.log(`Generated route map: ${ROUTE_MAP_PATH}`);
  console.log(`Total routes: ${routeMap.totalRoutes}`);
}

main();
