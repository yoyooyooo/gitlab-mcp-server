#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import packageJson from '../package.json' with { type: 'json' };
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
  ListProjectWikiPagesSchema,
  GetProjectWikiPageSchema,
  CreateProjectWikiPageSchema,
  EditProjectWikiPageSchema,
  DeleteProjectWikiPageSchema,
  UploadProjectWikiAttachmentSchema,
  ListGroupWikiPagesSchema,
  GetGroupWikiPageSchema,
  CreateGroupWikiPageSchema,
  EditGroupWikiPageSchema,
  DeleteGroupWikiPageSchema,
  UploadGroupWikiAttachmentSchema,
  ListProjectMembersSchema,
  ListGroupMembersSchema,
  FileOperationSchema,
  ListIssueNotesSchema,
  ListIssueDiscussionsSchema,
  GetMergeRequestDetailsSchema,
  ListOpenMergeRequestsSchema,
  GetMergeRequestCommentsSchema,
  AddMergeRequestCommentSchema,
  AddMergeRequestDiffCommentSchema,
  GetMergeRequestDiffSchema,
  GetIssueDetailsSchema,
} from './schemas.js';
import { GitLabApi } from './gitlab-api.js';
import { setupTransport } from './transport.js';
import {
  formatEventsResponse,
  formatCommitsResponse,
  formatIssuesResponse,
  formatMergeRequestsResponse,
  formatWikiPagesResponse,
  formatWikiPageResponse,
  formatWikiAttachmentResponse,
  formatMembersResponse,
  formatNotesResponse,
  formatDiscussionsResponse
} from './formatters.js';
import { isValidISODate } from './utils.js';

// Configuration
const GITLAB_PERSONAL_ACCESS_TOKEN = process.env.GITLAB_PERSONAL_ACCESS_TOKEN;
const GITLAB_API_URL = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';
const PORT = parseInt(process.env.PORT || '3000', 10);
const USE_SSE = process.env.USE_SSE === 'true';
const GITLAB_READ_ONLY_MODE = process.env.GITLAB_READ_ONLY_MODE === 'true';

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
  version: packageJson.version,
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
  // Convert the schema using zodToJsonSchema
  const jsonSchema = zodToJsonSchema(schema);

  // Ensure we return an object with the expected structure
  return {
    type: "object" as const,
    properties: (jsonSchema as any).properties || {}
  };
}

