import {
  ListPageLayout,
  PageHeader,
  EmptyState,
} from "../components";
import { SessionTable } from "../components/organisms/SessionTable";
import { Pagination } from "../components/molecules/Pagination";
import { useSessions } from "../hooks/useSessions";

export function SessionsPage() {
  const {
    entries,
    total,
    loading,
    page,
    totalPages,
    setPage,
  } = useSessions();

  return (
    <ListPageLayout>
      <PageHeader
        title="Sessions"
        subtitle="Conversational sessions across projects."
        style={{ marginBottom: "1.5rem" }}
      />

      {entries.length > 0 && (
        <SessionTable entries={entries} />
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
          message="No sessions yet."
          variant="card"
        />
      )}
    </ListPageLayout>
  );
}
