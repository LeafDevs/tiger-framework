import { serve } from "bun";
import { readFile } from "fs/promises";
import { join } from "path";
import chalk from "chalk";

const getContentType = (path: string): string => {
  if (path.endsWith(".css")) {
    return "text/css";
  }
  if (path.endsWith(".js")) {
    return "text/javascript";
  }
  if (path.endsWith(".html")) {
    return "text/html";
  }
  if (path.endsWith(".png")) {
    return "image/png";
  }
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (path.endsWith(".gif")) {
    return "image/gif";
  }
  if (path.endsWith(".svg")) {
    return "image/svg+xml";
  }
  return "text/plain";
};

const server = serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    try {
      // Remove trailing slash except for root
      if (path !== "/" && path.endsWith("/")) {
        path = path.slice(0, -1);
      }

      // Try to serve the file directly first
      try {
        const filePath = join("./dist", path);
        const file = await readFile(filePath);
        const contentType = getContentType(path);
        return new Response(file, {
          headers: {
            "Content-Type": contentType,
          },
        });
      } catch (error) {
        // If file not found directly, try index.html in the directory
        try {
          const indexPath = path === "/" ? "./dist/index.html" : join("./dist", path, "index.html");
          const file = await readFile(indexPath);
          return new Response(file, {
            headers: {
              "Content-Type": "text/html",
            },
          });
        } catch (indexError) {
          console.error(chalk.yellow(`Not found: ${path}`));
          return new Response("Not Found", { status: 404 });
        }
      }
    } catch (error) {
      console.error(chalk.red(`Server error: ${error}`));
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

console.log(chalk.green(`\n🚀 Production server running at http://localhost:${server.port}`));
console.log(chalk.cyan("Available routes:"));
console.log(chalk.blue("  • / (Home)"));
console.log(chalk.blue("  • /gallery"));
console.log(chalk.blue("  • /static assets (CSS, images, etc.)\n"));