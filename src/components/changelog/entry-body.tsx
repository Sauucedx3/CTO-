import { cn } from "cn";
import { parseBody, parseInline } from "@/lib/changelog/body";

/**
 * Renders an entry body — paragraphs, bullet lists and inline `code` spans.
 * Presentational only (no hooks), so it is safe on the server and inside the
 * client search island.
 */
export function EntryBody({
  body,
  className,
}: {
  body: string;
  className?: string;
}) {
  const blocks = parseBody(body);
  if (blocks.length === 0) return null;

  return (
    <div className={cn("space-y-3 text-sm leading-relaxed", className)}>
      {blocks.map((block, blockIndex) =>
        block.kind === "paragraph" ? (
          <p key={blockIndex} className="text-pretty text-muted-foreground">
            {parseInline(block.text).map((token, tokenIndex) =>
              token.kind === "code" ? (
                <code
                  key={tokenIndex}
                  className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.8em] text-foreground"
                >
                  {token.value}
                </code>
              ) : (
                <span key={tokenIndex}>{token.value}</span>
              ),
            )}
          </p>
        ) : (
          <ul key={blockIndex} className="space-y-1.5">
            {block.items.map((item, itemIndex) => (
              <li
                key={itemIndex}
                className="flex gap-2.5 text-muted-foreground"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60"
                />
                <span className="text-pretty">
                  {parseInline(item).map((token, tokenIndex) =>
                    token.kind === "code" ? (
                      <code
                        key={tokenIndex}
                        className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.8em] text-foreground"
                      >
                        {token.value}
                      </code>
                    ) : (
                      <span key={tokenIndex}>{token.value}</span>
                    ),
                  )}
                </span>
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
