#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  GitLabForkSchema,
  GitLabReferenceSchema,
  GitLabRepositorySchema,
  GitLabIssueSchema,
  GitLabMergeRequestSchema,
  GitLabContentSchema,
  GitLabCreateUpdateFileResponseSchema,
  GitLabSearchResponseSchema,
  GitLabGroupProjectsResponseSchema,
  GitLabTreeSchema,
  GitLabCommitSchema,
  GitLabEventSchema,
  GitLabEventsResponseSchema,
  GitLabCommitsResponseSchema,
  GitLabIssuesResponseSchema,
  GitLabMergeRequestsResponseSchema,
  CreateRepositoryOptionsSchema,
  CreateIssueOptionsSchema,
  CreateMergeRequestOptionsSchema,
  CreateBranchOptionsSchema,
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
  type GitLabFork,
  type GitLabReference,
  type GitLabRepository,
  type GitLabIssue,
  type GitLabMergeRequest,
  type GitLabContent,
  type GitLabCreateUpdateFileResponse,
  type GitLabSearchResponse,
  type GitLabGroupProjectsResponse,
  type GitLabTree,
  type GitLabCommit,
  type GitLabEvent,
  type GitLabEventsResponse,
  type GitLabCommitsResponse,
  type GitLabIssuesResponse,
  type GitLabMergeRequestsResponse,
  type FileOperation,
  type ListGroupProjects,
  type GetProjectEvents,
  type ListCommits,
  type ListIssues,
  type ListMergeRequests,
} from './schemas.js';

const server = new Server({
  name: "gitlab-mcp-server",
  version: "0.1.0",
}, {
  capabilities: {
    tools: {}
  }
});

const GITLAB_PERSONAL_ACCESS_TOKEN = process.env.GITLAB_PERSONAL_ACCESS_TOKEN;
const GITLAB_API_URL = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';

if (!GITLAB_PERSONAL_ACCESS_TOKEN) {
  console.error("GITLAB_PERSONAL_ACCESS_TOKEN environment variable is not set");
  process.exit(1);
}

async function forkProject(
  projectId: string,
  namespace?: string
): Promise<GitLabFork> {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/fork`;
  const queryParams = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';

  const response = await fetch(url + queryParams, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.statusText}`);
  }

  return GitLabForkSchema.parse(await response.json());
}

async function createBranch(
  projectId: string,
  options: z.infer<typeof CreateBranchOptionsSchema>
): Promise<GitLabReference> {
  const response = await fetch(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/repository/branches`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        branch: options.name,
        ref: options.ref
      })
    }
  );

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.statusText}`);
  }

  return GitLabReferenceSchema.parse(await response.json());
}

async function getDefaultBranchRef(projectId: string): Promise<string> {
  const response = await fetch(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}`,
    {
      headers: {
        "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.statusText}`);
  }

  const project = GitLabRepositorySchema.parse(await response.json());
  return project.default_branch;
}

async function getFileContents(
  projectId: string,
  filePath: string,
  ref: string
): Promise<GitLabContent> {
  const encodedPath = encodeURIComponent(filePath);
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/repository/files/${encodedPath}?ref=${encodeURIComponent(ref)}`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
    }
  });

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.statusText}`);
  }

  const data = GitLabContentSchema.parse(await response.json());
  
  if (!Array.isArray(data) && data.content) {
    data.content = Buffer.from(data.content, 'base64').toString('utf8');
  }

  return data;
}

