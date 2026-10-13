import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Noun for the row count, e.g. "order" -> "12 orders". */
  label?: string;
  isLoading?: boolean;
  className?: string;
}

/**
 * Compact pager for offset-paginated tables. Deliberately shows the row range
 * rather than a long list of page numbers — admin tables can run to hundreds of
 * pages and a numeric strip stops being useful well before that.
 */
const TablePagination = ({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  label = "row",
  isLoading = false,
  className,
}: TablePaginationProps) => {
  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const plural = total === 1 ? label : `${label}s`;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row",
        className,
      )}>
      <p
        className="text-sm text-muted-foreground"
        aria-live="polite"
        aria-atomic="true">
        Showing <span className="font-medium text-foreground">{first}</span>–
        <span className="font-medium text-foreground">{last}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span> {plural}
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}>
          <ChevronLeft size={16} />
          Previous
        </Button>
        <span className="px-1 text-sm text-muted-foreground">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}>
          Next
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
};

export default TablePagination;
