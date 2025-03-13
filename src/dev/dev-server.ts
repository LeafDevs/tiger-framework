import { serve } from "bun";
import type { ServerWebSocket } from "bun";
import { watch } from "fs";
import { compileTigerToHTML } from "../build/compiler";
import { readFile } from "fs/promises";

const server = serve({
  port: 3000,
  async fetch(req, server) {
    // Handle WebSocket upgrade
    if (server.upgrade(req)) {
      return;
    }

    const url = new URL(req.url);
    const path = url.pathname;

    try {
      // Serve index.html for root path
      if (path === "/") {
        const html = await readFile("./src/test.tiger", "utf-8");
        const compiledHTML = await compileTigerToHTML(html);
        
        const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tiger App</title>
    <style>
        #reload-indicator {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            display: none;
            z-index: 9999;
            font-family: system-ui, -apple-system, sans-serif;
        }
    </style>
</head>
<body>
    ${compiledHTML}
    <div id="reload-indicator">Reloading...</div>
    <script>
        const ws = new WebSocket('ws://' + window.location.host);
        const reloadIndicator = document.getElementById('reload-indicator');
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;

        ws.onopen = () => {
            console.log('Connected to dev server');
        };

        ws.onmessage = (event) => {
            if (event.data === 'reload') {
                reloadIndicator.style.display = 'block';
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
            if (reconnectAttempts < maxReconnectAttempts) {
                setTimeout(() => {
                    reconnectAttempts++;
                    window.location.reload();
                }, 1000 * reconnectAttempts);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    </script>
</body>
</html>`;

        return new Response(template, {
          headers: { "Content-Type": "text/html" },
        });
      }

      // Serve static files from dist directory
      if (path.startsWith("/")) {
        try {
          const file = await readFile(`.${path}`);
          const contentType = path.endsWith(".css") ? "text/css" : 
                            path.endsWith(".js") ? "application/javascript" : 
                            "text/plain";
          return new Response(file, {
            headers: { "Content-Type": contentType },
          });
        } catch (error) {
          return new Response("404 Not Found", { status: 404 });
        }
      }

      return new Response("404 Not Found", { status: 404 });
    } catch (error) {
      console.error("Error serving request:", error);
      return new Response("500 Internal Server Error", { status: 500 });
    }
  },
  websocket: {
    open(ws: ServerWebSocket<unknown>) {
      console.log("Client connected");
    },
    message(ws: ServerWebSocket<unknown>, message: string | Buffer) {
      // Handle any messages from the client if needed
    },
    close(ws: ServerWebSocket<unknown>) {
      console.log("Client disconnected");
    },
  },
});

console.log("Development server running at http://localhost:3000");

// Watch for changes in the src directory
const watcher = watch("./src", { recursive: true }, async (event, filename) => {
  if (filename && (filename.endsWith(".tiger") || filename.endsWith(".css"))) {
    console.log(`File changed: ${filename}`);
    // Notify all connected clients to reload
    server.publish("reload", "reload");
  }
}); 