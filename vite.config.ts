import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  optimizeDeps: {
    exclude: []
  },
  ssr: {
    noExternal: [],
    external: []
  },
  define: {
    global: 'globalThis'
  }
}));

function expressPlugin(): Plugin {
  let expressApp: any = null;
  
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      console.log("Configuring Express server middleware...");
      
      // Proxy ALL requests to our Express app, not just /api
      server.middlewares.use(async (req, res, next) => {
        try {
          // Skip non-API requests
          if (!req.url?.startsWith('/api')) {
            return next();
          }
          
          // Create Express app only once and cache it
          if (!expressApp) {
            console.log("Creating Express server...");
            const { createServer } = await import('./server/index.ts');
            expressApp = createServer();
          }
          
          // Pass the request as-is to the Express app
          expressApp(req, res, next);
        } catch (error: any) {
          console.error('Error loading server:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            success: false, 
            message: 'Internal server error',
            error: error?.message || 'Unknown error'
          }));
        }
      });
      
      console.log("Express server middleware configured with /api prefix.");
    },
  };
}
