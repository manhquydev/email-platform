import { readFileSync } from 'fs';
import { join } from 'path';

export function docsPlugin() {
  return {
    name: 'docs',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Handle docs routes
        if (req.url.startsWith('/docs/')) {
          try {
            // Get the markdown file path
            const filePath = join(process.cwd(), 'docs', req.url.replace('/docs/', ''));

            // Read the file
            const content = readFileSync(filePath, 'utf-8');

            // Set content type
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');

            // Send the content
            res.end(content);
          } catch (error) {
            res.statusCode = 404;
            res.end('Documentation not found');
          }
        } else {
          next();
        }
      });
    }
  };
}