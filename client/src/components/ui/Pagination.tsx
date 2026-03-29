import Button from "./Button";

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  total,
  limit,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-sm text-gray-600">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
