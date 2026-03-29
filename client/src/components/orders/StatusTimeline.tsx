import type { StatusHistoryEntry } from "../../types/api";
import { ORDER_STATUS_CONFIG } from "../../lib/constants";

interface StatusTimelineProps {
  history: StatusHistoryEntry[];
}

export default function StatusTimeline({ history }: StatusTimelineProps) {
  const sorted = [...history].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className="space-y-4">
      {sorted.map((entry, i) => {
        const config = ORDER_STATUS_CONFIG[entry.status];
        const isLast = i === sorted.length - 1;

        return (
          <div key={entry.id} className="relative flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`h-3 w-3 rounded-full ${isLast ? "bg-indigo-600" : "bg-gray-300"}`}
              />
              {!isLast && <div className="h-full w-px bg-gray-200" />}
            </div>
            <div className="pb-4">
              <p className="text-sm font-medium text-gray-900">
                {config.label}
              </p>
              {entry.note && (
                <p className="text-sm text-gray-500">{entry.note}</p>
              )}
              <p className="text-xs text-gray-400">
                {new Date(entry.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