async function createIssue(
  projectId: string,
  options: z.infer<typeof CreateIssueOptionsSchema>
): Promise<GitLabIssue> {
  const response = await fetch(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: options.title,
        description: options.description,
        assignee_ids: options.assignee_ids,
        milestone_id: options.milestone_id,
        labels: options.labels?.join(',')
      })
    }
  );

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.statusText}`);
  }

  return GitLabIssueSchema.parse(await response.json());
}

async function createMergeRequest(
  projectId: string,
  options: z.infer<typeof CreateMergeRequestOptionsSchema>
): Promise<GitLabMergeRequest> {
  const response = await fetch(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/merge_requests`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: options.title,
        description: options.description,
        source_branch: options.source_branch,
        target_branch: options.target_branch,
        allow_collaboration: options.allow_collaboration,
        draft: options.draft
      })
    }
  );

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.statusText}`);
  }

  // Get the response data and ensure it matches our schema
  const responseData = await response.json() as Record<string, any>;
  
  // Create a valid response object that matches the schema
  return {
    id: responseData.id,
    iid: responseData.iid,
    project_id: responseData.project_id,
    title: responseData.title,
    description: responseData.description || null,
    state: responseData.state,
    merged: responseData.merged,
    author: responseData.author,
    assignees: responseData.assignees || [],
    source_branch: responseData.source_branch,
    target_branch: responseData.target_branch,
    diff_refs: responseData.diff_refs || null,
    web_url: responseData.web_url,
    created_at: responseData.created_at,
    updated_at: responseData.updated_at,
    merged_at: responseData.merged_at,
    closed_at: responseData.closed_at,
    merge_commit_sha: responseData.merge_commit_sha
  };
}

async function createOrUpdateFile(
  projectId: string,
  filePath: string,
  content: string,
  commitMessage: string,
  branch: string,
  previousPath?: string
): Promise<GitLabCreateUpdateFileResponse> {
  const encodedPath = encodeURIComponent(filePath);
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/repository/files/${encodedPath}`;

  const body = {
    branch,
    content,
    commit_message: commitMessage,
    ...(previousPath ? { previous_path: previousPath } : {})
  };

  // Check if file exists
  let method = "POST";
  try {
    await getFileContents(projectId, filePath, branch);
    method = "PUT";
  } catch (error) {
    // File doesn't exist, use POST
  }

  const response = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.statusText}`);
  }

  // Create a valid response object that matches the schema
  const responseData = await response.json() as Record<string, any>;
  return {
    file_path: filePath,
    branch: branch,
    commit_id: responseData.commit_id || responseData.id || "unknown",
    content: responseData.content
  };
}

async function createTree(
  projectId: string,
  files: FileOperation[],
  ref?: string
): Promise<GitLabTree> {
  const response = await fetch(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/repository/tree`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        files: files.map(file => ({
          file_path: file.path,
          content: file.content
        })),
        ...(ref ? { ref } : {})
      })
    }
  );

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.statusText}`);
  }

  return GitLabTreeSchema.parse(await response.json());
}

async function createCommit(
  projectId: string,
  message: string,
  branch: string,
  actions: FileOperation[]
): Promise<GitLabCommit> {
  const response = await fetch(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/repository/commits`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        branch,
        commit_message: message,
        actions: actions.map(action => ({
          action: "create",
          file_path: action.path,
          content: action.content
        }))
      })
    }
  );

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.statusText}`);
  }

  return GitLabCommitSchema.parse(await response.json());
}

async function searchProjects(
  query: string,
  page: number = 1,
  perPage: number = 20
): Promise<GitLabSearchResponse> {
  const url = new URL(`${GITLAB_API_URL}/projects`);
  url.searchParams.append("search", query);
  url.searchParams.append("page", page.toString());
  url.searchParams.append("per_page", perPage.toString());

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
    }
  });

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.statusText}`);
  }

  const projects = await response.json();
  return GitLabSearchResponseSchema.parse({
    count: parseInt(response.headers.get("X-Total") || "0"),
    items: projects
  });
}

