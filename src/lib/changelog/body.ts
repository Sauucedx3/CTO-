/**
 * ChangelogSync — a deliberately tiny body renderer.
 *
 * Entry bodies are written by the workspace owner in a small markdown subset:
 * blank-line separated paragraphs, `- ` / `* ` bullet lists, and inline
 * `` `code` `` spans. That is all the public timeline needs, so there is NO
 * markdown dependency in the bundle — see the PR description for the rationale.
 *
 * The body is parsed to a typed block list here; `entry-body.tsx` renders it.
 */

/** A block of rendered content. */
export type BodyBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };

/** An inline run — plain text, or a `` `code` `` span. */
export interface InlineToken {
  kind: "text" | "code";
  value: string;
}

const BULLET_RE = /^[-*]\s+(.*)$/;

/** Split a body into paragraphs and bullet lists. Never throws. */
export function parseBody(body: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  let paragraph: string[] = [];
  let items: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (items.length > 0) {
      blocks.push({ kind: "list", items });
      items = [];
    }
  };

  for (const rawLine of body.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (line.length === 0) {
      flushParagraph();
      flushList();
      continue;
    }
    const bullet = BULLET_RE.exec(line);
    if (bullet) {
      flushParagraph();
      items.push(bullet[1].trim());
      continue;
    }
    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

/** True when the body has nothing renderable left. */
export function isEmptyBody(body: string): boolean {
  return parseBody(body).length === 0;
}

/** Split text on backticks into alternating plain/code runs. */
export function parseInline(text: string): InlineToken[] {
  return text
    .split("`")
    .map((value, index) => ({
      kind: index % 2 === 1 ? ("code" as const) : ("text" as const),
      value,
    }))
    .filter((token) => token.value.length > 0);
}

/** Flatten a body to plain text — used to build the client-side search index. */
export function bodyToPlainText(body: string): string {
  return parseBody(body)
    .map((block) =>
      block.kind === "paragraph" ? block.text : block.items.join(" "),
    )
    .join(" ")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
