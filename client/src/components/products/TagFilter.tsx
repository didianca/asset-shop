import { useState, useRef, useEffect } from "react";
import { cn } from "../../lib/utils";

interface TagFilterProps {
  tags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

export default function TagFilter({
  tags,
  selectedTags,
  onToggleTag,
}: TagFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (tags.length === 0) return null;

  const count = selectedTags.length;

  return (
    <div ref={ref} className="relative">
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Tags
      </label>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500",
          count > 0
            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
            : "border-gray-300 bg-white text-gray-700",
        )}
      >
        {count > 0 ? `Tags (${count})` : "All tags"}
        <svg
          className={cn(
            "h-4 w-4 transition-transform",
            open && "rotate-180",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 max-h-60 w-48 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {tags.map((tag) => {
            const checked = selectedTags.includes(tag);
            return (
              <label
                key={tag}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleTag(tag)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                {tag}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