async function listGroupProjects(
  groupId: string,
  options: {
    archived?: boolean;
    visibility?: 'public' | 'internal' | 'private';
    order_by?: 'id' | 'name' | 'path' | 'created_at' | 'updated_at' | 'last_activity_at';
    sort?: 'asc' | 'desc';
    search?: string;
    simple?: boolean;
    include_subgroups?: boolean;
    page?: number;
    per_page?: number;
  } = {}
): Promise<GitLabGroupProjectsResponse> {
  const url = new URL(`${GITLAB_API_URL}/groups/${encodeURIComponent(groupId)}/projects`);
  
  // Add query parameters
  if (options.archived !== undefined) url.searchParams.append("archived", options.archived.toString());
  if (options.visibility) url.searchParams.append("visibility", options.visibility);
  if (options.order_by) url.searchParams.append("order_by", options.order_by);
  if (options.sort) url.searchParams.append("sort", options.sort);
  if (options.search) url.searchParams.append("search", options.search);
  if (options.simple !== undefined) url.searchParams.append("simple", options.simple.toString());
  if (options.include_subgroups !== undefined) url.searchParams.append("include_subgroups", options.include_subgroups.toString());
  if (options.page) url.searchParams.append("page", options.page.toString());
  if (options.per_page) url.searchParams.append("per_page", options.per_page.toString());

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
    }
  });

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.statusText}`);
  }

  const projects = await response.json();
  const totalCount = parseInt(response.headers.get("X-Total") || "0");
  
  return GitLabGroupProjectsResponseSchema.parse({
    count: totalCount,
    items: projects
  });
}

/**
 * Retrieves events for a GitLab project
 *
 * @param projectId - The ID or URL-encoded path of the project
 * @param options - Optional parameters for filtering and pagination
 * @returns A promise that resolves to the events response
 */
async function getProjectEvents(
  projectId: string,
  options: {
    action?: string;
    target_type?: string;
    before?: string;
    after?: string;
    sort?: "asc" | "desc";
    page?: number;
    per_page?: number;
  } = {}
): Promise<GitLabEventsResponse> {
  // Construct the URL with the project ID
  const url = new URL(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/events`
  );

  // Add query parameters for filtering and pagination
  if (options.action) url.searchParams.append("action", options.action);
  if (options.target_type)
    url.searchParams.append("target_type", options.target_type);
  if (options.before) url.searchParams.append("before", options.before);
  if (options.after) url.searchParams.append("after", options.after);
  if (options.sort) url.searchParams.append("sort", options.sort);
  if (options.page) url.searchParams.append("page", options.page.toString());
  if (options.per_page)
    url.searchParams.append("per_page", options.per_page.toString());

  try {
    // Make the API request
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
      },
    });

    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    const events = await response.json();

    // Get the total count from the headers
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    // Validate and return the response
    return GitLabEventsResponseSchema.parse({
      count: totalCount,
      items: events,
    });
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      throw new Error(
        `Failed to get events for project ${projectId}: ${error.message}`
      );
    }
    throw new Error(
      `Failed to get events for project ${projectId}: Unknown error`
    );
  }
}

/**
 * Formats the events response for better readability
 *
 * @param events - The GitLab events response
 * @returns A formatted MCP tool response
 */
