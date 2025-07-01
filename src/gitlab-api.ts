import { z } from 'zod';
import fetch from 'node-fetch';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
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
  GitLabWikiPageSchema,
  GitLabWikiPagesResponseSchema,
  GitLabWikiAttachmentSchema,
  GitLabMemberSchema,
  CreateRepositoryOptionsSchema,
  CreateIssueOptionsSchema,
  CreateMergeRequestOptionsSchema,
  CreateBranchOptionsSchema,
  WikiPageFormatEnum,
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
  type GitLabWikiPage,
  type GitLabWikiPagesResponse,
  type GitLabWikiAttachment,
  type WikiPageFormat,
  type FileOperation,
  type GitLabMember,
  GitLabMembersResponseSchema,
  type GitLabMembersResponse,
  GitLabNotesResponseSchema,
  type GitLabNotesResponse,
  GitLabDiscussionsResponseSchema,
  type GitLabDiscussionsResponse,
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
  async forkProject(projectId: string, namespace?: string): Promise<GitLabFork> {
    const url = `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/fork`;
    const queryParams = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';

    const response = await fetch(url + queryParams, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
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
  async createBranch(projectId: string, options: z.infer<typeof CreateBranchOptionsSchema>): Promise<GitLabReference> {
    const response = await fetch(`${this.apiUrl}/projects/${encodeURIComponent(projectId)}/repository/branches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        branch: options.name,
        ref: options.ref,
      }),
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
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
    const response = await fetch(`${this.apiUrl}/projects/${encodeURIComponent(projectId)}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
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
  async getFileContents(projectId: string, filePath: string, ref: string): Promise<GitLabContent> {
    const encodedPath = encodeURIComponent(filePath);
    const url = `${this.apiUrl}/projects/${encodeURIComponent(
      projectId
    )}/repository/files/${encodedPath}?ref=${encodeURIComponent(ref)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
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
      ...(previousPath ? { previous_path: previousPath } : {}),
    };

    // Check if file exists
    let method = 'POST';
    try {
      await this.getFileContents(projectId, filePath, branch);
      method = 'PUT';
    } catch (error) {
      // File doesn't exist, use POST
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const responseData = (await response.json()) as Record<string, any>;
    return {
      file_path: filePath,
      branch: branch,
      commit_id: responseData.commit_id || responseData.id || 'unknown',
      content: responseData.content,
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
    const response = await fetch(`${this.apiUrl}/projects/${encodeURIComponent(projectId)}/repository/commits`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        branch,
        commit_message: message,
        actions: actions.map((action) => ({
          action: 'create',
          file_path: action.path,
          content: action.content,
        })),
      }),
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
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
  async searchProjects(query: string, page: number = 1, perPage: number = 20): Promise<GitLabSearchResponse> {
    const url = new URL(`${this.apiUrl}/projects`);
    url.searchParams.append('search', query);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('per_page', perPage.toString());

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const projects = await response.json();
    return GitLabSearchResponseSchema.parse({
      count: parseInt(response.headers.get('X-Total') || '0'),
      items: projects,
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
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const projects = await response.json();
    const totalCount = parseInt(response.headers.get('X-Total') || '0');

    return GitLabGroupProjectsResponseSchema.parse({
      count: totalCount,
      items: projects,
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
      sort?: 'asc' | 'desc';
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabEventsResponse> {
    const url = new URL(`${this.apiUrl}/projects/${encodeURIComponent(projectId)}/events`);

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
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    const events = await response.json();

    // Get the total count from the headers
    const totalCount = parseInt(response.headers.get('X-Total') || '0');

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
    const url = new URL(`${this.apiUrl}/projects/${encodeURIComponent(projectId)}/repository/commits`);

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
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    const commits = await response.json();

    // Get the total count from the headers
    const totalCount = parseInt(response.headers.get('X-Total') || '0');

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
      state?: 'opened' | 'closed' | 'all';
      labels?: string;
      milestone?: string;
      scope?: 'created_by_me' | 'assigned_to_me' | 'all';
      author_id?: number;
      assignee_id?: number;
      search?: string;
      created_after?: string;
      created_before?: string;
      updated_after?: string;
      updated_before?: string;
      order_by?: string;
      sort?: 'asc' | 'desc';
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabIssuesResponse> {
    // Extract iid for client-side filtering if provided
    const { iid, ...apiOptions } = options;

    // Construct the URL with the project ID
    const url = new URL(`${this.apiUrl}/projects/${encodeURIComponent(projectId)}/issues`);

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
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    const issues = (await response.json()) as any[];

    // If iid is provided, filter the issues by iid
    const filteredIssues =
      iid !== undefined ? issues.filter((issue) => issue.iid?.toString() === iid.toString()) : issues;

    // Get the total count - if filtered, use the filtered length
    const totalCount = iid !== undefined ? filteredIssues.length : parseInt(response.headers.get('X-Total') || '0');

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
      state?: 'opened' | 'closed' | 'locked' | 'merged' | 'all';
      order_by?: 'created_at' | 'updated_at';
      sort?: 'asc' | 'desc';
      milestone?: string;
      labels?: string;
      created_after?: string;
      created_before?: string;
      updated_after?: string;
      updated_before?: string;
      scope?: 'created_by_me' | 'assigned_to_me' | 'all';
      author_id?: number;
      assignee_id?: number;
      search?: string;
      source_branch?: string;
      target_branch?: string;
      wip?: 'yes' | 'no';
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabMergeRequestsResponse> {
    const url = new URL(`${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests`);

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
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    const mergeRequests = await response.json();

    // Get the total count from the headers
    const totalCount = parseInt(response.headers.get('X-Total') || '0');

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
  async createIssue(projectId: string, options: z.infer<typeof CreateIssueOptionsSchema>): Promise<GitLabIssue> {
    const response = await fetch(`${this.apiUrl}/projects/${encodeURIComponent(projectId)}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: options.title,
        description: options.description,
        assignee_ids: options.assignee_ids,
        milestone_id: options.milestone_id,
        labels: options.labels?.join(','),
      }),
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
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
    const response = await fetch(`${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: options.title,
        description: options.description,
        source_branch: options.source_branch,
        target_branch: options.target_branch,
        allow_collaboration: options.allow_collaboration,
        draft: options.draft,
      }),
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const responseData = (await response.json()) as Record<string, any>;

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
      merge_commit_sha: responseData.merge_commit_sha,
    };
  }

  /**
   * Creates a new repository in GitLab.
   *
   * @param options - Options for creating the repository, including name, description, visibility, and initialization with README
   * @returns A promise that resolves to the created repository details
   * @throws Will throw an error if the GitLab API request fails
   */
  async createRepository(options: z.infer<typeof CreateRepositoryOptionsSchema>): Promise<GitLabRepository> {
    const response = await fetch(`${this.apiUrl}/projects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: options.name,
        description: options.description,
        visibility: options.visibility,
        initialize_with_readme: options.initialize_with_readme,
      }),
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabRepositorySchema.parse(await response.json());
  }

  /**
   * Lists all wiki pages for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Optional parameters for the request
   * @returns A promise that resolves to the wiki pages response
   * @throws Will throw an error if the GitLab API request fails
   */
  async listProjectWikiPages(
    projectId: string,
    options: {
      with_content?: boolean;
    } = {}
  ): Promise<GitLabWikiPagesResponse> {
    const url = new URL(`${this.apiUrl}/projects/${encodeURIComponent(projectId)}/wikis`);

    // Add query parameters
    if (options.with_content) {
      url.searchParams.append('with_content', 'true');
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    const wikiPages = (await response.json()) as any[];

    // Validate and return the response
    return GitLabWikiPagesResponseSchema.parse({
      count: wikiPages.length,
      items: wikiPages,
    });
  }

  /**
   * Gets a specific wiki page for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param slug - The slug of the wiki page
   * @param options - Optional parameters for the request
   * @returns A promise that resolves to the wiki page
   * @throws Will throw an error if the GitLab API request fails
   */
  async getProjectWikiPage(
    projectId: string,
    slug: string,
    options: {
      render_html?: boolean;
      version?: string;
    } = {}
  ): Promise<GitLabWikiPage> {
    const url = new URL(`${this.apiUrl}/projects/${encodeURIComponent(projectId)}/wikis/${encodeURIComponent(slug)}`);

    // Add query parameters
    if (options.render_html) {
      url.searchParams.append('render_html', 'true');
    }
    if (options.version) {
      url.searchParams.append('version', options.version);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    const wikiPage = await response.json();

    // Validate and return the response
    return GitLabWikiPageSchema.parse(wikiPage);
  }

  /**
   * Creates a new wiki page for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Options for creating the wiki page
   * @returns A promise that resolves to the created wiki page
   * @throws Will throw an error if the GitLab API request fails
   */
  async createProjectWikiPage(
    projectId: string,
    options: {
      title: string;
      content: string;
      format?: WikiPageFormat;
    }
  ): Promise<GitLabWikiPage> {
    const response = await fetch(`${this.apiUrl}/projects/${encodeURIComponent(projectId)}/wikis`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: options.title,
        content: options.content,
        format: options.format || 'markdown',
      }),
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    const wikiPage = await response.json();

    // Validate and return the response
    return GitLabWikiPageSchema.parse(wikiPage);
  }

  /**
   * Edits an existing wiki page for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param slug - The slug of the wiki page
   * @param options - Options for editing the wiki page
   * @returns A promise that resolves to the edited wiki page
   * @throws Will throw an error if the GitLab API request fails
   */
  async editProjectWikiPage(
    projectId: string,
    slug: string,
    options: {
      title?: string;
      content?: string;
      format?: WikiPageFormat;
    }
  ): Promise<GitLabWikiPage> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/wikis/${encodeURIComponent(slug)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: options.title,
          content: options.content,
          format: options.format,
        }),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    const wikiPage = await response.json();

    // Validate and return the response
    return GitLabWikiPageSchema.parse(wikiPage);
  }

  /**
   * Deletes a wiki page from a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param slug - The slug of the wiki page
   * @returns A promise that resolves when the wiki page is deleted
   * @throws Will throw an error if the GitLab API request fails
   */
  async deleteProjectWikiPage(projectId: string, slug: string): Promise<void> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/wikis/${encodeURIComponent(slug)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }
  }

  /**
   * Uploads an attachment to a GitLab project wiki.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Options for uploading the attachment
   * @returns A promise that resolves to the uploaded attachment details
   * @throws Will throw an error if the GitLab API request fails
   */
  async uploadProjectWikiAttachment(
    projectId: string,
    options: {
      file_path: string;
      content: string;
      branch?: string;
    }
  ): Promise<GitLabWikiAttachment> {
    // Convert content to base64 if it's not already
    const content = options.content.startsWith('data:')
      ? options.content
      : `data:application/octet-stream;base64,${Buffer.from(options.content).toString('base64')}`;

    const response = await fetch(`${this.apiUrl}/projects/${encodeURIComponent(projectId)}/wikis/attachments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_name: options.file_path.split('/').pop(),
        file_path: options.file_path,
        content: content,
        branch: options.branch,
      }),
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    const attachment = await response.json();

    // Validate and return the response
    return GitLabWikiAttachmentSchema.parse(attachment);
  }

  /**
   * Lists all wiki pages for a GitLab group.
   *
   * @param groupId - The ID or URL-encoded path of the group
   * @param options - Optional parameters for the request
   * @returns A promise that resolves to the wiki pages response
   * @throws Will throw an error if the GitLab API request fails
   */
  async listGroupWikiPages(
    groupId: string,
    options: {
      with_content?: boolean;
    } = {}
  ): Promise<GitLabWikiPagesResponse> {
    const url = new URL(`${this.apiUrl}/groups/${encodeURIComponent(groupId)}/wikis`);

    // Add query parameters
    if (options.with_content) {
      url.searchParams.append('with_content', 'true');
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    const wikiPages = (await response.json()) as any[];

    // Validate and return the response
    return GitLabWikiPagesResponseSchema.parse({
      count: wikiPages.length,
      items: wikiPages,
    });
  }

  /**
   * Gets a specific wiki page for a GitLab group.
   *
   * @param groupId - The ID or URL-encoded path of the group
   * @param slug - The slug of the wiki page
   * @param options - Optional parameters for the request
   * @returns A promise that resolves to the wiki page
   * @throws Will throw an error if the GitLab API request fails
   */
  async getGroupWikiPage(
    groupId: string,
    slug: string,
    options: {
      render_html?: boolean;
      version?: string;
    } = {}
  ): Promise<GitLabWikiPage> {
    const url = new URL(`${this.apiUrl}/groups/${encodeURIComponent(groupId)}/wikis/${encodeURIComponent(slug)}`);

    // Add query parameters
    if (options.render_html) {
      url.searchParams.append('render_html', 'true');
    }
    if (options.version) {
      url.searchParams.append('version', options.version);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    const wikiPage = await response.json();

    // Validate and return the response
    return GitLabWikiPageSchema.parse(wikiPage);
  }

  /**
   * Creates a new wiki page for a GitLab group.
   *
   * @param groupId - The ID or URL-encoded path of the group
   * @param options - Options for creating the wiki page
   * @returns A promise that resolves to the created wiki page
   * @throws Will throw an error if the GitLab API request fails
   */
  async createGroupWikiPage(
    groupId: string,
    options: {
      title: string;
      content: string;
      format?: WikiPageFormat;
    }
  ): Promise<GitLabWikiPage> {
    const response = await fetch(`${this.apiUrl}/groups/${encodeURIComponent(groupId)}/wikis`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: options.title,
        content: options.content,
        format: options.format || 'markdown',
      }),
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    const wikiPage = await response.json();

    // Validate and return the response
    return GitLabWikiPageSchema.parse(wikiPage);
  }

  /**
   * Edits an existing wiki page for a GitLab group.
   *
   * @param groupId - The ID or URL-encoded path of the group
   * @param slug - The slug of the wiki page
   * @param options - Options for editing the wiki page
   * @returns A promise that resolves to the edited wiki page
   * @throws Will throw an error if the GitLab API request fails
   */
  async editGroupWikiPage(
    groupId: string,
    slug: string,
    options: {
      title?: string;
      content?: string;
      format?: WikiPageFormat;
    }
  ): Promise<GitLabWikiPage> {
    const response = await fetch(
      `${this.apiUrl}/groups/${encodeURIComponent(groupId)}/wikis/${encodeURIComponent(slug)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: options.title,
          content: options.content,
          format: options.format,
        }),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    const wikiPage = await response.json();

    // Validate and return the response
    return GitLabWikiPageSchema.parse(wikiPage);
  }

  /**
   * Deletes a wiki page from a GitLab group.
   *
   * @param groupId - The ID or URL-encoded path of the group
   * @param slug - The slug of the wiki page
   * @returns A promise that resolves when the wiki page is deleted
   * @throws Will throw an error if the GitLab API request fails
   */
  async deleteGroupWikiPage(groupId: string, slug: string): Promise<void> {
    const response = await fetch(
      `${this.apiUrl}/groups/${encodeURIComponent(groupId)}/wikis/${encodeURIComponent(slug)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }
  }

  /**
   * Uploads an attachment to a GitLab group wiki.
   *
   * @param groupId - The ID or URL-encoded path of the group
   * @param options - Options for uploading the attachment
   * @returns A promise that resolves to the uploaded attachment details
   * @throws Will throw an error if the GitLab API request fails
   */
  async uploadGroupWikiAttachment(
    groupId: string,
    options: {
      file_path: string;
      content: string;
      branch?: string;
    }
  ): Promise<GitLabWikiAttachment> {
    // Convert content to base64 if it's not already
    const content = options.content.startsWith('data:')
      ? options.content
      : `data:application/octet-stream;base64,${Buffer.from(options.content).toString('base64')}`;

    const response = await fetch(`${this.apiUrl}/groups/${encodeURIComponent(groupId)}/wikis/attachments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_name: options.file_path.split('/').pop(),
        file_path: options.file_path,
        content: content,
        branch: options.branch,
      }),
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    // Parse the response JSON
    const attachment = await response.json();

    // Validate and return the response
    return GitLabWikiAttachmentSchema.parse(attachment);
  }

  /**
   * Lists members of a GitLab project (including inherited members).
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Options for listing members
   * @returns A promise that resolves to the members response
   * @throws Will throw an error if the GitLab API request fails
   */
  async listProjectMembers(
    projectId: string,
    options: {
      query?: string;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabMembersResponse> {
    const url = new URL(`${this.apiUrl}/projects/${encodeURIComponent(projectId)}/members/all`);

    // Add query parameters
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
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const data = await response.json();
    const totalCount = parseInt(response.headers.get('X-Total') || '0');

    return GitLabMembersResponseSchema.parse({
      count: totalCount,
      items: data,
    });
  }

  /**
   * Lists members of a GitLab group (including inherited members).
   *
   * @param groupId - The ID or URL-encoded path of the group
   * @param options - Options for listing members
   * @returns A promise that resolves to the members response
   * @throws Will throw an error if the GitLab API request fails
   */
  async listGroupMembers(
    groupId: string,
    options: {
      query?: string;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabMembersResponse> {
    const url = new URL(`${this.apiUrl}/groups/${encodeURIComponent(groupId)}/members/all`);

    // Add query parameters
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
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const data = await response.json();
    const totalCount = parseInt(response.headers.get('X-Total') || '0');

    return GitLabMembersResponseSchema.parse({
      count: totalCount,
      items: data,
    });
  }

  /**
   * Retrieves notes for a GitLab issue.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param issueIid - The internal ID of the issue
   * @param options - Optional parameters for filtering and pagination
   * @returns A promise that resolves to the notes response
   * @throws Will throw an error if the GitLab API request fails
   */
  async getIssueNotes(
    projectId: string,
    issueIid: number,
    options: {
      sort?: 'asc' | 'desc';
      order_by?: 'created_at' | 'updated_at';
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabNotesResponse> {
    const url = new URL(`${this.apiUrl}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/notes`);

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
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 404) {
        errorMessage = `Issue not found: Project ID ${projectId}, Issue IID ${issueIid}`;
      } else if (response.status === 403) {
        errorMessage = `Permission denied to access issue notes`;
      } else if (response.status === 429) {
        errorMessage = `GitLab API rate limit exceeded`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    // Parse the response JSON
    const notes = await response.json();

    // Get the total count from the headers
    const totalCount = parseInt(response.headers.get('X-Total') || '0');

    // Validate and return the response
    return GitLabNotesResponseSchema.parse({
      count: totalCount,
      items: notes,
    });
  }

  /**
   * Retrieves discussions for a GitLab issue.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param issueIid - The internal ID of the issue
   * @param options - Optional parameters for pagination
   * @returns A promise that resolves to the discussions response
   * @throws Will throw an error if the GitLab API request fails
   */
  async getIssueDiscussions(
    projectId: string,
    issueIid: number,
    options: {
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabDiscussionsResponse> {
    const url = new URL(`${this.apiUrl}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/discussions`);

    // Add query parameters for pagination
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
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 404) {
        errorMessage = `Issue not found: Project ID ${projectId}, Issue IID ${issueIid}`;
      } else if (response.status === 403) {
        errorMessage = `Permission denied to access issue discussions`;
      } else if (response.status === 429) {
        errorMessage = `GitLab API rate limit exceeded`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    // Parse the response JSON
    const discussions = await response.json();

    // Get the total count from the headers
    const totalCount = parseInt(response.headers.get('X-Total') || '0');

    // Validate and return the response
    return GitLabDiscussionsResponseSchema.parse({
      count: totalCount,
      items: discussions,
    });
  }

  /**
   * Gets detailed information about a specific merge request.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param mergeRequestIid - The internal ID of the merge request
   * @returns A promise that resolves to the merge request details
   * @throws Will throw an error if the GitLab API request fails
   */
  async getMergeRequestDetails(projectId: string | number, mergeRequestIid: number): Promise<GitLabMergeRequest> {
    const url = `${this.apiUrl}/projects/${encodeURIComponent(String(projectId))}/merge_requests/${mergeRequestIid}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 404) {
        errorMessage = `Merge request not found: Project ID ${projectId}, MR IID ${mergeRequestIid}`;
      } else if (response.status === 403) {
        errorMessage = `Permission denied to access merge request`;
      } else if (response.status === 429) {
        errorMessage = `GitLab API rate limit exceeded`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    // Parse the response JSON
    const mergeRequest = await response.json();

    // Validate and return the response
    return GitLabMergeRequestSchema.parse(mergeRequest);
  }

  /**
   * Lists all open merge requests in a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @returns A promise that resolves to the open merge requests
   * @throws Will throw an error if the GitLab API request fails
   */
  async listOpenMergeRequests(projectId: string | number): Promise<GitLabMergeRequestsResponse> {
    const url = new URL(`${this.apiUrl}/projects/${encodeURIComponent(String(projectId))}/merge_requests`);
    url.searchParams.append('state', 'opened');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 404) {
        errorMessage = `Project not found: Project ID ${projectId}`;
      } else if (response.status === 403) {
        errorMessage = `Permission denied to access project merge requests`;
      } else if (response.status === 429) {
        errorMessage = `GitLab API rate limit exceeded`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    const mergeRequests = await response.json();
    const totalCount = parseInt(response.headers.get('X-Total') || '0');

    return GitLabMergeRequestsResponseSchema.parse({
      count: totalCount,
      items: mergeRequests,
    });
  }

  /**
   * Retrieves comments/discussions for a GitLab merge request.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param mergeRequestIid - The internal ID of the merge request
   * @returns A promise that resolves to the merge request discussions
   * @throws Will throw an error if the GitLab API request fails
   */
  async getMergeRequestComments(projectId: string | number, mergeRequestIid: number): Promise<any> {
    const url = `${this.apiUrl}/projects/${encodeURIComponent(
      String(projectId)
    )}/merge_requests/${mergeRequestIid}/discussions`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 404) {
        errorMessage = `Merge request not found: Project ID ${projectId}, MR IID ${mergeRequestIid}`;
      } else if (response.status === 403) {
        errorMessage = `Permission denied to access merge request discussions`;
      } else if (response.status === 429) {
        errorMessage = `GitLab API rate limit exceeded`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    const discussions = (await response.json()) as Array<any>;
    return {
      count: discussions.length,
      items: discussions,
    };
  }

  /**
   * Adds a general comment to a GitLab merge request.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param mergeRequestIid - The internal ID of the merge request
   * @param comment - The comment text
   * @returns A promise that resolves to the created comment
   * @throws Will throw an error if the GitLab API request fails
   */
  async addMergeRequestComment(projectId: string | number, mergeRequestIid: number, comment: string): Promise<any> {
    const url = `${this.apiUrl}/projects/${encodeURIComponent(
      String(projectId)
    )}/merge_requests/${mergeRequestIid}/discussions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: comment,
      }),
    });

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 404) {
        errorMessage = `Merge request not found: Project ID ${projectId}, MR IID ${mergeRequestIid}`;
      } else if (response.status === 403) {
        errorMessage = `Permission denied to add comments to merge request`;
      } else if (response.status === 429) {
        errorMessage = `GitLab API rate limit exceeded`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    return await response.json();
  }

  /**
   * Adds a comment to a specific line in a file diff of a GitLab merge request.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param mergeRequestIid - The internal ID of the merge request
   * @param options - Options for the diff comment
   * @returns A promise that resolves to the created comment
   * @throws Will throw an error if the GitLab API request fails
   */
  async addMergeRequestDiffComment(
    projectId: string | number,
    mergeRequestIid: number,
    options: {
      comment: string;
      base_sha: string;
      start_sha: string;
      head_sha: string;
      file_path: string;
      line_number: number | string;
    }
  ): Promise<any> {
    const url = `${this.apiUrl}/projects/${encodeURIComponent(
      String(projectId)
    )}/merge_requests/${mergeRequestIid}/discussions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: options.comment,
        position: {
          base_sha: options.base_sha,
          start_sha: options.start_sha,
          head_sha: options.head_sha,
          old_path: options.file_path,
          new_path: options.file_path,
          position_type: 'text',
          new_line: options.line_number,
        },
      }),
    });

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 404) {
        errorMessage = `Merge request not found: Project ID ${projectId}, MR IID ${mergeRequestIid}`;
      } else if (response.status === 403) {
        errorMessage = `Permission denied to add diff comments to merge request`;
      } else if (response.status === 429) {
        errorMessage = `GitLab API rate limit exceeded`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    return await response.json();
  }

  /**
   * Gets the file diffs of a GitLab merge request.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param mergeRequestIid - The internal ID of the merge request
   * @returns A promise that resolves to the merge request diffs
   * @throws Will throw an error if the GitLab API request fails
   */
  async getMergeRequestDiff(projectId: string | number, mergeRequestIid: number): Promise<any> {
    const url = `${this.apiUrl}/projects/${encodeURIComponent(
      String(projectId)
    )}/merge_requests/${mergeRequestIid}/diffs`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 404) {
        errorMessage = `Merge request not found: Project ID ${projectId}, MR IID ${mergeRequestIid}`;
      } else if (response.status === 403) {
        errorMessage = `Permission denied to access merge request diffs`;
      } else if (response.status === 429) {
        errorMessage = `GitLab API rate limit exceeded`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    return await response.json();
  }

  /**
   * Gets detailed information about a specific issue in a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param issueIid - The internal ID of the issue
   * @returns A promise that resolves to the issue details
   * @throws Will throw an error if the GitLab API request fails
   */
  async getIssueDetails(projectId: string | number, issueIid: number): Promise<GitLabIssue> {
    const url = `${this.apiUrl}/projects/${encodeURIComponent(String(projectId))}/issues/${issueIid}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 404) {
        errorMessage = `Issue not found: Project ID ${projectId}, Issue IID ${issueIid}`;
      } else if (response.status === 403) {
        errorMessage = `Permission denied to access issue`;
      } else if (response.status === 429) {
        errorMessage = `GitLab API rate limit exceeded`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    const issue = await response.json();
    return GitLabIssueSchema.parse(issue);
  }
}
