"use client";

import { format } from "date-fns";
import { Mail, Phone, Linkedin, MessageSquare } from "lucide-react";

interface OutreachEntry {
  id: string;
  type: string;
  subject?: string | null;
  body?: string | null;
  status: string;
  createdAt: string;
  sentAt?: string | null;
  developer?: { id: string; name: string } | null;
  project?: { id: string; address: string } | null;
}

interface OutreachTimelineProps {
  entries: OutreachEntry[];
}

const typeIcons: Record<string, React.ReactNode> = {
  email: <Mail size={14} />,
  phone: <Phone size={14} />,
  linkedin: <Linkedin size={14} />,
  other: <MessageSquare size={14} />,
};

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  opened: "bg-amber-100 text-amber-700",
  replied: "bg-green-100 text-green-700",
  bounced: "bg-red-100 text-red-700",
};

export default function OutreachTimeline({ entries }: OutreachTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400 text-sm">
        No outreach history yet
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {entries.map((entry) => (
        <div key={entry.id} className="px-5 py-3 flex items-start gap-3">
          <div className="mt-0.5 text-slate-400">
            {typeIcons[entry.type] || typeIcons.other}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900">
                {entry.subject || `${entry.type} outreach`}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColors[entry.status] || statusColors.draft}`}>
                {entry.status}
              </span>
            </div>
            {entry.body && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{entry.body}</p>
            )}
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span>{format(new Date(entry.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
              {entry.developer && <span>to {entry.developer.name}</span>}
              {entry.project && <span>re: {entry.project.address}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
