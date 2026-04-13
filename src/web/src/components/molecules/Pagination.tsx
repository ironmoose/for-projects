import { semantic as t } from "@4lt7ab/ui/core";
import { Button } from "../atoms/Button";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: t.spaceMd,
        padding: `${t.spaceLg} 0`,
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
          fontSize: t.fontSizeSm,
          color: t.colorTextMuted,
          fontFamily: t.fontSans,
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
