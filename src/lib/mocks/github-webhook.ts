/**
 * Mock GitHub webhook payloads for local testing of the webhook listener and
 * AI-summary pipeline (milestones 3). Shapes follow the real GitHub
 * `pull_request` event payloads (v2), trimmed to the fields we consume.
 */

/** Minimal GitHub user shape as seen on PRs/comments. */
export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: string;
}

/** Minimal repository shape as seen on webhook payloads. */
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubUser;
  html_url: string;
  private: boolean;
  default_branch: string;
}

/** GitHub label object (PR labels). */
export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

/** The pull_request object inside a `pull_request.closed` event. */
export interface GitHubPullRequest {
  number: number;
  state: "open" | "closed";
  locked: boolean;
  title: string;
  body: string | null;
  user: GitHubUser;
  labels: GitHubLabel[];
  merged: boolean;
  merge_commit_sha: string | null;
  merged_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  head: { ref: string; sha: string; repo: Pick<GitHubRepository, "id" | "name" | "full_name"> | null };
  base: { ref: string; sha: string; repo: Pick<GitHubRepository, "id" | "name" | "full_name"> | null };
  author_association: string;
}

/** Full `pull_request.closed` webhook event payload. */
export interface GitHubPullRequestClosedEvent {
  action: "opened" | "closed" | "reopened" | "synchronize";
  number: number;
  pull_request: GitHubPullRequest;
  repository: GitHubRepository;
  sender: GitHubUser;
  installation?: { id: number };
}

/**
 * A merged PR: has labels including `feature`, a merged_at timestamp, and a
 * realistic PR body. Ready to feed straight into /api/webhooks/github.
 */
export const mergedPullRequestWebhook: GitHubPullRequestClosedEvent = {
  action: "closed",
  number: 142,
  pull_request: {
    number: 142,
    state: "closed",
    locked: false,
    title: "Add dark mode with system preference detection",
    body:
      "## Summary\nAdds a theme toggle to the top bar, persists the choice in localStorage, and respects `prefers-color-scheme` on first visit.\n\nCloses #139",
    html_url: "https://github.com/acme-inc/acme-webapp/pull/142",
    user: {
      login: "adalovelace",
      id: 12345,
      avatar_url: "https://avatars.githubusercontent.com/u/12345?v=4",
      html_url: "https://github.com/adalovelace",
      type: "User",
    },
    labels: [
      { id: 9001, name: "feature", color: "1d76db", description: "New functionality" },
      { id: 9002, name: "ui", color: "fbca04", description: "User interface work" },
    ],
    merged: true,
    merge_commit_sha: "8b7a2c4f0e9d1a3b5c7e9f0a1b2c3d4e5f6a7b8c",
    merged_at: "2026-09-09T14:22:31Z",
    closed_at: "2026-09-09T14:22:31Z",
    created_at: "2026-09-01T10:05:00Z",
    updated_at: "2026-09-09T14:22:31Z",
    head: {
      ref: "feat/dark-mode",
      sha: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
      repo: { id: 482910238, name: "acme-webapp", full_name: "acme-inc/acme-webapp" },
    },
    base: {
      ref: "main",
      sha: "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b",
      repo: { id: 482910238, name: "acme-webapp", full_name: "acme-inc/acme-webapp" },
    },
    author_association: "MEMBER",
  },
  repository: {
    id: 482910238,
    name: "acme-webapp",
    full_name: "acme-inc/acme-webapp",
    html_url: "https://github.com/acme-inc/acme-webapp",
    private: false,
    default_branch: "main",
    owner: {
      login: "acme-inc",
      id: 98765,
      avatar_url: "https://avatars.githubusercontent.com/u/98765?v=4",
      html_url: "https://github.com/acme-inc",
      type: "Organization",
    },
  },
  sender: {
    login: "adalovelace",
    id: 12345,
    avatar_url: "https://avatars.githubusercontent.com/u/12345?v=4",
    html_url: "https://github.com/adalovelace",
    type: "User",
  },
  installation: { id: 5551234 },
};

/**
 * A closed-but-NOT-merged PR: `merged: false`, a `wontfix` label, and a longer
 * closed_at window — the listener must discard these.
 */
export const closedUnmergedPullRequestWebhook: GitHubPullRequestClosedEvent = {
  action: "closed",
  number: 137,
  pull_request: {
    number: 137,
    state: "closed",
    locked: false,
    title: "Experiment: replace REST client with gRPC",
    body: "Spike exploring a gRPC-based client. Closing without merging — revisit after the API team weighs in.",
    html_url: "https://github.com/acme-inc/acme-webapp/pull/137",
    user: {
      login: "gboole",
      id: 24680,
      avatar_url: "https://avatars.githubusercontent.com/u/24680?v=4",
      html_url: "https://github.com/gboole",
      type: "User",
    },
    labels: [
      { id: 9101, name: "wontfix", color: "ffffff", description: "This will not be worked on" },
    ],
    merged: false,
    merge_commit_sha: null,
    merged_at: null,
    closed_at: "2026-08-30T09:12:44Z",
    created_at: "2026-08-12T15:33:00Z",
    updated_at: "2026-08-30T09:12:44Z",
    head: {
      ref: "spike/grpc-client",
      sha: "f0e1d2c3b4a5968778695a4b3c2d1e0f9a8b7c6d",
      repo: { id: 482910238, name: "acme-webapp", full_name: "acme-inc/acme-webapp" },
    },
    base: {
      ref: "main",
      sha: "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b",
      repo: { id: 482910238, name: "acme-webapp", full_name: "acme-inc/acme-webapp" },
    },
    author_association: "CONTRIBUTOR",
  },
  repository: {
    id: 482910238,
    name: "acme-webapp",
    full_name: "acme-inc/acme-webapp",
    html_url: "https://github.com/acme-inc/acme-webapp",
    private: false,
    default_branch: "main",
    owner: {
      login: "acme-inc",
      id: 98765,
      avatar_url: "https://avatars.githubusercontent.com/u/98765?v=4",
      html_url: "https://github.com/acme-inc",
      type: "Organization",
    },
  },
  sender: {
    login: "gboole",
    id: 24680,
    avatar_url: "https://avatars.githubusercontent.com/u/24680?v=4",
    html_url: "https://github.com/gboole",
    type: "User",
  },
  installation: { id: 5551234 },
};

/** A fake `X-GitHub-Delivery` header value for webhook signature tests. */
export const mockGithubDeliveryId = "9f8e7d6c-5b4a-4d3c-2b1a-098765432109";

/** A fake HMAC signature for `X-Hub-Signature-256` tests (secret: "test-secret"). */
export const mockGithubSignature =
  "sha256=5b51a6b3e3f9a2c1e0d9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d";