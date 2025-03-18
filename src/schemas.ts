import { z } from 'zod';

// Event-related schemas
export const GitLabEventAuthorSchema = z.object({
  id: z.number(),
  name: z.string(),
  username: z.string(),
  avatar_url: z.string(),
  email: z.string().optional(),
  web_url: z.string(),
});

export const GitLabEventDataSchema = z
  .object({
    id: z.number().optional(),
    iid: z.number().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    state: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    action: z.string().optional(),
    source_branch: z.string().optional(),
    target_branch: z.string().optional(),
    commit_title: z.string().optional(),
    commit_id: z.string().optional(),
    sha: z.string().optional(),
    message: z.string().optional(),
    ref: z.string().optional(),
    ref_type: z.string().optional(),
    web_url: z.string().optional(),
  })
  .passthrough(); // Allow additional properties as GitLab event data varies by type

export const GitLabEventSchema = z.object({
  id: z.number(),
  project_id: z.number(),
  action_name: z.string(),
  target_id: z.number().nullable(),
  target_type: z.string().nullable(),
  author: GitLabEventAuthorSchema,
  target_title: z.string().nullable(),
  created_at: z.string(),
  note: z.object({}).passthrough().nullable().optional(),
  push_data: z
    .object({
      commit_count: z.number().optional(),
      action: z.string().optional(),
      ref_type: z.string().optional(),
      commit_from: z.string().nullable().optional(),
      commit_to: z.string().nullable().optional(),
      ref: z.string().optional(),
      commit_title: z.string().optional(),
    })
    .nullable()
    .optional(),
  author_username: z.string(),
});

export const GitLabEventsResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabEventSchema),
});

// Base schemas for common types
export const GitLabAuthorSchema = z.object({
  name: z.string(),
  email: z.string(),
  date: z.string()
});

// Repository related schemas
export const GitLabOwnerSchema = z.object({
  username: z.string(), // Changed from login to match GitLab API
  id: z.number(),
  avatar_url: z.string(),
  web_url: z.string(), // Changed from html_url to match GitLab API
  name: z.string(), // Added as GitLab includes full name
  state: z.string() // Added as GitLab includes user state
});

export const GitLabRepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  path_with_namespace: z.string(), // Changed from full_name to match GitLab API
  visibility: z.string(), // Changed from private to match GitLab API
  owner: GitLabOwnerSchema.optional(),
  web_url: z.string(), // Changed from html_url to match GitLab API
  description: z.string().nullable(),
  fork: z.boolean().optional(),
  ssh_url_to_repo: z.string(), // Changed from ssh_url to match GitLab API
  http_url_to_repo: z.string(), // Changed from clone_url to match GitLab API
  created_at: z.string(),
  last_activity_at: z.string(), // Changed from updated_at to match GitLab API
  default_branch: z.string()
});

// File content schemas
export const GitLabFileContentSchema = z.object({
  file_name: z.string(), // Changed from name to match GitLab API
  file_path: z.string(), // Changed from path to match GitLab API
  size: z.number(),
  encoding: z.string(),
  content: z.string(),
  content_sha256: z.string(), // Changed from sha to match GitLab API
  ref: z.string(), // Added as GitLab requires branch reference
  blob_id: z.string(), // Added to match GitLab API
  last_commit_id: z.string() // Added to match GitLab API
});

export const GitLabDirectoryContentSchema = z.object({
  name: z.string(),
  path: z.string(),
  type: z.string(),
  mode: z.string(),
  id: z.string(), // Changed from sha to match GitLab API
  web_url: z.string() // Changed from html_url to match GitLab API
});

export const GitLabContentSchema = z.union([
  GitLabFileContentSchema,
  z.array(GitLabDirectoryContentSchema)
]);

// Operation schemas
export const FileOperationSchema = z.object({
  path: z.string(),
  content: z.string()
});

// Tree and commit schemas
export const GitLabTreeEntrySchema = z.object({
  id: z.string(), // Changed from sha to match GitLab API
  name: z.string(),
  type: z.enum(['blob', 'tree']),
  path: z.string(),
  mode: z.string()
});

export const GitLabTreeSchema = z.object({
  id: z.string(), // Changed from sha to match GitLab API
  tree: z.array(GitLabTreeEntrySchema)
});