function formatEventsResponse(events: GitLabEventsResponse) {
  // Basic response with all events
  const basicResponse = {
    content: [
      {
        type: "text",
        text: JSON.stringify(events, null, 2),
      },
    ],
  };

  // If there are no events, return the basic response
  if (events.count === 0 || events.items.length === 0) {
    return basicResponse;
  }

  // For a more user-friendly response, we could format the events
  // based on their type and include only the most relevant information

  // Example of enhanced formatting (optional):
  const formattedEvents = events.items.map((event) => {
    const baseInfo = {
      id: event.id,
      action: event.action_name,
      author: `${event.author.name} (${event.author.username})`,
      date: new Date(event.created_at).toISOString(),
      target_type: event.target_type || "unknown",
    };

    // Add type-specific information
    if (event.target_type === "Issue") {
      return {
        ...baseInfo,
        issue_title: event.target_title,
        issue_url: event.note?.url,
      };
    } else if (event.target_type === "MergeRequest") {
      return {
        ...baseInfo,
        merge_request_title: event.target_title,
        merge_request_url: event.note?.url,
      };
    } else if (event.action_name === "pushed") {
      return {
        ...baseInfo,
        branch: event.push_data?.ref,
        commit_count: event.push_data?.commit_count,
        commit_title: event.push_data?.commit_title,
      };
    }

    return baseInfo;
  });

  // Return both the raw and formatted responses
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            count: events.count,
            formatted_events: formattedEvents,
            raw_events: events.items,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Retrieves commits for a GitLab project
 *
 * @param projectId - The ID or URL-encoded path of the project
 * @param options - Optional parameters for filtering and pagination
 * @returns A promise that resolves to the commits response
 */
async function listCommits(
  projectId: string,
  options: {
    sha?: string;
    since?: string;
    until?: string;
    path?: string;
    all?: boolean;
    with_stats?: boolean;
    first_parent?: boolean;
    page?: number;
    per_page?: number;
  } = {}
): Promise<GitLabCommitsResponse> {
  // Construct the URL with the project ID
  const url = new URL(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(
      projectId
    )}/repository/commits`
  );

  // Add query parameters for filtering and pagination
  if (options.sha) url.searchParams.append("ref_name", options.sha);
  if (options.since) url.searchParams.append("since", options.since);
  if (options.until) url.searchParams.append("until", options.until);
  if (options.path) url.searchParams.append("path", options.path);
  if (options.all !== undefined)
    url.searchParams.append("all", options.all.toString());
  if (options.with_stats !== undefined)
    url.searchParams.append("with_stats", options.with_stats.toString());
  if (options.first_parent !== undefined)
    url.searchParams.append("first_parent", options.first_parent.toString());
  if (options.page) url.searchParams.append("page", options.page.toString());
  if (options.per_page)
    url.searchParams.append("per_page", options.per_page.toString());

  try {
    // Make the API request
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
      },
    });

    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    const commits = await response.json();

    // Get the total count from the headers
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    // Validate and return the response
    return GitLabCommitsResponseSchema.parse({
      count: totalCount,
      items: commits,
    });
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      throw new Error(
        `Failed to list commits for project ${projectId}: ${error.message}`
      );
    }
    throw new Error(
      `Failed to list commits for project ${projectId}: Unknown error`
    );
  }
}

/**
 * Validates if a string is a valid ISO 8601 date
 *
 * @param dateString - The date string to validate
 * @returns True if the string is a valid ISO 8601 date, false otherwise
 */
function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.includes("T");
}

/**
 * Formats the commits response for better readability
 *
 * @param commits - The GitLab commits response
 * @returns A formatted MCP tool response
 */
function formatCommitsResponse(commits: GitLabCommitsResponse) {
  // Basic response with all commits
  const basicResponse = {
    content: [
      {
        type: "text",
        text: JSON.stringify(commits, null, 2),
      },
    ],
  };

  // If there are no commits, return the basic response
  if (commits.count === 0 || commits.items.length === 0) {
    return basicResponse;
  }

  // For a more user-friendly response, we could format the commits
  // to include only the most relevant information

  // Example of enhanced formatting (optional):
  const formattedCommits = commits.items.map((commit) => {
    return {
      id: commit.short_id,
      title: commit.title,
      author: commit.author_name,
      author_email: commit.author_email,
      date: new Date(commit.authored_date).toISOString(),
      web_url: commit.web_url,
      stats: commit.stats
        ? {
            additions: commit.stats.additions,
            deletions: commit.stats.deletions,
            total: commit.stats.total,
          }
        : undefined,
    };
  });

  // Return both the raw and formatted responses
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            count: commits.count,
            formatted_commits: formattedCommits,
            raw_commits: commits.items,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Retrieves issues for a GitLab project
 *
 * @param projectId - The ID or URL-encoded path of the project
 * @param options - Optional parameters for filtering and pagination
 * @returns A promise that resolves to the issues response
 */
async function listIssues(
  projectId: string,
  options: {
    iid?: number | string;
    state?: "opened" | "closed" | "all";
    labels?: string;
    milestone?: string;
    scope?: "created_by_me" | "assigned_to_me" | "all";
    author_id?: number;
    assignee_id?: number;
    search?: string;
    created_after?: string;
    created_before?: string;
    updated_after?: string;
    updated_before?: string;
    order_by?: string;
    sort?: "asc" | "desc";
    page?: number;
    per_page?: number;
  } = {}
): Promise<GitLabIssuesResponse> {
  // Extract iid for client-side filtering if provided
  const { iid, ...apiOptions } = options;

  // Construct the URL with the project ID
  const url = new URL(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues`
  );

  // Add all query parameters except iid (we'll filter that client-side)
  Object.entries(apiOptions).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, value.toString());
    }
  });

  try {
    // Make the API request
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
      },
    });

    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    let issues = await response.json() as any[];

    // If iid is provided, filter the issues by iid
    if (iid !== undefined) {
      issues = issues.filter((issue) => issue.iid.toString() === iid.toString());
    }

    // Get the total count - if filtered, use the filtered length
    const totalCount = iid !== undefined ? issues.length : parseInt(response.headers.get("X-Total") || "0");

    // Validate and return the response
    return GitLabIssuesResponseSchema.parse({
      count: totalCount,
      items: issues,
    });
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      throw new Error(
        `Failed to list issues for project ${projectId}: ${error.message}`
      );
    }
    throw new Error(
      `Failed to list issues for project ${projectId}: Unknown error`
    );
  }
}

