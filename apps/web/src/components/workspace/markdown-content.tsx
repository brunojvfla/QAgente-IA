import ReactMarkdown, { Components } from "react-markdown";
import Link from "next/link";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

const components: Components = {
  a: ({ children, href }) => {
    const path = typeof href === "string"
      ? href.split("?")[0].split("/").filter(Boolean)
      : [];
    const isToolLink =
      path.length === 3 &&
      path[0] === "work" &&
      path[1] === "tools" &&
      ["requirement-analysis", "risk-analysis", "test-cases", "bdd"].includes(path[2]);

    return isToolLink && typeof href === "string" ? (
      <Link href={href} className="font-medium text-brand underline underline-offset-2">
        {children}
      </Link>
    ) : (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-brand underline underline-offset-2"
      >
        {children}
      </a>
    );
  },
  h1: ({ children }) => <h1 className="mb-3 mt-5 text-lg font-bold">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-4 text-base font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-3 text-sm font-semibold">{children}</h3>,
  p: ({ children }) => <p className="my-2 whitespace-pre-wrap">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-brand/50 pl-3 text-muted">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => (
    <pre className="my-3 max-w-full overflow-x-auto rounded-lg bg-background p-3 text-xs leading-5">
      {children}
    </pre>
  ),
  code: ({ children, className }) => (
    <code className={className || "rounded bg-background px-1 py-0.5 text-[0.9em]"}>
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="my-3 max-w-full overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-default bg-background px-2 py-1.5 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border border-default px-2 py-1.5">{children}</td>,
  hr: () => <hr className="my-4 border-default" />,
};

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="break-words [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