// Define all available tools with their descriptions and schemas
const ALL_TOOLS = [
  {
    name: "create_or_update_file",
    description: "Create or update a single file in a GitLab project",
    inputSchema: createJsonSchema(CreateOrUpdateFileSchema),
    readOnly: false
  },
  {
    name: "search_repositories",
    description: "Search for GitLab projects",
    inputSchema: createJsonSchema(SearchRepositoriesSchema),
    readOnly: true
  },
  {
    name: "create_repository",
    description: "Create a new GitLab project",
    inputSchema: createJsonSchema(CreateRepositorySchema),
    readOnly: false
  },
  {
    name: "get_file_contents",
    description: "Get the contents of a file or directory from a GitLab project",
    inputSchema: createJsonSchema(GetFileContentsSchema),
    readOnly: true
  },
  {
    name: "push_files",
    description: "Push multiple files to a GitLab project in a single commit",
    inputSchema: createJsonSchema(PushFilesSchema),
    readOnly: false
  },
  {
    name: "create_issue",
    description: "Create a new issue in a GitLab project",
    inputSchema: createJsonSchema(CreateIssueSchema),
    readOnly: false
  },
  {
    name: "create_merge_request",
    description: "Create a new merge request in a GitLab project",
    inputSchema: createJsonSchema(CreateMergeRequestSchema),
    readOnly: false
  },
  {
    name: "fork_repository",
    description: "Fork a GitLab project to your account or specified namespace",
    inputSchema: createJsonSchema(ForkRepositorySchema),
    readOnly: false
  },
  {
    name: "create_branch",
    description: "Create a new branch in a GitLab project",
    inputSchema: createJsonSchema(CreateBranchSchema),
    readOnly: false
  },
  {
    name: "list_group_projects",
    description: "List all projects (repositories) within a specific GitLab group",
    inputSchema: createJsonSchema(ListGroupProjectsSchema),
    readOnly: true
  },
  {
    name: "get_project_events",
    description: "Get recent events/activities for a GitLab project",
    inputSchema: createJsonSchema(GetProjectEventsSchema),
    readOnly: true
  },
  {
    name: "list_commits",
    description: "Get commit history for a GitLab project",
    inputSchema: createJsonSchema(ListCommitsSchema),
    readOnly: true
  },
  {
    name: "list_issues",
    description: "Get issues for a GitLab project",
    inputSchema: createJsonSchema(ListIssuesSchema),
    readOnly: true
  },
  {
    name: "list_merge_requests",
    description: "Get merge requests for a GitLab project",
    inputSchema: createJsonSchema(ListMergeRequestsSchema),
    readOnly: true
  },
  // Project Wiki Tools
  {
    name: "list_project_wiki_pages",
    description: "List all wiki pages for a GitLab project",
    inputSchema: createJsonSchema(ListProjectWikiPagesSchema),
    readOnly: true
  },
  {
    name: "get_project_wiki_page",
    description: "Get a specific wiki page for a GitLab project",
    inputSchema: createJsonSchema(GetProjectWikiPageSchema),
    readOnly: true
  },
  {
    name: "create_project_wiki_page",
    description: "Create a new wiki page for a GitLab project",
    inputSchema: createJsonSchema(CreateProjectWikiPageSchema),
    readOnly: false
  },
  {
    name: "edit_project_wiki_page",
    description: "Edit an existing wiki page for a GitLab project",
    inputSchema: createJsonSchema(EditProjectWikiPageSchema),
    readOnly: false
  },
  {
    name: "delete_project_wiki_page",
    description: "Delete a wiki page from a GitLab project",
    inputSchema: createJsonSchema(DeleteProjectWikiPageSchema),
    readOnly: false
  },
  {
    name: "upload_project_wiki_attachment",
    description: "Upload an attachment to a GitLab project wiki",
    inputSchema: createJsonSchema(UploadProjectWikiAttachmentSchema),
    readOnly: false
  },
  // Group Wiki Tools
  {
    name: "list_group_wiki_pages",
    description: "List all wiki pages for a GitLab group",
    inputSchema: createJsonSchema(ListGroupWikiPagesSchema),
    readOnly: true
  },
  {
    name: "get_group_wiki_page",
    description: "Get a specific wiki page for a GitLab group",
    inputSchema: createJsonSchema(GetGroupWikiPageSchema),
    readOnly: true
  },
  {
    name: "create_group_wiki_page",
    description: "Create a new wiki page for a GitLab group",
    inputSchema: createJsonSchema(CreateGroupWikiPageSchema),
    readOnly: false
  },
  {
    name: "edit_group_wiki_page",
    description: "Edit an existing wiki page for a GitLab group",
    inputSchema: createJsonSchema(EditGroupWikiPageSchema),
    readOnly: false
  },
  {
    name: "delete_group_wiki_page",
    description: "Delete a wiki page from a GitLab group",
    inputSchema: createJsonSchema(DeleteGroupWikiPageSchema),
    readOnly: false
  },
  {
    name: "upload_group_wiki_attachment",
    description: "Upload an attachment to a GitLab group wiki",
    inputSchema: createJsonSchema(UploadGroupWikiAttachmentSchema),
    readOnly: false
  },
  // Member Tools
  {
    name: "list_project_members",
    description: "List all members of a GitLab project (including inherited members)",
    inputSchema: createJsonSchema(ListProjectMembersSchema),
    readOnly: true
  },
  {
    name: "list_group_members",
    description: "List all members of a GitLab group (including inherited members)",
    inputSchema: createJsonSchema(ListGroupMembersSchema),
    readOnly: true
  },
  // Issue Notes Tools
  {
    name: "list_issue_notes",
    description: "Fetch all comments and system notes for a GitLab issue",
    inputSchema: createJsonSchema(ListIssueNotesSchema),
    readOnly: true
  },
  {
    name: "list_issue_discussions",
    description: "Fetch all discussions (threaded comments) for a GitLab issue",
    inputSchema: createJsonSchema(ListIssueDiscussionsSchema),
    readOnly: true
  },
  {
    name: "get_merge_request_details",
    description: "Get details about a specific merge request of a project like title, source-branch, target-branch, web_url, ...",
    inputSchema: createJsonSchema(GetMergeRequestDetailsSchema),
    readOnly: true
  },
  {
    name: "list_open_merge_requests",
    description: "Lists all open merge requests in the project",
    inputSchema: createJsonSchema(ListOpenMergeRequestsSchema),
    readOnly: true
  },
  {
    name: "get_merge_request_comments",
    description: "Get general and file diff comments of a certain merge request",
    inputSchema: createJsonSchema(GetMergeRequestCommentsSchema),
    readOnly: true
  },
  {
    name: "add_merge_request_comment",
    description: "Add a general comment to a merge request",
    inputSchema: createJsonSchema(AddMergeRequestCommentSchema),
    readOnly: false
  },
  {
    name: "add_merge_request_diff_comment",
    description: "Add a comment of a merge request at a specific line in a file diff",
    inputSchema: createJsonSchema(AddMergeRequestDiffCommentSchema),
    readOnly: false
  },
  {
    name: "get_merge_request_diff",
    description: "Get the file diffs of a certain merge request",
    inputSchema: createJsonSchema(GetMergeRequestDiffSchema),
    readOnly: true
  },
  {
    name: "get_issue_details",
    description: "Get details of an issue within a certain project",
    inputSchema: createJsonSchema(GetIssueDetailsSchema),
    readOnly: true
  },
];

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
  if (GITLAB_READ_ONLY_MODE) {
    console.log("Server running in read-only mode, exposing only read operations");
    return {
      tools: ALL_TOOLS
        .filter(tool => tool.readOnly)
        .map(({ name, description, inputSchema }) => ({ name, description, inputSchema }))
    };
  }

  return {
    tools: ALL_TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }))
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    // Check if tool is available in read-only mode
    if (GITLAB_READ_ONLY_MODE) {
      const tool = ALL_TOOLS.find(t => t.name === request.params.name);
      if (!tool || !tool.readOnly) {
        throw new Error(`Tool '${request.params.name}' is not available in read-only mode`);
      }
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
        const results: any[] = [];
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

      // Project Wiki Tools
      case "list_project_wiki_pages": {
        const args = ListProjectWikiPagesSchema.parse(request.params.arguments);
        const wikiPages = await gitlabApi.listProjectWikiPages(args.project_id, {
          with_content: args.with_content
        });
        return formatWikiPagesResponse(wikiPages);
      }

      case "get_project_wiki_page": {
        const args = GetProjectWikiPageSchema.parse(request.params.arguments);
        const wikiPage = await gitlabApi.getProjectWikiPage(args.project_id, args.slug, {
          render_html: args.render_html,
          version: args.version
        });
        return formatWikiPageResponse(wikiPage);
      }

      case "create_project_wiki_page": {
        const args = CreateProjectWikiPageSchema.parse(request.params.arguments);
        const wikiPage = await gitlabApi.createProjectWikiPage(args.project_id, {
          title: args.title,
          content: args.content,
          format: args.format
        });
        return formatWikiPageResponse(wikiPage);
      }

      case "edit_project_wiki_page": {
        const args = EditProjectWikiPageSchema.parse(request.params.arguments);
        const wikiPage = await gitlabApi.editProjectWikiPage(args.project_id, args.slug, {
          title: args.title,
          content: args.content,
          format: args.format
        });
        return formatWikiPageResponse(wikiPage);
      }

      case "delete_project_wiki_page": {
        const args = DeleteProjectWikiPageSchema.parse(request.params.arguments);
        await gitlabApi.deleteProjectWikiPage(args.project_id, args.slug);
        return { content: [{ type: "text", text: `Wiki page '${args.slug}' has been deleted.` }] };
      }

      case "upload_project_wiki_attachment": {
        const args = UploadProjectWikiAttachmentSchema.parse(request.params.arguments);
        const attachment = await gitlabApi.uploadProjectWikiAttachment(args.project_id, {
          file_path: args.file_path,
          content: args.content,
          branch: args.branch
        });
        return formatWikiAttachmentResponse(attachment);
      }

      // Group Wiki Tools
      case "list_group_wiki_pages": {
        const args = ListGroupWikiPagesSchema.parse(request.params.arguments);
        const wikiPages = await gitlabApi.listGroupWikiPages(args.group_id, {
          with_content: args.with_content
        });
        return formatWikiPagesResponse(wikiPages);
      }

      case "get_group_wiki_page": {
        const args = GetGroupWikiPageSchema.parse(request.params.arguments);
        const wikiPage = await gitlabApi.getGroupWikiPage(args.group_id, args.slug, {
          render_html: args.render_html,
          version: args.version
        });
        return formatWikiPageResponse(wikiPage);
      }

      case "create_group_wiki_page": {
        const args = CreateGroupWikiPageSchema.parse(request.params.arguments);
        const wikiPage = await gitlabApi.createGroupWikiPage(args.group_id, {
          title: args.title,
          content: args.content,
          format: args.format
        });
        return formatWikiPageResponse(wikiPage);
      }

      case "edit_group_wiki_page": {
        const args = EditGroupWikiPageSchema.parse(request.params.arguments);
        const wikiPage = await gitlabApi.editGroupWikiPage(args.group_id, args.slug, {
          title: args.title,
          content: args.content,
          format: args.format
        });
        return formatWikiPageResponse(wikiPage);
      }

      case "delete_group_wiki_page": {
        const args = DeleteGroupWikiPageSchema.parse(request.params.arguments);
        await gitlabApi.deleteGroupWikiPage(args.group_id, args.slug);
        return { content: [{ type: "text", text: `Wiki page '${args.slug}' has been deleted.` }] };
      }

      case "upload_group_wiki_attachment": {
        const args = UploadGroupWikiAttachmentSchema.parse(request.params.arguments);
        const attachment = await gitlabApi.uploadGroupWikiAttachment(args.group_id, {
          file_path: args.file_path,
          content: args.content,
          branch: args.branch
        });
        return formatWikiAttachmentResponse(attachment);
      }

      case "list_project_members": {
        const args = ListProjectMembersSchema.parse(request.params.arguments);
        const { project_id, ...options } = args;
        const members = await gitlabApi.listProjectMembers(project_id, options);
        return formatMembersResponse(members);
      }

      case "list_group_members": {
        const args = ListGroupMembersSchema.parse(request.params.arguments);
        const { group_id, ...options } = args;
        const members = await gitlabApi.listGroupMembers(group_id, options);
        return formatMembersResponse(members);
      }

      case "list_issue_notes": {
        // Parse and validate the arguments
        const args = ListIssueNotesSchema.parse(request.params.arguments);

        // Additional validation for pagination parameters
        if (args.per_page && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        // Call the API function
        const notes = await gitlabApi.getIssueNotes(
          args.project_id,
          args.issue_iid,
          {
            sort: args.sort,
            order_by: args.order_by,
            page: args.page,
            per_page: args.per_page
          }
        );

        // Format and return the response
        return formatNotesResponse(notes);
      }

      case "list_issue_discussions": {
        // Parse and validate the arguments
        const args = ListIssueDiscussionsSchema.parse(request.params.arguments);

        // Additional validation for pagination parameters
        if (args.per_page && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        // Call the API function
        const discussions = await gitlabApi.getIssueDiscussions(
          args.project_id,
          args.issue_iid,
          {
            page: args.page,
            per_page: args.per_page
          }
        );

        // Format and return the response
        return formatDiscussionsResponse(discussions);
      }

      case "get_merge_request_details": {
        // Parse and validate the arguments
        const args = GetMergeRequestDetailsSchema.parse(request.params.arguments);

        // Call the API function to get the merge request details
        const mergeRequest = await gitlabApi.getMergeRequestDetails(args.project_id, args.merge_request_iid);

        // Filter the merge request data if verbose is not enabled
        const result = args.verbose ? mergeRequest : {
          title: mergeRequest.title,
          description: mergeRequest.description,
          state: mergeRequest.state,
          web_url: mergeRequest.web_url,
          target_branch: mergeRequest.target_branch,
          source_branch: mergeRequest.source_branch,
          merge_status: 'can_be_merged', // Note: Adding this field for compatibility
          detailed_merge_status: 'mergeable', // Note: Adding this field for compatibility
          diff_refs: mergeRequest.diff_refs,
        };

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "list_open_merge_requests": {
        const args = ListOpenMergeRequestsSchema.parse(request.params.arguments);
        const mergeRequests = await gitlabApi.listOpenMergeRequests(args.project_id);

        // Filter the merge requests data if verbose is not enabled
        const result = args.verbose ? mergeRequests : {
          count: mergeRequests.count,
          items: mergeRequests.items.map(mr => ({
            iid: mr.iid,
            project_id: mr.project_id,
            title: mr.title,
            description: mr.description,
            state: mr.state,
            web_url: mr.web_url,
          }))
        };

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "get_merge_request_comments": {
        const args = GetMergeRequestCommentsSchema.parse(request.params.arguments);
        const discussions = await gitlabApi.getMergeRequestComments(args.project_id, args.merge_request_iid);

        if (args.verbose) {
          return { content: [{ type: "text", text: JSON.stringify(discussions, null, 2) }] };
        }

        // Filter the discussions to get notes and convert to simple format
        const allNotes = discussions.items.flatMap(discussion => discussion.notes || []);

        // Separate discussion notes and diff notes based on type
        const discussionNotes = allNotes
          .filter(note => note.type !== 'DiffNote')
          .map(note => ({
            id: note.id,
            body: note.body,
            author_name: note.author?.name,
          }));

        const diffNotes = allNotes
          .filter(note => note.type === 'DiffNote')
          .map(note => ({
            id: note.id,
            body: note.body,
            author_name: note.author?.name,
            // Position info might be in custom fields depending on implementation
          }));

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ discussionNotes, diffNotes }, null, 2)
          }]
        };
      }

      case "add_merge_request_comment": {
        const args = AddMergeRequestCommentSchema.parse(request.params.arguments);
        const result = await gitlabApi.addMergeRequestComment(
          args.project_id,
          args.merge_request_iid,
          args.comment
        );

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "add_merge_request_diff_comment": {
        const args = AddMergeRequestDiffCommentSchema.parse(request.params.arguments);
        const result = await gitlabApi.addMergeRequestDiffComment(
          args.project_id,
          args.merge_request_iid,
          {
            comment: args.comment,
            base_sha: args.base_sha,
            start_sha: args.start_sha,
            head_sha: args.head_sha,
            file_path: args.file_path,
            line_number: args.line_number
          }
        );

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "get_merge_request_diff": {
        const args = GetMergeRequestDiffSchema.parse(request.params.arguments);

        // Additional validation for pagination parameters
        if (args.per_page && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page && args.page < 1) {
          throw new Error("page must be greater than 0");
        }
        const { project_id, merge_request_iid: mergeRequestIid, ...options } = args;
        const diff = await gitlabApi.getMergeRequestDiff(args.project_id, { mergeRequestIid, ...options });

        const diffText = Array.isArray(diff) && diff.length > 0
          ? JSON.stringify(diff, null, 2)
          : "No diff data available for this merge request.";

        return { content: [{ type: "text", text: diffText }] };
      }

      case "get_issue_details": {
        const args = GetIssueDetailsSchema.parse(request.params.arguments);
        const issue = await gitlabApi.getIssueDetails(args.project_id, args.issue_iid);

        const filteredIssue = args.verbose ? issue : {
          title: issue.title,
          description: issue.description,
          state: issue.state,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          closed_at: issue.closed_at,
          author: issue.author,
          assignees: issue.assignees,
          web_url: issue.web_url,
        };

        return { content: [{ type: "text", text: JSON.stringify(filteredIssue, null, 2) }] };
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
