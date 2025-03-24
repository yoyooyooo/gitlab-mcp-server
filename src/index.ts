#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListToolsResult,
  ServerCapabilities,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  CreateOrUpdateFileSchema,
  SearchRepositoriesSchema,
  CreateRepositorySchema,
  GetFileContentsSchema,
  PushFilesSchema,
  CreateIssueSchema,
  CreateMergeRequestSchema,
  ForkRepositorySchema,
  CreateBranchSchema,
  ListGroupProjectsSchema,
  GetProjectEventsSchema,
  ListCommitsSchema,
  ListIssuesSchema,
  ListMergeRequestsSchema,
  FileOperationSchema,
} from './schemas.js';
import { GitLabApi } from './gitlab-api.js';
import { setupTransport } from './transport.js';
import {
  formatEventsResponse,
  formatCommitsResponse,
  formatIssuesResponse,
  formatMergeRequestsResponse,
} from './formatters.js';
import { isValidISODate } from './utils.js';

// Configuration
const GITLAB_PERSONAL_ACCESS_TOKEN = process.env.GITLAB_PERSONAL_ACCESS_TOKEN;
const GITLAB_API_URL = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';
const PORT = parseInt(process.env.PORT || '3000', 10);
const USE_SSE = process.env.USE_SSE === 'true';

if (!GITLAB_PERSONAL_ACCESS_TOKEN) {
  console.error("GITLAB_PERSONAL_ACCESS_TOKEN environment variable is not set");
  process.exit(1);
}

// Server capabilities
const serverCapabilities: ServerCapabilities = {
  tools: {}
};

// Create server
const server = new Server({
  name: "gitlab-mcp-server",
  version: "0.1.0",
}, {
  capabilities: serverCapabilities
});

// Create GitLab API client
const gitlabApi = new GitLabApi({
  apiUrl: GITLAB_API_URL,
  token: GITLAB_PERSONAL_ACCESS_TOKEN
});

