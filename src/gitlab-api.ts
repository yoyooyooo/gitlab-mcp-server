import { z } from 'zod';
import fetch from "node-fetch";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
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
  GitLabEventsResponseSchema,
  GitLabCommitsResponseSchema,
  GitLabIssuesResponseSchema,
  GitLabMergeRequestsResponseSchema,
  CreateRepositoryOptionsSchema,
  CreateIssueOptionsSchema,
  CreateMergeRequestOptionsSchema,
  CreateBranchOptionsSchema,
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
  type GitLabEventsResponse,
  type GitLabCommitsResponse,
  type GitLabIssuesResponse,
  type GitLabMergeRequestsResponse,
  type FileOperation,
} from './schemas.js';

/**
 * GitLab API client configuration
 */
export interface GitLabApiConfig {
  apiUrl: string;
  token: string;
}

/**
 * GitLab API client for interacting with GitLab resources
 */
export class GitLabApi {
  private apiUrl: string;
  private token: string;

  constructor(config: GitLabApiConfig) {
    this.apiUrl = config.apiUrl;
    this.token = config.token;
  }

  /**
   * Forks a GitLab project to a specified namespace.
   *
   * @param projectId - The ID or URL-encoded path of the project to fork
   * @param namespace - Optional namespace to fork the project into
   * @returns A promise that resolves to the forked project details
   * @throws Will throw an error if the GitLab API request fails
   */
  async forkProject(
    projectId: string,
    namespace?: string
  ): Promise<GitLabFork> {
    const url = `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/fork`;
    const queryParams = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';

    const response = await fetch(url + queryParams, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    return GitLabForkSchema.parse(await response.json());
  }

  /**
   * Creates a new branch in a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Options for creating the branch, including name and ref
   * @returns A promise that resolves to the created branch details
   * @throws Will throw an error if the GitLab API request fails
   */
  async createBranch(
    projectId: string,
    options: z.infer<typeof CreateBranchOptionsSchema>
  ): Promise<GitLabReference> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/repository/branches`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          branch: options.name,
          ref: options.ref
        })
      }
    );

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    return GitLabReferenceSchema.parse(await response.json());
  }

  /**
   * Retrieves the default branch reference for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @returns A promise that resolves to the default branch reference
   * @throws Will throw an error if the GitLab API request fails
   */
  async getDefaultBranchRef(projectId: string): Promise<string> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}`,
      {
        headers: {
          "Authorization": `Bearer ${this.token}`
        }
      }
    );

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    const project = GitLabRepositorySchema.parse(await response.json());
    return project.default_branch;
  }

  /**
   * Retrieves the contents of a file from a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param filePath - The path of the file within the project
   * @param ref - The name of the branch, tag, or commit
   * @returns A promise that resolves to the file contents
   * @throws Will throw an error if the GitLab API request fails
   */
  async getFileContents(
    projectId: string,
    filePath: string,
    ref: string
  ): Promise<GitLabContent> {
    const encodedPath = encodeURIComponent(filePath);
    const url = `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/repository/files/${encodedPath}?ref=${encodeURIComponent(ref)}`;

    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    const data = GitLabContentSchema.parse(await response.json());
    
    if (!Array.isArray(data) && data.content) {
      data.content = Buffer.from(data.content, 'base64').toString('utf8');
    }

    return data;
  }

  /**
   * Creates or updates a file in a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param filePath - The path of the file within the project
   * @param content - The content of the file
   * @param commitMessage - The commit message for the change
   * @param branch - The branch to commit the change to
   * @param previousPath - Optional previous path if the file is being renamed
   * @returns A promise that resolves to the created or updated file details
   * @throws Will throw an error if the GitLab API request fails
   */
  async createOrUpdateFile(
    projectId: string,
    filePath: string,
    content: string,
    commitMessage: string,
    branch: string,
    previousPath?: string
  ): Promise<GitLabCreateUpdateFileResponse> {
    const encodedPath = encodeURIComponent(filePath);
    const url = `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/repository/files/${encodedPath}`;

    const body = {
      branch,
      content,
      commit_message: commitMessage,
      ...(previousPath ? { previous_path: previousPath } : {})
    };

    // Check if file exists
    let method = "POST";
    try {
      await this.getFileContents(projectId, filePath, branch);
      method = "PUT";
    } catch (error) {
      // File doesn't exist, use POST
    }

    const response = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    const responseData = await response.json() as Record<string, any>;
    return {
      file_path: filePath,
      branch: branch,
      commit_id: responseData.commit_id || responseData.id || "unknown",
      content: responseData.content
    };
  }

  /**
   * Creates a commit in a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param message - The commit message
   * @param branch - The branch to commit the changes to
   * @param actions - An array of file operations to include in the commit
   * @returns A promise that resolves to the created commit details
   * @throws Will throw an error if the GitLab API request fails
   */
  async createCommit(
    projectId: string,
    message: string,
    branch: string,
    actions: FileOperation[]
  ): Promise<GitLabCommit> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/repository/commits`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.token}`,
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
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    return GitLabCommitSchema.parse(await response.json());
  }

  /**
   * Searches for GitLab projects based on a query.
   *
   * @param query - The search query
   * @param page - The page number to retrieve (default is 1)
   * @param perPage - The number of results per page (default is 20)
   * @returns A promise that resolves to the search results
   * @throws Will throw an error if the GitLab API request fails
   */
  async searchProjects(
    query: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<GitLabSearchResponse> {
    const url = new URL(`${this.apiUrl}/projects`);
    url.searchParams.append("search", query);
    url.searchParams.append("page", page.toString());
    url.searchParams.append("per_page", perPage.toString());

    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    const projects = await response.json();
    return GitLabSearchResponseSchema.parse({
      count: parseInt(response.headers.get("X-Total") || "0"),
      items: projects
    });
  }

  /**
   * Lists all projects (repositories) within a specific GitLab group.
   *
   * @param groupId - The ID or URL-encoded path of the group
   * @param options - Optional parameters for filtering and pagination
   * @returns A promise that resolves to the list of group projects
   * @throws Will throw an error if the GitLab API request fails
   */
  async listGroupProjects(
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
    const url = new URL(`${this.apiUrl}/groups/${encodeURIComponent(groupId)}/projects`);
    
    // Add query parameters
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    const projects = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");
    
    return GitLabGroupProjectsResponseSchema.parse({
      count: totalCount,
      items: projects
    });
  }

  /**
   * Retrieves events for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Optional parameters for filtering and pagination
   * @returns A promise that resolves to the events response
   * @throws Will throw an error if the GitLab API request fails
   */
  async getProjectEvents(
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
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/events`
    );

    // Add query parameters for filtering and pagination
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
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
  }

  /**
   * Retrieves commits for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Optional parameters for filtering and pagination
   * @returns A promise that resolves to the commits response
   * @throws Will throw an error if the GitLab API request fails
   */
  async listCommits(
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
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(
        projectId
      )}/repository/commits`
    );

    // Add query parameters for filtering and pagination
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
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
  }

  /**
   * Retrieves issues for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Optional parameters for filtering and pagination
   * @returns A promise that resolves to the issues response
   * @throws Will throw an error if the GitLab API request fails
   */
  async listIssues(
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
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/issues`
    );

    // Add all query parameters except iid (we'll filter that client-side)
    Object.entries(apiOptions).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    // Parse the response JSON
    const issues = await response.json() as any[];

    // If iid is provided, filter the issues by iid
    const filteredIssues = iid !== undefined
      ? issues.filter(issue => issue.iid?.toString() === iid.toString())
      : issues;

    // Get the total count - if filtered, use the filtered length
    const totalCount = iid !== undefined ? filteredIssues.length : parseInt(response.headers.get("X-Total") || "0");

    // Validate and return the response
    return GitLabIssuesResponseSchema.parse({
      count: totalCount,
      items: filteredIssues,
    });
  }

  /**
   * Retrieves merge requests for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Optional parameters for filtering and pagination
   * @returns A promise that resolves to the merge requests response
   * @throws Will throw an error if the GitLab API request fails
   */
  async listMergeRequests(
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
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(
        projectId
      )}/merge_requests`
    );

    // Add all query parameters
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
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
  }

  /**
   * Creates a new issue in a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Options for creating the issue, including title, description, assignee IDs, milestone ID, and labels
   * @returns A promise that resolves to the created issue details
   * @throws Will throw an error if the GitLab API request fails
   */
  async createIssue(
    projectId: string,
    options: z.infer<typeof CreateIssueOptionsSchema>
  ): Promise<GitLabIssue> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/issues`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.token}`,
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
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    return GitLabIssueSchema.parse(await response.json());
  }

  /**
   * Creates a new merge request in a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Options for creating the merge request, including title, description, source branch, target branch, allow collaboration, and draft status
   * @returns A promise that resolves to the created merge request details
   * @throws Will throw an error if the GitLab API request fails
   */
  async createMergeRequest(
    projectId: string,
    options: z.infer<typeof CreateMergeRequestOptionsSchema>
  ): Promise<GitLabMergeRequest> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.token}`,
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
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    const responseData = await response.json() as Record<string, any>;
    
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

  /**
   * Creates a new repository in GitLab.
   *
   * @param options - Options for creating the repository, including name, description, visibility, and initialization with README
   * @returns A promise that resolves to the created repository details
   * @throws Will throw an error if the GitLab API request fails
   */
  async createRepository(
    options: z.infer<typeof CreateRepositoryOptionsSchema>
  ): Promise<GitLabRepository> {
    const response = await fetch(`${this.apiUrl}/projects`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.token}`,
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
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    return GitLabRepositorySchema.parse(await response.json());
  }
}