export const GitLabCommitSchema = z.object({
  id: z.string(), // The commit SHA
  short_id: z.string(), // Shortened commit SHA
  title: z.string(), // First line of the commit message
  message: z.string().optional(), // Full commit message
  author_name: z.string(),
  author_email: z.string(),
  authored_date: z.string(), // ISO 8601 formatted date
  committer_name: z.string(),
  committer_email: z.string(),
  committed_date: z.string(), // ISO 8601 formatted date
  created_at: z.string().optional(), // ISO 8601 formatted date
  web_url: z.string(), // URL to view the commit
  parent_ids: z.array(z.string()), // Array of parent commit SHAs
  stats: z
    .object({
      additions: z.number(),
      deletions: z.number(),
      total: z.number(),
    })
    .optional(), // Only present when with_stats=true
});

// Define the response schema for the list_commits tool
export const GitLabCommitsResponseSchema = z.object({
  count: z.number(), // Total number of commits
  items: z.array(GitLabCommitSchema),
});

// Reference schema
export const GitLabReferenceSchema = z.object({
  name: z.string(), // Changed from ref to match GitLab API
  commit: z.object({
    id: z.string(), // Changed from sha to match GitLab API
    web_url: z.string() // Changed from url to match GitLab API
  })
});

// Input schemas for operations
export const CreateRepositoryOptionsSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  visibility: z.enum(['private', 'internal', 'public']).optional(), // Changed from private to match GitLab API
  initialize_with_readme: z.boolean().optional() // Changed from auto_init to match GitLab API
});

export const CreateIssueOptionsSchema = z.object({
  title: z.string(),
  description: z.string().optional(), // Changed from body to match GitLab API
  assignee_ids: z.array(z.number()).optional(), // Changed from assignees to match GitLab API
  milestone_id: z.number().optional(), // Changed from milestone to match GitLab API
  labels: z.array(z.string()).optional()
});

export const CreateMergeRequestOptionsSchema = z.object({ // Changed from CreatePullRequestOptionsSchema
  title: z.string(),
  description: z.string().optional(), // Changed from body to match GitLab API
  source_branch: z.string(), // Changed from head to match GitLab API
  target_branch: z.string(), // Changed from base to match GitLab API
  allow_collaboration: z.boolean().optional(), // Changed from maintainer_can_modify to match GitLab API
  draft: z.boolean().optional()
});

export const CreateBranchOptionsSchema = z.object({
  name: z.string(), // Changed from ref to match GitLab API
  ref: z.string() // The source branch/commit for the new branch
});

// Response schemas for operations
export const GitLabCreateUpdateFileResponseSchema = z.object({
  file_path: z.string(),
  branch: z.string(),
  commit_id: z.string(), // Changed from sha to match GitLab API
  content: GitLabFileContentSchema.optional()
});

// Create a more flexible schema for group projects
export const GitLabGroupProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  path_with_namespace: z.string(),
  visibility: z.string(),
  web_url: z.string(),
  description: z.string().nullable(),
  created_at: z.string(),
  last_activity_at: z.string(),
  default_branch: z.string(),
  // Make owner and fork optional since they might not be present in group projects
  owner: GitLabOwnerSchema.optional(),
  fork: z.boolean().optional(),
  ssh_url_to_repo: z.string().optional(),
  http_url_to_repo: z.string().optional()
});

export const GitLabSearchResponseSchema = z.object({
  count: z.number(), // Changed from total_count to match GitLab API
  items: z.array(GitLabRepositorySchema)
});

export const GitLabGroupProjectsResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabGroupProjectSchema)
});

// Fork related schemas
export const GitLabForkParentSchema = z.object({
  name: z.string(),
  path_with_namespace: z.string(), // Changed from full_name to match GitLab API
  owner: z.object({
    username: z.string(), // Changed from login to match GitLab API
    id: z.number(),
    avatar_url: z.string()
  }),
  web_url: z.string() // Changed from html_url to match GitLab API
});

export const GitLabForkSchema = GitLabRepositorySchema.extend({
  forked_from_project: GitLabForkParentSchema // Changed from parent to match GitLab API
});

// Issue related schemas
export const GitLabLabelSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
  description: z.string().optional()
});

export const GitLabUserSchema = z.object({
  username: z.string(), // Changed from login to match GitLab API
  id: z.number(),
  name: z.string(),
  avatar_url: z.string(),
  web_url: z.string() // Changed from html_url to match GitLab API
});

export const GitLabMilestoneSchema = z.object({
  id: z.number(),
  iid: z.number(), // Added to match GitLab API
  title: z.string(),
  description: z.string(),
  state: z.string(),
  web_url: z.string() // Changed from html_url to match GitLab API
});

