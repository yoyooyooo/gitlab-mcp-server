# GitLab MCP Server

A Model Context Protocol (MCP) server for GitLab integration, providing tools to interact with GitLab repositories, issues, merge requests, wikis, and more.

## Features

- Support for both stdio and SSE transports
- Strict TypeScript typing with the MCP SDK
- Comprehensive GitLab API integration
- Repository operations (search, create, fork)
- File operations (read, create, update)
- Branch operations (create)
- Issue management (create, list, filter)
- Merge request handling (create, list, filter)
- Group projects listing
- Project events retrieval
- Commit history access
- Member management (list project and group members)
- Complete wiki management:
  - Project wiki support (list, get, create, edit, delete pages)
  - Group wiki support (list, get, create, edit, delete pages)
  - Wiki attachment handling
  - Multiple wiki formats (markdown, rdoc, asciidoc, org)

## Installation

### From npm (Recommended)

```bash
npm install @yoda.digital/gitlab-mcp-server
```

### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-gitlab-server.git
cd mcp-gitlab-server

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

### Environment Variables

The server requires the following environment variables when running directly:

- `GITLAB_PERSONAL_ACCESS_TOKEN` (required): Your GitLab personal access token
- `GITLAB_API_URL` (optional): The GitLab API URL (defaults to 'https://gitlab.com/api/v4')
- `PORT` (optional): The port to use for SSE transport (defaults to 3000)
- `USE_SSE` (optional): Set to 'true' to use SSE transport instead of stdio (defaults to 'false')

### MCP Settings Configuration

