import {
  ListPageLayout,
  PageHeader,
  EmptyState,
} from "../components";
import { ActionLogFilterBar } from "../components/organisms/ActionLogFilterBar";
import { ActionLogTable } from "../components/organisms/ActionLogTable";
import { Pagination } from "../components/molecules/Pagination";
import { useActionLogSearch } from "../hooks/useActionLogSearch";

export function ActionLogPage() {
  const {
    entries,
    total,
    loading,
    filters,
    page,
    totalPages,
    setPage,
    updateFilter,
    clearFilters,
  } = useActionLogSearch();

  return (
    <ListPageLayout>
      <PageHeader
        title="Action Log"
        subtitle="Browse and filter action execution history."
        style={{ marginBottom: "1.5rem" }}
      />

      <ActionLogFilterBar
        filters={filters}
        onFilterChange={updateFilter}
        onClear={clearFilters}
      />

      {entries.length > 0 && (
        <ActionLogTable entries={entries} />
      )}

      {entries.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      )}

      {!loading && entries.length === 0 && (
        <EmptyState
          icon="list"
          message="No action log entries match your filters."
          variant="card"
        />
      )}
    </ListPageLayout>
  );
}