export const GitLabIssueSchema = z.object({
  id: z.number(),
  iid: z.number(), // Added to match GitLab API
  project_id: z.number(), // Added to match GitLab API
  title: z.string(),
  description: z.string(), // Changed from body to match GitLab API
  state: z.string(),
  author: GitLabUserSchema,
  assignees: z.array(GitLabUserSchema),
  labels: z.union([
    z.array(GitLabLabelSchema),
    z.array(z.string())
  ]),
  milestone: GitLabMilestoneSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  web_url: z.string() // Changed from html_url to match GitLab API
});

// Merge Request related schemas (equivalent to Pull Request)
export const GitLabMergeRequestDiffRefSchema = z.object({
  base_sha: z.string(),
  head_sha: z.string(),
  start_sha: z.string()
});

export const GitLabMergeRequestSchema = z.object({
  id: z.number(),
  iid: z.number(), // Added to match GitLab API
  project_id: z.number(), // Added to match GitLab API
  title: z.string(),
  description: z.string(), // Changed from body to match GitLab API
  state: z.string(),
  merged: z.boolean().optional(),
  author: GitLabUserSchema,
  assignees: z.array(GitLabUserSchema),
  source_branch: z.string(), // Changed from head to match GitLab API
  target_branch: z.string(), // Changed from base to match GitLab API
  diff_refs: GitLabMergeRequestDiffRefSchema.optional(),
  web_url: z.string(), // Changed from html_url to match GitLab API
  created_at: z.string(),
  updated_at: z.string(),
  merged_at: z.string().nullable(),
  closed_at: z.string().nullable(),
  merge_commit_sha: z.string().nullable()
});

// API Operation Parameter Schemas
const ProjectParamsSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path") // Changed from owner/repo to match GitLab API
});

export const CreateOrUpdateFileSchema = ProjectParamsSchema.extend({
  file_path: z.string().describe("Path where to create/update the file"),
  content: z.string().describe("Content of the file"),
  commit_message: z.string().describe("Commit message"),
  branch: z.string().describe("Branch to create/update the file in"),
  previous_path: z.string().optional()
    .describe("Path of the file to move/rename")
});

export const SearchRepositoriesSchema = z.object({
  search: z.string().describe("Search query"), // Changed from query to match GitLab API
  page: z.number().optional().describe("Page number for pagination (default: 1)"),
  per_page: z.number().optional().describe("Number of results per page (default: 20)")
});

export const CreateRepositorySchema = z.object({
  name: z.string().describe("Repository name"),
  description: z.string().optional().describe("Repository description"),
  visibility: z.enum(['private', 'internal', 'public']).optional()
    .describe("Repository visibility level"),
  initialize_with_readme: z.boolean().optional()
    .describe("Initialize with README.md")
});

export const GetFileContentsSchema = ProjectParamsSchema.extend({
  file_path: z.string().describe("Path to the file or directory"),
  ref: z.string().describe("Branch/tag/commit to get contents from")
});

export const PushFilesSchema = ProjectParamsSchema.extend({
  branch: z.string().describe("Branch to push to"),
  files: z.array(z.object({
    file_path: z.string().describe("Path where to create the file"),
    content: z.string().describe("Content of the file")
  })).describe("Array of files to push"),
  commit_message: z.string().describe("Commit message")
});

export const CreateIssueSchema = ProjectParamsSchema.extend({
  title: z.string().describe("Issue title"),
  description: z.string().optional().describe("Issue description"),
  assignee_ids: z.array(z.number()).optional().describe("Array of user IDs to assign"),
  labels: z.array(z.string()).optional().describe("Array of label names"),
  milestone_id: z.number().optional().describe("Milestone ID to assign")
});

export const CreateMergeRequestSchema = ProjectParamsSchema.extend({
  title: z.string().describe("Merge request title"),
  description: z.string().optional().describe("Merge request description"),
  source_branch: z.string().describe("Branch containing changes"),
  target_branch: z.string().describe("Branch to merge into"),
  draft: z.boolean().optional().describe("Create as draft merge request"),
  allow_collaboration: z.boolean().optional()
    .describe("Allow commits from upstream members")
});

export const ForkRepositorySchema = ProjectParamsSchema.extend({
  namespace: z.string().optional()
    .describe("Namespace to fork to (full path)")
});

export const CreateBranchSchema = ProjectParamsSchema.extend({
  branch: z.string().describe("Name for the new branch"),
  ref: z.string().optional()
    .describe("Source branch/commit for new branch")
});

