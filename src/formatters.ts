import {
  GitLabEventsResponse,
  GitLabCommitsResponse,
  GitLabIssuesResponse,
  GitLabMergeRequestsResponse,
  GitLabWikiPagesResponse,
  GitLabWikiPage,
  GitLabWikiAttachment
} from './schemas.js';

/**
 * Formats the events response for better readability
 * 
 * @param events - The GitLab events response
 * @returns A formatted response object for the MCP tool
 */
export function formatEventsResponse(events: GitLabEventsResponse) {
  // Create a summary of the events
  const summary = `Found ${events.count} events`;
  
  // Format the events data
  const formattedEvents = events.items.map(event => ({
    id: event.id,
    action: event.action_name,
    author: event.author.name,
    created_at: event.created_at,
    target_type: event.target_type || null,
    target_title: event.target_title || null,
    push_data: event.push_data || null
  }));
  
  // Return the formatted response
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedEvents, null, 2) }
    ]
  };
}

/**
 * Formats the commits response for better readability
 * 
 * @param commits - The GitLab commits response
 * @returns A formatted response object for the MCP tool
 */
export function formatCommitsResponse(commits: GitLabCommitsResponse) {
  // Create a summary of the commits
  const summary = `Found ${commits.count} commits`;
  
  // Format the commits data
  const formattedCommits = commits.items.map(commit => ({
    id: commit.id,
    short_id: commit.short_id,
    title: commit.title,
    author_name: commit.author_name,
    author_email: commit.author_email,
    created_at: commit.created_at,
    message: commit.message,
    web_url: commit.web_url,
    stats: commit.stats
  }));
  
  // Return the formatted response
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedCommits, null, 2) }
    ]
  };
}

/**
 * Formats the issues response for better readability
 * 
 * @param issues - The GitLab issues response
 * @returns A formatted response object for the MCP tool
 */
export function formatIssuesResponse(issues: GitLabIssuesResponse) {
  // Create a summary of the issues
  const summary = `Found ${issues.count} issues`;
  
  // Format the issues data
  const formattedIssues = issues.items.map(issue => ({
    id: issue.id,
    iid: issue.iid,
    title: issue.title,
    description: issue.description,
    state: issue.state,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    closed_at: issue.closed_at,
    labels: issue.labels,
    author: {
      name: issue.author.name,
      username: issue.author.username
    },
    assignees: issue.assignees.map(assignee => ({
      name: assignee.name,
      username: assignee.username
    })),
    web_url: issue.web_url
  }));
  
  // Return the formatted response
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedIssues, null, 2) }
    ]
  };
}

/**
 * Formats the merge requests response for better readability
 * 
 * @param mergeRequests - The GitLab merge requests response
 * @returns A formatted response object for the MCP tool
 */
export function formatMergeRequestsResponse(mergeRequests: GitLabMergeRequestsResponse) {
  // Create a summary of the merge requests
  const summary = `Found ${mergeRequests.count} merge requests`;
  
  // Format the merge requests data
  const formattedMergeRequests = mergeRequests.items.map(mr => ({
    id: mr.id,
    iid: mr.iid,
    title: mr.title,
    description: mr.description,
    state: mr.state,
    merged: mr.merged,
    created_at: mr.created_at,
    updated_at: mr.updated_at,
    merged_at: mr.merged_at,
    closed_at: mr.closed_at,
    source_branch: mr.source_branch,
    target_branch: mr.target_branch,
    author: {
      name: mr.author.name,
      username: mr.author.username
    },
    assignees: mr.assignees.map(assignee => ({
      name: assignee.name,
      username: assignee.username
    })),
    web_url: mr.web_url
  }));
  
  // Return the formatted response
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedMergeRequests, null, 2) }
    ]
  };
}

/**
 * Formats the wiki pages response for better readability
 *
 * @param wikiPages - The GitLab wiki pages response
 * @returns A formatted response object for the MCP tool
 */
export function formatWikiPagesResponse(wikiPages: GitLabWikiPagesResponse) {
  // Create a summary of the wiki pages
  const summary = `Found ${wikiPages.count} wiki pages`;
  
  // Format the wiki pages data
  const formattedWikiPages = wikiPages.items.map(page => ({
    slug: page.slug,
    title: page.title,
    format: page.format,
    content: page.content ? (page.content.length > 100 ? `${page.content.substring(0, 100)}...` : page.content) : null,
    created_at: page.created_at,
    updated_at: page.updated_at,
    web_url: page.web_url
  }));
  
  // Return the formatted response
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedWikiPages, null, 2) }
    ]
  };
}

/**
 * Formats a single wiki page for better readability
 *
 * @param wikiPage - The GitLab wiki page
 * @returns A formatted response object for the MCP tool
 */
export function formatWikiPageResponse(wikiPage: GitLabWikiPage) {
  // Format the wiki page data
  const formattedWikiPage = {
    slug: wikiPage.slug,
    title: wikiPage.title,
    format: wikiPage.format,
    content: wikiPage.content,
    created_at: wikiPage.created_at,
    updated_at: wikiPage.updated_at,
    web_url: wikiPage.web_url
  };
  
  // Return the formatted response
  return {
    content: [
      { type: "text", text: `Wiki Page: ${wikiPage.title}` },
      { type: "text", text: JSON.stringify(formattedWikiPage, null, 2) }
    ]
  };
}

/**
 * Formats a wiki attachment response for better readability
 *
 * @param attachment - The GitLab wiki attachment
 * @returns A formatted response object for the MCP tool
 */
export function formatWikiAttachmentResponse(attachment: GitLabWikiAttachment) {
  // Format the attachment data
  const formattedAttachment = {
    file_name: attachment.file_name,
    file_path: attachment.file_path,
    branch: attachment.branch,
    commit_id: attachment.commit_id,
    url: attachment.url
  };
  
  // Return the formatted response
  return {
    content: [
      { type: "text", text: `Wiki Attachment: ${attachment.file_name}` },
      { type: "text", text: JSON.stringify(formattedAttachment, null, 2) }
    ]
  };
}