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
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const isSelected = selectedTags.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => onToggleTag(tag)}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              isSelected
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