// New schema for listing group projects
export const ListGroupProjectsSchema = z.object({
  group_id: z.string().describe("Group ID or URL-encoded path of the group"),
  archived: z.boolean().optional().describe("Limit by archived status"),
  visibility: z.enum(['public', 'internal', 'private']).optional().describe("Limit by visibility"),
  order_by: z.enum(['id', 'name', 'path', 'created_at', 'updated_at', 'last_activity_at']).optional().describe("Return projects ordered by specified field"),
  sort: z.enum(['asc', 'desc']).optional().describe("Return projects sorted in ascending or descending order"),
  search: z.string().optional().describe("Return list of projects matching the search criteria"),
  simple: z.boolean().optional().describe("Return only limited fields for each project"),
  include_subgroups: z.boolean().optional().describe("Include projects in subgroups of this group"),
  page: z.number().optional().describe("Page number for pagination"),
  per_page: z.number().optional().describe("Number of results per page")
});

// Get project events schema
export const GetProjectEventsSchema = ProjectParamsSchema.extend({
  action: z
    .string()
    .optional()
    .describe("Include only events of a particular action type"),
  target_type: z
    .string()
    .optional()
    .describe("Include only events of a particular target type"),
  before: z
    .string()
    .optional()
    .describe("Include only events created before a particular date"),
  after: z
    .string()
    .optional()
    .describe("Include only events created after a particular date"),
  sort: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Sort events in ascending or descending order (default: desc)"),
  page: z.number().optional().describe("Page number for pagination"),
  per_page: z
    .number()
    .optional()
    .describe("Number of results per page (default: 20)"),
});

// Define the input schema for the list_commits tool
export const ListCommitsSchema = ProjectParamsSchema.extend({
  sha: z
    .string()
    .optional()
    .describe("The name of a repository branch or tag or commit SHA"),
  since: z
    .string()
    .optional()
    .describe(
      "Only commits after or on this date will be returned (ISO 8601 format)"
    ),
  until: z
    .string()
    .optional()
    .describe(
      "Only commits before or on this date will be returned (ISO 8601 format)"
    ),
  path: z.string().optional().describe("The file path"),
  all: z
    .boolean()
    .optional()
    .describe("Retrieve every commit from the repository"),
  with_stats: z.boolean().optional().describe("Include commit stats"),
  first_parent: z
    .boolean()
    .optional()
    .describe("Follow only the first parent commit upon seeing a merge commit"),
  page: z.number().optional().describe("Page number for pagination"),
  per_page: z
    .number()
    .optional()
    .describe("Number of results per page (default: 20, max: 100)"),
});

// Define the input schema for the list_issues tool
export const ListIssuesSchema = ProjectParamsSchema.extend({
  iid: z
    .union([z.number(), z.string()])
    .optional()
    .describe("Return the issue with the specified internal ID"),
  state: z
    .enum(["opened", "closed", "all"])
    .optional()
    .describe("Return issues with specified state"),
  labels: z
    .string()
    .optional()
    .describe("Return issues matching a comma-separated list of labels"),
  milestone: z
    .string()
    .optional()
    .describe("Return issues for a specific milestone"),
  scope: z
    .enum(["created_by_me", "assigned_to_me", "all"])
    .optional()
    .describe("Return issues for the given scope"),
  author_id: z
    .number()
    .optional()
    .describe("Return issues created by the given user id"),
  assignee_id: z
    .number()
    .optional()
    .describe("Return issues assigned to the given user id"),
  search: z
    .string()
    .optional()
    .describe("Search issues against their title and description"),
  created_after: z
    .string()
    .optional()
    .describe("Return issues created after the specified date"),
  created_before: z
    .string()
    .optional()
    .describe("Return issues created before the specified date"),
  updated_after: z
    .string()
    .optional()
    .describe("Return issues updated after the specified date"),
  updated_before: z
    .string()
    .optional()
    .describe("Return issues updated before the specified date"),
  order_by: z
    .enum([
      "created_at",
      "updated_at",
      "priority",
      "due_date",
      "relative_position",
      "label_priority",
      "milestone_due",
      "popularity",
      "weight",
    ])
    .optional()
    .describe("Return issues ordered by specified field"),
  sort: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Return issues sorted in ascending or descending order"),
  page: z.number().optional().describe("Page number for pagination"),
  per_page: z.number().optional().describe("Number of results per page"),
});

export const GitLabIssuesResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabIssueSchema),
});

