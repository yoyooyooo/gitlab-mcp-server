import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";

/**
 * Transport configuration options
 */
export interface TransportOptions {
  /**
   * Port to use for SSE transport (default: 3000)
   */
  port?: number;
  
  /**
   * Whether to use SSE transport (default: false, uses stdio)
   */
  useSSE?: boolean;
}

/**
 * Sets up the appropriate transport for the server based on the options
 * 
 * @param server - The MCP server instance
 * @param options - Transport configuration options
 * @returns A promise that resolves when the transport is set up
 */
export async function setupTransport(
  server: Server,
  options: TransportOptions = {}
): Promise<void> {
  const { port = 3000, useSSE = false } = options;

  if (useSSE) {
    // Set up SSE transport
    const app = express();
    
    // Enable CORS for all routes
    app.use(cors());
    
    // Parse JSON request bodies
    app.use(express.json());

    // Create a map to store active SSE transports by session ID
    const transports = new Map<string, SSEServerTransport>();

    // SSE endpoint
    app.get("/sse", (req, res) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      
      // Create a new SSE transport
      const transport = new SSEServerTransport("/messages", res);
      
      // Store the transport by session ID
      transports.set(transport.sessionId, transport);
      
      // Connect the server to the transport
      server.connect(transport).catch(error => {
        console.error("Error connecting server to SSE transport:", error);
      });
      
      // Clean up when the connection is closed
      res.on("close", () => {
        transports.delete(transport.sessionId);
      });
    });

    // Message endpoint for client-to-server communication
    app.post("/messages", async (req, res) => {
      const sessionId = req.query.sessionId as string;
      
      if (!sessionId) {
        res.status(400).json({ error: "Missing sessionId parameter" });
        return;
      }
      
      const transport = transports.get(sessionId);
      
      if (!transport) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      
      try {
        await transport.handlePostMessage(req, res);
      } catch (error) {
        console.error("Error handling message:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Start the server
    app.listen(port, () => {
      console.error(`SSE server listening on port ${port}`);
    });
  } else {
    // Set up stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}