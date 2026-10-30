import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { APP_VERSION } from "@/lib/version";

export default async function ChangelogPage() {
  const raw = await readFile(path.join(process.cwd(), "CHANGELOG.md"), "utf8");
  const body = raw
    .replace(/^# Changelog\s*/, "")
    .trim()
    .split("\n")
    .map((line) => {
      if (line.startsWith("## ")) return { type: "h2" as const, text: line.slice(3) };
      if (line.startsWith("### ")) return { type: "h3" as const, text: line.slice(4) };
      if (line.startsWith("- ")) return { type: "li" as const, text: line.slice(2) };
      if (line.startsWith("[")) return { type: "skip" as const, text: line };
      if (!line.trim()) return { type: "blank" as const, text: "" };
      return { type: "p" as const, text: line };
    });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Link href="/settings">Settings</Link>}
        title="Changelog"
        description={`Current version ${APP_VERSION}.`}
      />
      <Card className="prose prose-slate max-w-none space-y-3 p-5 text-sm">
        {body.map((row, i) => {
          switch (row.type) {
            case "h2":
              return (
                <h2 key={i} className="mt-6 border-t border-slate-100 pt-4 text-base font-semibold text-slate-900 first:mt-0 first:border-0 first:pt-0">
                  {row.text}
                </h2>
              );
            case "h3":
              return (
                <h3 key={i} className="text-sm font-semibold text-slate-800">
                  {row.text}
                </h3>
              );
            case "li":
              return (
                <li key={i} className="ml-5 list-disc text-slate-700">
                  {row.text}
                </li>
              );
            case "p":
              return (
                <p key={i} className="text-slate-600">
                  {row.text}
                </p>
              );
            case "blank":
              return <div key={i} className="h-1" />;
            case "skip":
              return null;
            default: {
              const unreachable: never = row;
              return unreachable;
            }
          }
        })}
      </Card>
    </div>
  );
}