/**
 * Formats the issues response for better readability
 *
 * @param issues - The GitLab issues response
 * @returns A formatted MCP tool response
 */
function formatIssuesResponse(issues: GitLabIssuesResponse) {
  // Basic response with all issues
  const basicResponse = {
    content: [
      {
        type: "text",
        text: JSON.stringify(issues, null, 2),
      },
    ],
  };

  // If there are no issues, return the basic response
  if (issues.count === 0 || issues.items.length === 0) {
    return basicResponse;
  }

  // For a more user-friendly response, we could format the issues
  // to include only the most relevant information

  // Example of enhanced formatting (optional):
  const formattedIssues = issues.items.map((issue) => {
    return {
      iid: issue.iid,
      title: issue.title,
      state: issue.state,
      author: issue.author.name,
      assignees: issue.assignees.map((a) => a.name),
      labels: issue.labels.map((l) => typeof l === 'string' ? l : l.name),
      milestone: issue.milestone?.title || null,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      web_url: issue.web_url,
    };
  });

  // Return both the raw and formatted responses
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            count: issues.count,
            formatted_issues: formattedIssues,
            raw_issues: issues.items,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Retrieves merge requests for a GitLab project
 *
 * @param projectId - The ID or URL-encoded path of the project
 * @param options - Optional parameters for filtering and pagination
 * @returns A promise that resolves to the merge requests response
 */
async function listMergeRequests(
  projectId: string,
  options: {
    state?: "opened" | "closed" | "locked" | "merged" | "all";
    order_by?: "created_at" | "updated_at";
    sort?: "asc" | "desc";
    milestone?: string;
    labels?: string;
    created_after?: string;
    created_before?: string;
    updated_after?: string;
    updated_before?: string;
    scope?: "created_by_me" | "assigned_to_me" | "all";
    author_id?: number;
    assignee_id?: number;
    search?: string;
    source_branch?: string;
    target_branch?: string;
    wip?: "yes" | "no";
    page?: number;
    per_page?: number;
  } = {}
): Promise<GitLabMergeRequestsResponse> {
  // Construct the URL with the project ID
  const url = new URL(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(
      projectId
    )}/merge_requests`
  );

  // Add all query parameters
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, value.toString());
    }
  });

  try {
    // Make the API request
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
      },
    });

    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    const mergeRequests = await response.json();

    // Get the total count from the headers
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    // Validate and return the response
    return GitLabMergeRequestsResponseSchema.parse({
      count: totalCount,
      items: mergeRequests,
    });
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      throw new Error(
        `Failed to list merge requests for project ${projectId}: ${error.message}`
      );
    }
    throw new Error(
      `Failed to list merge requests for project ${projectId}: Unknown error`
    );
  }
}

/**
 * Formats the merge requests response for better readability
 *
 * @param mergeRequests - The GitLab merge requests response
 * @returns A formatted MCP tool response
 */
function formatMergeRequestsResponse(
  mergeRequests: GitLabMergeRequestsResponse
) {
  // Basic response with all merge requests
  const basicResponse = {
    content: [
      {
        type: "text",
        text: JSON.stringify(mergeRequests, null, 2),
      },
    ],
  };

  // If there are no merge requests, return the basic response
  if (mergeRequests.count === 0 || mergeRequests.items.length === 0) {
    return basicResponse;
  }

  // For a more user-friendly response, we could format the merge requests
  // to include only the most relevant information

  // Example of enhanced formatting (optional):
  const formattedMergeRequests = mergeRequests.items.map((mr) => {
    return {
      iid: mr.iid,
      title: mr.title,
      state: mr.state,
      merged: mr.merged,
      author: mr.author.name,
      assignees: mr.assignees.map((a) => a.name),
      source_branch: mr.source_branch,
      target_branch: mr.target_branch,
      created_at: mr.created_at,
      updated_at: mr.updated_at,
      merged_at: mr.merged_at,
      closed_at: mr.closed_at,
      web_url: mr.web_url,
    };
  });

  // Return both the raw and formatted responses
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            count: mergeRequests.count,
            formatted_merge_requests: formattedMergeRequests,
            raw_merge_requests: mergeRequests.items,
          },
          null,
          2
        ),
      },
    ],
  };
}

async function createRepository(
  options: z.infer<typeof CreateRepositoryOptionsSchema>
): Promise<GitLabRepository> {
  const response = await fetch(`${GITLAB_API_URL}/projects`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: options.name,
      description: options.description,
      visibility: options.visibility,
      initialize_with_readme: options.initialize_with_readme
    })
  });

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.statusText}`);
  }

  return GitLabRepositorySchema.parse(await response.json());
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_or_update_file",
        description: "Create or update a single file in a GitLab project",
        inputSchema: zodToJsonSchema(CreateOrUpdateFileSchema)
      },
      {
        name: "search_repositories",
        description: "Search for GitLab projects",
        inputSchema: zodToJsonSchema(SearchRepositoriesSchema)
      },
      {
        name: "create_repository",
        description: "Create a new GitLab project",
        inputSchema: zodToJsonSchema(CreateRepositorySchema)
      },
      {
        name: "get_file_contents",
        description: "Get the contents of a file or directory from a GitLab project",
        inputSchema: zodToJsonSchema(GetFileContentsSchema)
      },
      {
        name: "push_files",
        description: "Push multiple files to a GitLab project in a single commit",
        inputSchema: zodToJsonSchema(PushFilesSchema)
      },
      {
        name: "create_issue",
        description: "Create a new issue in a GitLab project",
        inputSchema: zodToJsonSchema(CreateIssueSchema)
      },
      {
        name: "create_merge_request",
        description: "Create a new merge request in a GitLab project",
        inputSchema: zodToJsonSchema(CreateMergeRequestSchema)
      },
      {
        name: "fork_repository",
        description: "Fork a GitLab project to your account or specified namespace",
        inputSchema: zodToJsonSchema(ForkRepositorySchema)
      },
      {
        name: "create_branch",
        description: "Create a new branch in a GitLab project",
        inputSchema: zodToJsonSchema(CreateBranchSchema)
      },
      {
        name: "list_group_projects",
        description: "List all projects (repositories) within a specific GitLab group",
        inputSchema: zodToJsonSchema(ListGroupProjectsSchema)
      },
      {
        name: "get_project_events",
        description: "Get recent events/activities for a GitLab project",
        inputSchema: zodToJsonSchema(GetProjectEventsSchema)
      },
      {
        name: "list_commits",
        description: "Get commit history for a GitLab project",
        inputSchema: zodToJsonSchema(ListCommitsSchema)
      },
      {
        name: "list_issues",
        description: "Get issues for a GitLab project",
        inputSchema: zodToJsonSchema(ListIssuesSchema)
      },
      {
        name: "list_merge_requests",
        description: "Get merge requests for a GitLab project",
        inputSchema: zodToJsonSchema(ListMergeRequestsSchema)
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    switch (request.params.name) {
      case "fork_repository": {
        const args = ForkRepositorySchema.parse(request.params.arguments);
        const fork = await forkProject(args.project_id, args.namespace);
        return { content: [{ type: "text", text: JSON.stringify(fork, null, 2) }] };
      }

      case "create_branch": {
        const args = CreateBranchSchema.parse(request.params.arguments);
        let ref = args.ref;
        if (!ref) {
          ref = await getDefaultBranchRef(args.project_id);
        }

        const branch = await createBranch(args.project_id, {
          name: args.branch,
          ref
        });

        return { content: [{ type: "text", text: JSON.stringify(branch, null, 2) }] };
      }

      case "search_repositories": {
        const args = SearchRepositoriesSchema.parse(request.params.arguments);
        const results = await searchProjects(args.search, args.page, args.per_page);
        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      }

      case "create_repository": {
        const args = CreateRepositorySchema.parse(request.params.arguments);
        const repository = await createRepository(args);
        return { content: [{ type: "text", text: JSON.stringify(repository, null, 2) }] };
      }

      case "get_file_contents": {
        const args = GetFileContentsSchema.parse(request.params.arguments);
        const contents = await getFileContents(args.project_id, args.file_path, args.ref);
        return { content: [{ type: "text", text: JSON.stringify(contents, null, 2) }] };
      }

      case "create_or_update_file": {
        const args = CreateOrUpdateFileSchema.parse(request.params.arguments);
        const result = await createOrUpdateFile(
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
            const result = await createOrUpdateFile(
              args.project_id,
              file.file_path,
              file.content,
              args.commit_message,
              args.branch
            );
            results.push(result);
          } catch (error) {
            console.error(`Error creating/updating file ${file.file_path}:`, error);
            throw error;
          }
        }
        
        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      }

      case "create_issue": {
        const args = CreateIssueSchema.parse(request.params.arguments);
        const { project_id, ...options } = args;
        const issue = await createIssue(project_id, options);
        return { content: [{ type: "text", text: JSON.stringify(issue, null, 2) }] };
      }

      case "create_merge_request": {
        const args = CreateMergeRequestSchema.parse(request.params.arguments);
        const { project_id, ...options } = args;
        const mergeRequest = await createMergeRequest(project_id, options);
        return { content: [{ type: "text", text: JSON.stringify(mergeRequest, null, 2) }] };
      }

      case "list_group_projects": {
        const args = ListGroupProjectsSchema.parse(request.params.arguments);
        const { group_id, ...options } = args;
        const results = await listGroupProjects(group_id, options);
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
        const events = await getProjectEvents(project_id, options);

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
        const commits = await listCommits(project_id, options);

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
          if (
            args[field as keyof typeof args] &&
            !isValidISODate(args[field as keyof typeof args] as string)
          ) {
            throw new Error(
              `${field} must be a valid ISO 8601 date (YYYY-MM-DDTHH:MM:SSZ)`
            );
          }
        });

        // Extract project_id and options
        const { project_id, ...options } = args;

        // Call the API function
        const issues = await listIssues(project_id, options);

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
          if (
            args[field as keyof typeof args] &&
            !isValidISODate(args[field as keyof typeof args] as string)
          ) {
            throw new Error(
              `${field} must be a valid ISO 8601 date (YYYY-MM-DDTHH:MM:SSZ)`
            );
          }
        });

        // Extract project_id and options
        const { project_id, ...options } = args;

        // Call the API function
        const mergeRequests = await listMergeRequests(project_id, options);

        // Format and return the response
        return formatMergeRequestsResponse(mergeRequests);
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid arguments: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GitLab MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});