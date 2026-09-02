import type { WebMcpTool } from "./webmcp";

declare global {
  interface ModelContext {
    registerTool(
      tool: WebMcpTool,
      options?: { signal?: AbortSignal; exposedTo?: string[] },
    ): Promise<void>;
    getTools(options?: { fromOrigins?: string[] }): Promise<unknown[]>;
  }

  interface Document {
    readonly modelContext?: ModelContext;
  }

  interface Window {
    __RUN_SOCIAL_WEBMCP__?: {
      tools: WebMcpTool[];
      execute: (name: string, input: Record<string, unknown>) => Promise<unknown>;
    };
    __RUN_SOCIAL_WEBMCP_CONTROLLER__?: AbortController;
  }
}

export {};
