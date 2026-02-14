"use client";

interface LeadScoreBadgeProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
}

export function LeadScoreBadge({ score, size = "md" }: LeadScoreBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <div className={`inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-400 font-medium ${
        size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-lg" : "w-10 h-10 text-sm"
      }`}>
        --
      </div>
    );
  }

  let bgColor: string;
  let textColor: string;
  let ringColor: string;

  if (score >= 70) {
    bgColor = "bg-green-100";
    textColor = "text-green-700";
    ringColor = "ring-green-300";
  } else if (score >= 40) {
    bgColor = "bg-amber-100";
    textColor = "text-amber-700";
    ringColor = "ring-amber-300";
  } else {
    bgColor = "bg-slate-100";
    textColor = "text-slate-500";
    ringColor = "ring-slate-200";
  }

  const sizeClasses = size === "sm"
    ? "w-8 h-8 text-xs"
    : size === "lg"
      ? "w-14 h-14 text-lg"
      : "w-10 h-10 text-sm";

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full ring-2 font-bold ${bgColor} ${textColor} ${ringColor} ${sizeClasses}`}
      title={`Lead Score: ${score}/100`}
    >
      {score}
    </div>
  );
}
