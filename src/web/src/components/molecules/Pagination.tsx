import { Button, useTheme } from "..";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: theme.spacing.md,
        padding: `${theme.spacing.lg} 0`,
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Prev
      </Button>
      <span
        style={{
          fontSize: theme.font.size.sm,
          color: theme.color.textMuted,
          fontFamily: theme.font.body,
        }}
      >
        Page {page} of {totalPages} ({total} total)
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