// Define the input schema for the list_merge_requests tool
export const ListMergeRequestsSchema = ProjectParamsSchema.extend({
  state: z
    .enum(["opened", "closed", "locked", "merged", "all"])
    .optional()
    .describe("Return merge requests with specified state"),
  order_by: z
    .enum(["created_at", "updated_at"])
    .optional()
    .describe("Return merge requests ordered by specified field"),
  sort: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Return merge requests sorted in ascending or descending order"),
  milestone: z
    .string()
    .optional()
    .describe("Return merge requests for a specific milestone"),
  labels: z
    .string()
    .optional()
    .describe(
      "Return merge requests matching a comma-separated list of labels"
    ),
  created_after: z
    .string()
    .optional()
    .describe("Return merge requests created after the specified date"),
  created_before: z
    .string()
    .optional()
    .describe("Return merge requests created before the specified date"),
  updated_after: z
    .string()
    .optional()
    .describe("Return merge requests updated after the specified date"),
  updated_before: z
    .string()
    .optional()
    .describe("Return merge requests updated before the specified date"),
  scope: z
    .enum(["created_by_me", "assigned_to_me", "all"])
    .optional()
    .describe("Return merge requests for the given scope"),
  author_id: z
    .number()
    .optional()
    .describe("Return merge requests created by the given user id"),
  assignee_id: z
    .number()
    .optional()
    .describe("Return merge requests assigned to the given user id"),
  search: z
    .string()
    .optional()
    .describe("Search merge requests against their title and description"),
  source_branch: z
    .string()
    .optional()
    .describe("Return merge requests with the given source branch"),
  target_branch: z
    .string()
    .optional()
    .describe("Return merge requests with the given target branch"),
  wip: z
    .enum(["yes", "no"])
    .optional()
    .describe("Filter merge requests against their WIP status"),
  page: z.number().optional().describe("Page number for pagination"),
  per_page: z.number().optional().describe("Number of results per page"),
});

export const GitLabMergeRequestsResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabMergeRequestSchema),
});

// Export types
export type GitLabAuthor = z.infer<typeof GitLabAuthorSchema>;
export type GitLabFork = z.infer<typeof GitLabForkSchema>;
export type GitLabIssue = z.infer<typeof GitLabIssueSchema>;
export type GitLabMergeRequest = z.infer<typeof GitLabMergeRequestSchema>;
export type GitLabRepository = z.infer<typeof GitLabRepositorySchema>;
export type GitLabFileContent = z.infer<typeof GitLabFileContentSchema>;
export type GitLabDirectoryContent = z.infer<typeof GitLabDirectoryContentSchema>;
export type GitLabContent = z.infer<typeof GitLabContentSchema>;
export type FileOperation = z.infer<typeof FileOperationSchema>;
export type GitLabTree = z.infer<typeof GitLabTreeSchema>;
export type GitLabCommit = z.infer<typeof GitLabCommitSchema>;
export type GitLabReference = z.infer<typeof GitLabReferenceSchema>;
export type CreateRepositoryOptions = z.infer<typeof CreateRepositoryOptionsSchema>;
export type CreateIssueOptions = z.infer<typeof CreateIssueOptionsSchema>;
export type CreateMergeRequestOptions = z.infer<typeof CreateMergeRequestOptionsSchema>;
export type CreateBranchOptions = z.infer<typeof CreateBranchOptionsSchema>;
export type GitLabCreateUpdateFileResponse = z.infer<typeof GitLabCreateUpdateFileResponseSchema>;
export type GitLabSearchResponse = z.infer<typeof GitLabSearchResponseSchema>;
export type GitLabGroupProjectsResponse = z.infer<typeof GitLabGroupProjectsResponseSchema>;
export type GitLabGroupProject = z.infer<typeof GitLabGroupProjectSchema>;
export type ListGroupProjects = z.infer<typeof ListGroupProjectsSchema>;
export type GetProjectEvents = z.infer<typeof GetProjectEventsSchema>;
export type GitLabEvent = z.infer<typeof GitLabEventSchema>;
export type GitLabEventsResponse = z.infer<typeof GitLabEventsResponseSchema>;
export type ListCommits = z.infer<typeof ListCommitsSchema>;
export type GitLabCommitsResponse = z.infer<typeof GitLabCommitsResponseSchema>;
export type ListIssues = z.infer<typeof ListIssuesSchema>;
export type GitLabIssuesResponse = z.infer<typeof GitLabIssuesResponseSchema>;
export type ListMergeRequests = z.infer<typeof ListMergeRequestsSchema>;
export type GitLabMergeRequestsResponse = z.infer<typeof GitLabMergeRequestsResponseSchema>;