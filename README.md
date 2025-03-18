# GitLab MCP Server (with activity tracking and group projects listing features)

A Model Context Protocol (MCP) server for interacting with GitLab API. This server provides tools for working with GitLab repositories, issues, merge requests, and tracking project activities.

## Features

- **Create or Update Files**: Create or update files in GitLab repositories
- **Search Repositories**: Search for GitLab projects using keywords
- **Create Repository**: Create a new GitLab repository
- **Get File Contents**: Retrieve file contents from GitLab repositories
- **Push Files**: Push multiple files to a GitLab repository in a single commit
- **Create Issue**: Create a new issue in a GitLab project
- **Create Merge Request**: Create a new merge request in a GitLab project
- **Fork Repository**: Fork a GitLab repository to your account or specified namespace
- **Create Branch**: Create a new branch in a GitLab repository
- **List Group Projects**: List all projects (repositories) within a specific GitLab group
- **Get Project Events**: Retrieve a chronological list of all events in a GitLab project
- **List Commits**: Get commit history for a GitLab project with filtering options
- **List Issues**: Retrieve issues for a GitLab project with comprehensive filtering
- **List Merge Requests**: Get merge requests for a GitLab project with filtering options

## Comparison with Original Implementation

This server is based on the [original GitLab MCP server](https://github.com/modelcontextprotocol/servers/tree/main/src/gitlab) with the following enhancements:

### Added Features

- **Group Projects Listing**: The addition of the `list_group_projects` tool, which allows listing all projects within a specific GitLab group with extensive filtering options.
- **Activity Tracking**: A comprehensive set of tools for tracking project activities:
  - `get_project_events`: Retrieve all activities in a GitLab project
  - `list_commits`: Get commit history with filtering options
  - `list_issues`: Retrieve issues with comprehensive filtering
  - `list_merge_requests`: Get merge requests with filtering options

### Technical Improvements

- **Enhanced Schema Support**: Added specialized schemas for group projects, events, commits, issues, and merge requests.
- **Comprehensive Filtering**: All new features support extensive filtering options for precise data retrieval.
- **Pagination Support**: Implemented proper pagination for all listing features to handle large datasets efficiently.
- **Formatted Responses**: All responses include both raw data and formatted data for better readability.

### Implementation Details

- Added functions that interface with GitLab API endpoints: `listGroupProjects`, `getProjectEvents`, `listCommits`, `listIssues`, and `listMergeRequests`
- Created new schema definitions for all new features
- Implemented robust error handling and response formatting
- Exposed the new functionality through the MCP tools interface

## Installation

```bash
# Install dependencies
npm install

# Build the server
npm run build
```

## Configuration

The server requires the following environment variables:

- `GITLAB_PERSONAL_ACCESS_TOKEN`: Your GitLab personal access token with API access
- `GITLAB_API_URL` (optional): The GitLab API URL (defaults to 'https://gitlab.com/api/v4')

### Token Permissions

For the group projects listing feature and other operations, your GitLab personal access token should have the following scopes:

- `api` - Full API access
- `read_repository` - For read operations on repositories
- `write_repository` - For write operations on repositories (if needed)

## Usage

```bash
# Start the server
npm start

# Test with the MCP Inspector
npm run inspector
```

### Integration with MCP

To use this server with MCP-enabled applications, add it to your MCP configuration:

```json
{
  "mcpServers": {
    "gitlab": {
      "command": "node",
      "args": ["/path/to/gitlab-mcp-server/dist/index.js"],
      "env": {
        "GITLAB_PERSONAL_ACCESS_TOKEN": "your-gitlab-token-here"
      },
      "disabled": false
    }
  }
}
```

## Tools

### create_or_update_file

Create or update a single file in a GitLab project.

Parameters:

- `project_id`: Project ID or URL-encoded path
- `file_path`: Path where to create/update the file
- `content`: Content of the file
- `commit_message`: Commit message
- `branch`: Branch to create/update the file in
- `previous_path` (optional): Path of the file to move/rename

### search_repositories

Search for GitLab projects.

Parameters:

- `search`: Search query
- `page` (optional): Page number for pagination (default: 1)
- `per_page` (optional): Number of results per page (default: 20)

### create_repository

Create a new GitLab project.

Parameters:

- `name`: Repository name
- `description` (optional): Repository description
- `visibility` (optional): Repository visibility level ('private', 'internal', or 'public')
- `initialize_with_readme` (optional): Initialize with README.md

### get_file_contents

Get the contents of a file or directory from a GitLab project.

Parameters:

- `project_id`: Project ID or URL-encoded path
- `file_path`: Path to the file or directory
- `ref` (optional): Branch/tag/commit to get contents from

### push_files

Push multiple files to a GitLab project in a single commit.

Parameters:

- `project_id`: Project ID or URL-encoded path
- `branch`: Branch to push to
- `files`: Array of files to push (each with `file_path` and `content`)
- `commit_message`: Commit message

### create_issue

Create a new issue in a GitLab project.

Parameters:

- `project_id`: Project ID or URL-encoded path
- `title`: Issue title
- `description` (optional): Issue description
- `assignee_ids` (optional): Array of user IDs to assign
- `labels` (optional): Array of label names
- `milestone_id` (optional): Milestone ID to assign

### create_merge_request

Create a new merge request in a GitLab project.

Parameters:

- `project_id`: Project ID or URL-encoded path
- `title`: Merge request title
- `description` (optional): Merge request description
- `source_branch`: Branch containing changes
- `target_branch`: Branch to merge into
- `draft` (optional): Create as draft merge request
- `allow_collaboration` (optional): Allow commits from upstream members

### fork_repository

Fork a GitLab project to your account or specified namespace.

Parameters:

- `project_id`: Project ID or URL-encoded path
- `namespace` (optional): Namespace to fork to (full path)

### create_branch

Create a new branch in a GitLab project.

Parameters:

- `project_id`: Project ID or URL-encoded path
- `branch`: Name for the new branch
- `ref` (optional): Source branch/commit for new branch

### list_group_projects

List all projects (repositories) within a specific GitLab group.

Parameters:

- `group_id`: Group ID or URL-encoded path of the group
- `archived` (optional): Limit by archived status (boolean)
- `visibility` (optional): Limit by visibility ('public', 'internal', or 'private')
- `order_by` (optional): Return projects ordered by specified field ('id', 'name', 'path', 'created_at', 'updated_at', 'last_activity_at')
- `sort` (optional): Return projects sorted in ascending or descending order ('asc' or 'desc')
- `search` (optional): Return list of projects matching the search criteria
- `simple` (optional): Return only limited fields for each project (boolean)
- `include_subgroups` (optional): Include projects in subgroups of this group (boolean)
- `page` (optional): Page number for pagination (default: 1)
- `per_page` (optional): Number of results per page (default: 20)

Example:

```json
{
  "group_id": "my-organization/my-group",
  "visibility": "internal",
  "include_subgroups": true,
  "order_by": "name",
  "sort": "asc"
}
```

Response:

```json
{
  "count": 25,
  "items": [
    {
      "id": 123,
      "name": "Project A",
      "path_with_namespace": "my-organization/my-group/project-a",
      "visibility": "internal",
      "web_url": "https://gitlab.com/my-organization/my-group/project-a",
      "description": "Description of Project A",
      "created_at": "2023-01-15T10:00:00Z",
      "last_activity_at": "2023-05-20T14:30:00Z",
      "default_branch": "main"
    }
    // Additional projects...
  ]
}
```

### get_project_events

Get recent events/activities for a GitLab project.

Parameters:

- `project_id`: Project ID or URL-encoded path
- `action` (optional): Include only events of a particular action type
- `target_type` (optional): Include only events of a particular target type
- `before` (optional): Include only events created before a particular date
- `after` (optional): Include only events created after a particular date
- `sort` (optional): Sort events in ascending or descending order ('asc' or 'desc')
- `page` (optional): Page number for pagination
- `per_page` (optional): Number of results per page (default: 20, max: 100)

Example:

```json
{
  "project_id": "my-group/my-project",
  "target_type": "Issue",
  "after": "2025-01-01T00:00:00Z",
  "sort": "asc",
  "per_page": 50
}
```

Response:

```json
{
  "count": 15,
  "formatted_events": [
    {
      "id": 123,
      "action": "opened",
      "author": "John Doe (johndoe)",
      "date": "2025-01-15T10:30:45Z",
      "target_type": "Issue",
      "issue_title": "Fix login bug"
    }
    // Additional events...
  ],
  "raw_events": [
    // Raw event data...
  ]
}
```

### list_commits

Get commit history for a GitLab project.

Parameters:

- `project_id`: Project ID or URL-encoded path
- `sha` (optional): The name of a repository branch or tag or commit SHA
- `since` (optional): Only commits after or on this date will be returned (ISO 8601 format)
- `until` (optional): Only commits before or on this date will be returned (ISO 8601 format)
- `path` (optional): The file path
- `all` (optional): Retrieve every commit from the repository
- `with_stats` (optional): Include commit stats
- `first_parent` (optional): Follow only the first parent commit upon seeing a merge commit
- `page` (optional): Page number for pagination
- `per_page` (optional): Number of results per page (default: 20, max: 100)

Example:

```json
{
  "project_id": "my-group/my-project",
  "sha": "main",
  "since": "2025-01-01T00:00:00Z",
  "path": "src/index.ts",
  "with_stats": true,
  "per_page": 30
}
```

Response:

```json
{
  "count": 25,
  "formatted_commits": [
    {
      "id": "abc123d",
      "title": "Update index.ts with new feature",
      "author": "Jane Smith",
      "author_email": "jane@example.com",
      "date": "2025-02-15T14:30:22Z",
      "web_url": "https://gitlab.com/my-group/my-project/-/commit/abc123def456",
      "stats": {
        "additions": 45,
        "deletions": 12,
        "total": 57
      }
    }
    // Additional commits...
  ],
  "raw_commits": [
    // Raw commit data...
  ]
}
```

### list_issues

Get issues for a GitLab project.

Parameters:

- `project_id`: Project ID or URL-encoded path
- `state` (optional): Filter issues by state ('opened', 'closed', 'all')
- `labels` (optional): Filter issues by labels (comma-separated string)
- `milestone` (optional): Filter issues by milestone
- `scope` (optional): Filter issues by scope ('created_by_me', 'assigned_to_me', 'all')
- `author_id` (optional): Filter issues by author ID
- `assignee_id` (optional): Filter issues by assignee ID
- `search` (optional): Search issues by title or description
- `created_after` (optional): Filter issues created after date (ISO 8601 format)
- `created_before` (optional): Filter issues created before date (ISO 8601 format)
- `updated_after` (optional): Filter issues updated after date (ISO 8601 format)
- `updated_before` (optional): Filter issues updated before date (ISO 8601 format)
- `order_by` (optional): Order issues by field
- `sort` (optional): Sort issues in ascending or descending order ('asc' or 'desc')
- `page` (optional): Page number for pagination
- `per_page` (optional): Number of results per page (default: 20, max: 100)

Example:

```json
{
  "project_id": "my-group/my-project",
  "state": "opened",
  "labels": "bug,critical",
  "created_after": "2025-01-01T00:00:00Z",
  "order_by": "created_at",
  "sort": "desc",
  "per_page": 50
}
```

Response:

```json
{
  "count": 12,
  "formatted_issues": [
    {
      "iid": 42,
      "title": "Fix critical login bug",
      "state": "opened",
      "author": "John Doe",
      "assignees": ["Jane Smith"],
      "labels": ["bug", "critical"],
      "milestone": "Q1 Release",
      "created_at": "2025-02-10T09:15:30Z",
      "updated_at": "2025-02-15T14:22:10Z",
      "web_url": "https://gitlab.com/my-group/my-project/-/issues/42"
    }
    // Additional issues...
  ],
  "raw_issues": [
    // Raw issue data...
  ]
}
```

### list_merge_requests

Get merge requests for a GitLab project.

Parameters:

- `project_id`: Project ID or URL-encoded path
- `state` (optional): Filter merge requests by state ('opened', 'closed', 'locked', 'merged', 'all')
- `order_by` (optional): Order merge requests by field ('created_at', 'updated_at')
- `sort` (optional): Sort merge requests in ascending or descending order ('asc' or 'desc')
- `milestone` (optional): Filter merge requests by milestone
- `labels` (optional): Filter merge requests by labels (comma-separated string)
- `created_after` (optional): Filter merge requests created after date (ISO 8601 format)
- `created_before` (optional): Filter merge requests created before date (ISO 8601 format)
- `updated_after` (optional): Filter merge requests updated after date (ISO 8601 format)
- `updated_before` (optional): Filter merge requests updated before date (ISO 8601 format)
- `scope` (optional): Filter merge requests by scope ('created_by_me', 'assigned_to_me', 'all')
- `author_id` (optional): Filter merge requests by author ID
- `assignee_id` (optional): Filter merge requests by assignee ID
- `search` (optional): Search merge requests by title or description
- `source_branch` (optional): Filter merge requests by source branch
- `target_branch` (optional): Filter merge requests by target branch
- `wip` (optional): Filter merge requests by WIP status ('yes' or 'no')
- `page` (optional): Page number for pagination
- `per_page` (optional): Number of results per page (default: 20, max: 100)

Example:

```json
{
  "project_id": "my-group/my-project",
  "state": "opened",
  "target_branch": "main",
  "labels": "feature,ready",
  "order_by": "updated_at",
  "sort": "desc",
  "per_page": 30
}
```

Response:

```json
{
  "count": 8,
  "formatted_merge_requests": [
    {
      "iid": 15,
      "title": "Add new authentication feature",
      "state": "opened",
      "merged": false,
      "author": "Jane Smith",
      "assignees": ["John Doe"],
      "source_branch": "feature/auth",
      "target_branch": "main",
      "created_at": "2025-02-20T11:45:30Z",
      "updated_at": "2025-02-22T09:30:15Z",
      "web_url": "https://gitlab.com/my-group/my-project/-/merge_requests/15"
    }
    // Additional merge requests...
  ],
  "raw_merge_requests": [
    // Raw merge request data...
  ]
}
```

## Conclusion

This enhanced GitLab MCP Server builds upon the original implementation by adding support for group projects listing and comprehensive activity tracking features. These enhancements provide powerful tools for monitoring project activities, tracking code changes, and managing issues and merge requests.

### Use Cases

- **Organization-wide Project Discovery**: Easily list and filter all projects within an organization or group
- **CI/CD Integration**: Automate operations across multiple repositories within a group
- **Project Management**: Get a comprehensive view of all projects with filtering options
- **Activity Monitoring**: Track all activities in a project, including commits, issues, and merge requests
- **Code Review**: Analyze commit history and changes with detailed filtering
- **Issue Tracking**: Monitor and filter issues based on various criteria
- **Merge Request Management**: Track and analyze merge requests with comprehensive filtering

### Future Enhancements

Potential future enhancements could include:

- Group management operations (create/update/delete groups)
- Group member management
- Additional filtering options for group projects
- Support for GitLab subgroups operations
- Commit diff retrieval and analysis
- Commit comments and discussions
- Issue and merge request comments
- Advanced activity analytics and reporting

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