// Helper function to convert Zod schema to JSON schema with proper type
function createJsonSchema(schema: z.ZodType<any>) {
  // Create a simple object schema with the correct type
  return {
    type: "object" as const,
    properties: {}
  };
}

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
  return {
    tools: [
      {
        name: "create_or_update_file",
        description: "Create or update a single file in a GitLab project",
        inputSchema: createJsonSchema(CreateOrUpdateFileSchema)
      },
      {
        name: "search_repositories",
        description: "Search for GitLab projects",
        inputSchema: createJsonSchema(SearchRepositoriesSchema)
      },
      {
        name: "create_repository",
        description: "Create a new GitLab project",
        inputSchema: createJsonSchema(CreateRepositorySchema)
      },
      {
        name: "get_file_contents",
        description: "Get the contents of a file or directory from a GitLab project",
        inputSchema: createJsonSchema(GetFileContentsSchema)
      },
      {
        name: "push_files",
        description: "Push multiple files to a GitLab project in a single commit",
        inputSchema: createJsonSchema(PushFilesSchema)
      },
      {
        name: "create_issue",
        description: "Create a new issue in a GitLab project",
        inputSchema: createJsonSchema(CreateIssueSchema)
      },
      {
        name: "create_merge_request",
        description: "Create a new merge request in a GitLab project",
        inputSchema: createJsonSchema(CreateMergeRequestSchema)
      },
      {
        name: "fork_repository",
        description: "Fork a GitLab project to your account or specified namespace",
        inputSchema: createJsonSchema(ForkRepositorySchema)
      },
      {
        name: "create_branch",
        description: "Create a new branch in a GitLab project",
        inputSchema: createJsonSchema(CreateBranchSchema)
      },
      {
        name: "list_group_projects",
        description: "List all projects (repositories) within a specific GitLab group",
        inputSchema: createJsonSchema(ListGroupProjectsSchema)
      },
      {
        name: "get_project_events",
        description: "Get recent events/activities for a GitLab project",
        inputSchema: createJsonSchema(GetProjectEventsSchema)
      },
      {
        name: "list_commits",
        description: "Get commit history for a GitLab project",
        inputSchema: createJsonSchema(ListCommitsSchema)
      },
      {
        name: "list_issues",
        description: "Get issues for a GitLab project",
        inputSchema: createJsonSchema(ListIssuesSchema)
      },
      {
        name: "list_merge_requests",
        description: "Get merge requests for a GitLab project",
        inputSchema: createJsonSchema(ListMergeRequestsSchema)
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    switch (request.params.name) {
      case "fork_repository": {
        const args = ForkRepositorySchema.parse(request.params.arguments);
        const fork = await gitlabApi.forkProject(args.project_id, args.namespace);
        return { content: [{ type: "text", text: JSON.stringify(fork, null, 2) }] };
      }

      case "create_branch": {
        const args = CreateBranchSchema.parse(request.params.arguments);
        let ref = args.ref;
        if (!ref) {
          ref = await gitlabApi.getDefaultBranchRef(args.project_id);
        }

        const branch = await gitlabApi.createBranch(args.project_id, {
          name: args.branch,
          ref
        });

        return { content: [{ type: "text", text: JSON.stringify(branch, null, 2) }] };
      }

      case "search_repositories": {
        const args = SearchRepositoriesSchema.parse(request.params.arguments);
        const results = await gitlabApi.searchProjects(args.search, args.page, args.per_page);
        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      }

      case "create_repository": {
        const args = CreateRepositorySchema.parse(request.params.arguments);
        const repository = await gitlabApi.createRepository(args);
        return { content: [{ type: "text", text: JSON.stringify(repository, null, 2) }] };
      }

      case "get_file_contents": {
        const args = GetFileContentsSchema.parse(request.params.arguments);
        const contents = await gitlabApi.getFileContents(args.project_id, args.file_path, args.ref);
        return { content: [{ type: "text", text: JSON.stringify(contents, null, 2) }] };
      }

      case "create_or_update_file": {
        const args = CreateOrUpdateFileSchema.parse(request.params.arguments);
        const result = await gitlabApi.createOrUpdateFile(
          args.project_id,
          args.file_path,
          args.content,
          args.commit_message,
          args.branch,
          args.previous_path
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "push_files": {
        const args = PushFilesSchema.parse(request.params.arguments);
        
        // Use individual file creation for each file instead of batch commit
        const results = [];
        for (const file of args.files) {
          try {
            const result = await gitlabApi.createOrUpdateFile(
              args.project_id,
              file.path,
              file.content,
              args.commit_message,
              args.branch
            );
            results.push(result);
          } catch (error) {
            console.error(`Error creating/updating file ${file.path}:`, error);
            throw error;
          }
        }
        
        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      }

      case "create_issue": {
        const args = CreateIssueSchema.parse(request.params.arguments);
        const { project_id, ...options } = args;
        const issue = await gitlabApi.createIssue(project_id, options);
        return { content: [{ type: "text", text: JSON.stringify(issue, null, 2) }] };
      }

      case "create_merge_request": {
        const args = CreateMergeRequestSchema.parse(request.params.arguments);
        const { project_id, ...options } = args;
        const mergeRequest = await gitlabApi.createMergeRequest(project_id, options);
        return { content: [{ type: "text", text: JSON.stringify(mergeRequest, null, 2) }] };
      }

      case "list_group_projects": {
        const args = ListGroupProjectsSchema.parse(request.params.arguments);
        const { group_id, ...options } = args;
        const results = await gitlabApi.listGroupProjects(group_id, options);
        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      }

      case "get_project_events": {
        // Parse and validate the arguments
        const args = GetProjectEventsSchema.parse(request.params.arguments);

        // Additional validation for pagination parameters
        if (args.per_page && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        // Extract project_id and options
        const { project_id, ...options } = args;

        // Call the API function
        const events = await gitlabApi.getProjectEvents(project_id, options);

        // Format and return the response
        return formatEventsResponse(events);
      }

      case "list_commits": {
        // Parse and validate the arguments
        const args = ListCommitsSchema.parse(request.params.arguments);

        // Additional validation for pagination parameters
        if (args.per_page && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        // Validate date formats if provided
        if (args.since && !isValidISODate(args.since)) {
          throw new Error(
            "since must be a valid ISO 8601 date (YYYY-MM-DDTHH:MM:SSZ)"
          );
        }

        if (args.until && !isValidISODate(args.until)) {
          throw new Error(
            "until must be a valid ISO 8601 date (YYYY-MM-DDTHH:MM:SSZ)"
          );
        }

        // Extract project_id and options
        const { project_id, ...options } = args;

        // Call the API function
        const commits = await gitlabApi.listCommits(project_id, options);

        // Format and return the response
        return formatCommitsResponse(commits);
      }

      case "list_issues": {
        // Parse and validate the arguments
        const args = ListIssuesSchema.parse(request.params.arguments);

        // Additional validation for pagination parameters
        if (args.per_page && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        // Validate date formats if provided
        const dateFields = [
          "created_after",
          "created_before",
          "updated_after",
          "updated_before",
        ];
        dateFields.forEach((field) => {
          const value = args[field as keyof typeof args];
          if (
            typeof value === 'string' &&
            !isValidISODate(value)
          ) {
            throw new Error(
              `${field} must be a valid ISO 8601 date (YYYY-MM-DDTHH:MM:SSZ)`
            );
          }
        });

        // Extract project_id and options
        const { project_id, ...options } = args;

        // Call the API function
        const issues = await gitlabApi.listIssues(project_id, options);

        // Format and return the response
        return formatIssuesResponse(issues);
      }

      case "list_merge_requests": {
        // Parse and validate the arguments
        const args = ListMergeRequestsSchema.parse(request.params.arguments);

        // Additional validation for pagination parameters
        if (args.per_page && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        // Validate date formats if provided
        const dateFields = [
          "created_after",
          "created_before",
          "updated_after",
          "updated_before",
        ];
        dateFields.forEach((field) => {
          const value = args[field as keyof typeof args];
          if (
            typeof value === 'string' &&
            !isValidISODate(value)
          ) {
            throw new Error(
              `${field} must be a valid ISO 8601 date (YYYY-MM-DDTHH:MM:SSZ)`
            );
          }
        });

        // Extract project_id and options
        const { project_id, ...options } = args;

        // Call the API function
        const mergeRequests = await gitlabApi.listMergeRequests(project_id, options);

        // Format and return the response
        return formatMergeRequestsResponse(mergeRequests);
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = `Invalid arguments: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
      throw new Error(errorMessage);
    }
    throw error;
  }
});

// Start the server
async function runServer() {
  try {
    await setupTransport(server, { port: PORT, useSSE: USE_SSE });
    console.error(`GitLab MCP Server running with ${USE_SSE ? 'SSE' : 'stdio'} transport`);
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

runServer();
