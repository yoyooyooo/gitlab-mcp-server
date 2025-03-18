# GitLab MCP Server (with group projects listing feature)

A Model Context Protocol (MCP) server for interacting with GitLab API. This server provides tools for working with GitLab repositories, issues, merge requests, and more.

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

## Comparison with Original Implementation

This server is based on the [original GitLab MCP server](https://github.com/modelcontextprotocol/servers/tree/main/src/gitlab) with the following enhancements:

### Added Features

- **Group Projects Listing**: The primary enhancement is the addition of the `list_group_projects` tool, which allows listing all projects within a specific GitLab group with extensive filtering options.

### Technical Improvements

- **Enhanced Schema Support**: Added specialized schemas for group projects that are more flexible than repository schemas, making certain fields optional since they might not be present in group projects.
- **Comprehensive Filtering**: The group projects listing feature supports filtering by archived status, visibility, sorting options, and includes support for subgroups.
- **Pagination Support**: Implemented proper pagination for the group projects listing to handle large groups efficiently.

### Implementation Details

- Added `listGroupProjects` function that interfaces with the GitLab API endpoint for group projects
- Created new schema definitions: `GitLabGroupProjectSchema`, `GitLabGroupProjectsResponseSchema`, and `ListGroupProjectsSchema`
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

## Conclusion

This enhanced GitLab MCP Server builds upon the original implementation by adding support for group projects listing, which is particularly useful for organizations with multiple projects organized in groups. The implementation follows the same patterns and coding style as the original server while extending its functionality.

### Use Cases

- **Organization-wide Project Discovery**: Easily list and filter all projects within an organization or group
- **CI/CD Integration**: Automate operations across multiple repositories within a group
- **Project Management**: Get a comprehensive view of all projects with filtering options

### Future Enhancements

Potential future enhancements could include:

- Group management operations (create/update/delete groups)
- Group member management
- Additional filtering options for group projects
- Support for GitLab subgroups operations

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
