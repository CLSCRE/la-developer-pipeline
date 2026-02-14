"use client";

import { format } from "date-fns";
import { Mail, Phone, Linkedin, MessageSquare, Database } from "lucide-react";

interface Activity {
  id: string;
  type: string;
  subject?: string | null;
  status: string;
  createdAt: string;
  developer?: { id: string; name: string } | null;
  project?: { id: string; address: string } | null;
}

interface ScrapeRun {
  id: string;
  source: string;
  status: string;
  recordsFound: number;
  recordsNew: number;
  startedAt: string;
}

interface ActivityTimelineProps {
  outreach: Activity[];
  scrapes: ScrapeRun[];
}

const typeIcons: Record<string, React.ReactNode> = {
  email: <Mail size={14} className="text-blue-500" />,
  phone: <Phone size={14} className="text-green-500" />,
  linkedin: <Linkedin size={14} className="text-violet-500" />,
  other: <MessageSquare size={14} className="text-slate-400" />,
  scrape: <Database size={14} className="text-amber-500" />,
};

type TimelineItem = { time: Date; kind: "outreach"; data: Activity } | { time: Date; kind: "scrape"; data: ScrapeRun };

export default function ActivityTimeline({ outreach, scrapes }: ActivityTimelineProps) {
  const items: TimelineItem[] = [
    ...outreach.map((o) => ({ time: new Date(o.createdAt), kind: "outreach" as const, data: o })),
    ...scrapes.map((s) => ({ time: new Date(s.startedAt), kind: "scrape" as const, data: s })),
  ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 20);

  if (items.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">No recent activity</p>;
  }

  return (
    <div className="space-y-0">
      {items.map((item) => (
        <div key={`${item.kind}-${item.kind === "outreach" ? item.data.id : item.data.id}`} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0">
          <div className="mt-0.5">
            {item.kind === "scrape" ? typeIcons.scrape : typeIcons[(item.data as Activity).type] || typeIcons.other}
          </div>
          <div className="flex-1 min-w-0">
            {item.kind === "outreach" ? (
              <>
                <p className="text-sm text-slate-900">
                  {(item.data as Activity).subject || `${(item.data as Activity).type} outreach`}
                  {(item.data as Activity).developer && (
                    <span className="text-slate-500"> — {(item.data as Activity).developer!.name}</span>
                  )}
                </p>
                {(item.data as Activity).project && (
                  <p className="text-xs text-slate-400">re: {(item.data as Activity).project!.address}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-900">
                Scrape: {(item.data as ScrapeRun).source.toUpperCase()} — {(item.data as ScrapeRun).recordsFound} found, {(item.data as ScrapeRun).recordsNew} new
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${(item.data as ScrapeRun).status === "completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {(item.data as ScrapeRun).status}
                </span>
              </p>
            )}
            <p className="text-xs text-slate-400 mt-0.5">
              {format(item.time, "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