You can add the GitLab MCP server to your MCP settings file (e.g., `cline_mcp_settings.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gitlab": {
      "command": "npx",
      "args": ["-y", "@yoda.digital/gitlab-mcp-server"],
      "env": {
        "GITLAB_PERSONAL_ACCESS_TOKEN": "your_token_here",
        "GITLAB_API_URL": "https://gitlab.com/api/v4"
      },
      "alwaysAllow": [],
      "disabled": false
    }
  }
}
```

## Usage

### Running with stdio transport (default)

```bash
# Set your GitLab personal access token
export GITLAB_PERSONAL_ACCESS_TOKEN=your_token_here

# Run the server
npm start
```

### Running with SSE transport

```bash
# Set your GitLab personal access token and enable SSE
export GITLAB_PERSONAL_ACCESS_TOKEN=your_token_here
export USE_SSE=true
export PORT=3000  # Optional, defaults to 3000

# Run the server
npm start
```

### Running with npx

```bash
# Run directly with npx
GITLAB_PERSONAL_ACCESS_TOKEN=your_token_here npx @yoda.digital/gitlab-mcp-server
```

## Available Tools

The server provides the following tools:

### Repository Operations

- `search_repositories`: Search for GitLab projects

  ```json
  {
    "search": "project-name",
    "page": 1,
    "per_page": 20
  }
  ```

- `create_repository`: Create a new GitLab project

  ```json
  {
    "name": "new-project",
    "description": "A new project",
    "visibility": "private",
    "initialize_with_readme": true
  }
  ```

- `fork_repository`: Fork a GitLab project

  ```json
  {
    "project_id": "username/project",
    "namespace": "target-namespace"
  }
  ```

- `list_group_projects`: List all projects within a specific GitLab group
  ```json
  {
    "group_id": "group-name",
    "archived": false,
    "visibility": "public",
    "include_subgroups": true,
    "page": 1,
    "per_page": 20
  }
  ```

### File Operations

- `get_file_contents`: Get the contents of a file from a GitLab project

  ```json
  {
    "project_id": "username/project",
    "file_path": "path/to/file.txt",
    "ref": "main"
  }
  ```

- `create_or_update_file`: Create or update a single file in a GitLab project

  ```json
  {
    "project_id": "username/project",
    "file_path": "path/to/file.txt",
    "content": "File content here",
    "commit_message": "Add/update file",
    "branch": "main",
    "previous_path": "old/path/to/file.txt"
  }
  ```

- `push_files`: Push multiple files to a GitLab project in a single commit
  ```json
  {
    "project_id": "username/project",
    "files": [
      {
        "path": "file1.txt",
        "content": "Content for file 1"
      },
      {
        "path": "file2.txt",
        "content": "Content for file 2"
      }
    ],
    "commit_message": "Add multiple files",
    "branch": "main"
  }
  ```

### Branch Operations

- `create_branch`: Create a new branch in a GitLab project
  ```json
  {
    "project_id": "username/project",
    "branch": "new-branch",
    "ref": "main"
  }
  ```

### Issue Operations

- `create_issue`: Create a new issue in a GitLab project

  ```json
  {
    "project_id": "username/project",
    "title": "Issue title",
    "description": "Issue description",
    "assignee_ids": [1, 2],
    "milestone_id": 1,
    "labels": ["bug", "critical"]
  }
  ```

- `list_issues`: Get issues for a GitLab project with filtering
  ```json
  {
    "project_id": "username/project",
    "state": "opened",
    "labels": "bug,critical",
    "milestone": "v1.0",
    "author_id": 1,
    "assignee_id": 2,
    "search": "keyword",
    "created_after": "2023-01-01T00:00:00Z",
    "created_before": "2023-12-31T23:59:59Z",
    "updated_after": "2023-06-01T00:00:00Z",
    "updated_before": "2023-06-30T23:59:59Z",
    "page": 1,
    "per_page": 20
  }
  ```

### Merge Request Operations

- `create_merge_request`: Create a new merge request in a GitLab project

  ```json
  {
    "project_id": "username/project",
    "title": "Merge request title",
    "description": "Merge request description",
    "source_branch": "feature-branch",
    "target_branch": "main",
    "allow_collaboration": true,
    "draft": false
  }
  ```

- `list_merge_requests`: Get merge requests for a GitLab project with filtering
  ```json
  {
    "project_id": "username/project",
    "state": "opened",
    "order_by": "created_at",
    "sort": "desc",
    "milestone": "v1.0",
    "labels": "feature,enhancement",
    "created_after": "2023-01-01T00:00:00Z",
    "created_before": "2023-12-31T23:59:59Z",
    "updated_after": "2023-06-01T00:00:00Z",
    "updated_before": "2023-06-30T23:59:59Z",
    "author_id": 1,
    "assignee_id": 2,
    "search": "keyword",
    "source_branch": "feature-branch",
    "target_branch": "main",
    "page": 1,
    "per_page": 20
  }
  ```

### Project Activity

- `get_project_events`: Get recent events/activities for a GitLab project

  ```json
  {
    "project_id": "username/project",
    "action": "pushed",
    "target_type": "issue",
    "before": "2023-12-31T23:59:59Z",
    "after": "2023-01-01T00:00:00Z",
    "sort": "desc",
    "page": 1,
    "per_page": 20
  }
  ```

- `list_commits`: Get commit history for a GitLab project
  ```json
  {
    "project_id": "username/project",
    "sha": "branch-or-commit-sha",
    "path": "path/to/file",
    "since": "2023-01-01T00:00:00Z",
    "until": "2023-12-31T23:59:59Z",
    "all": true,
    "with_stats": true,
    "first_parent": true,
    "page": 1,
    "per_page": 20
  }
  ```

### Member Operations

- `list_project_members`: List all members of a GitLab project (including inherited members)

  ```json
  {
    "project_id": "username/project",
    "query": "search term",
    "page": 1,
    "per_page": 20
  }
  ```

- `list_group_members`: List all members of a GitLab group (including inherited members)

  ```json
  {
    "group_id": "group-name",
    "query": "search term",
    "page": 1,
    "per_page": 20
  }
  ```

### Project Wiki Operations

- `list_project_wiki_pages`: List all wiki pages for a GitLab project

  ```json
  {
    "project_id": "username/project",
    "with_content": false
  }
  ```

- `get_project_wiki_page`: Get a specific wiki page for a GitLab project

  ```json
  {
    "project_id": "username/project",
    "slug": "page-slug",
    "render_html": false,
    "version": "commit-sha"
  }
  ```

- `create_project_wiki_page`: Create a new wiki page for a GitLab project

  ```json
  {
    "project_id": "username/project",
    "title": "Page Title",
    "content": "Wiki page content",
    "format": "markdown"
  }
  ```

- `edit_project_wiki_page`: Edit an existing wiki page for a GitLab project

  ```json
  {
    "project_id": "username/project",
    "slug": "page-slug",
    "title": "New Page Title",
    "content": "Updated wiki page content",
    "format": "markdown"
  }
  ```

- `delete_project_wiki_page`: Delete a wiki page from a GitLab project

  ```json
  {
    "project_id": "username/project",
    "slug": "page-slug"
  }
  ```

- `upload_project_wiki_attachment`: Upload an attachment to a GitLab project wiki
  ```json
  {
    "project_id": "username/project",
    "file_path": "path/to/attachment.png",
    "content": "base64-encoded-content",
    "branch": "main"
  }
  ```

### Group Wiki Operations

- `list_group_wiki_pages`: List all wiki pages for a GitLab group

  ```json
  {
    "group_id": "group-name",
    "with_content": false
  }
  ```

- `get_group_wiki_page`: Get a specific wiki page for a GitLab group

  ```json
  {
    "group_id": "group-name",
    "slug": "page-slug",
    "render_html": false,
    "version": "commit-sha"
  }
  ```

- `create_group_wiki_page`: Create a new wiki page for a GitLab group

  ```json
  {
    "group_id": "group-name",
    "title": "Page Title",
    "content": "Wiki page content",
    "format": "markdown"
  }
  ```

- `edit_group_wiki_page`: Edit an existing wiki page for a GitLab group

  ```json
  {
    "group_id": "group-name",
    "slug": "page-slug",
    "title": "New Page Title",
    "content": "Updated wiki page content",
    "format": "markdown"
  }
  ```

- `delete_group_wiki_page`: Delete a wiki page from a GitLab group

  ```json
  {
    "group_id": "group-name",
    "slug": "page-slug"
  }
  ```

- `upload_group_wiki_attachment`: Upload an attachment to a GitLab group wiki
  ```json
  {
    "group_id": "group-name",
    "file_path": "path/to/attachment.png",
    "content": "base64-encoded-content",
    "branch": "main"
  }
  ```

## Development

### Building the Project

```bash
npm run build
```

### Running Tests

```bash
npm test
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## NPM Package

This package is available on npm:
https://www.npmjs.com/package/@yoda.digital/gitlab-mcp-server
