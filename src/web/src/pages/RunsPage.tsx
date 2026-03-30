import {
  ListPageLayout,
  PageHeader,
  EmptyState,
} from "../components";
import { RunFilterBar } from "../components/organisms/RunFilterBar";
import { RunTable } from "../components/organisms/RunTable";
import { Pagination } from "../components/molecules/Pagination";
import { useRunSearch } from "../hooks/useRunSearch";

export function RunsPage() {
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
  } = useRunSearch();

  return (
    <ListPageLayout>
      <PageHeader
        title="Runs"
        subtitle="Browse and filter agent run history."
        style={{ marginBottom: "1.5rem" }}
      />

      <RunFilterBar
        filters={filters}
        onFilterChange={updateFilter}
        onClear={clearFilters}
      />

      {entries.length > 0 && (
        <RunTable entries={entries} />
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
          message="No run entries match your filters."
          variant="card"
        />
      )}
    </ListPageLayout>
  );
}
