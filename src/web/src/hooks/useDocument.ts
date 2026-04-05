import { useEffect, useRef, useState } from "react";
import { ApiError, fetchDocument as apiFetchDocument, updateDocuments, deleteDocuments } from "../api";
import type { ReferencedByEntry } from "../api";
import type { Document } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

type DocumentWithTags = Document & { tags: string[]; referenced_by: ReferencedByEntry[] };

export function useDocument(documentId: string) {
  const [document, setDocument] = useState<DocumentWithTags | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  const documentIdRef = useRef(documentId);
  documentIdRef.current = documentId;

  async function loadDocument() {
    try {
      const d = await apiFetchDocument(documentIdRef.current);
      setDocument(d);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        showToast(err instanceof ApiError ? err.message : "Failed to load document");
      }
    } finally {
      setLoading(false);
    }
  }

  const loadDocumentRef = useRef(loadDocument);
  loadDocumentRef.current = loadDocument;

  const throttledLoad = useThrottledCallback(() => {
    loadDocumentRef.current();
  }, 200);

  useEffect(() => {
    setNotFound(false);
    setDocument(null);
    setLoading(true);
    loadDocument();

    return subscribeEvents((event) => {
      if (event.entity_type === "document") {
        throttledLoad();
      }
    });
  }, [documentId, subscribeEvents, throttledLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateDocument(input: { title?: string; summary?: string | null; content?: string | null; tags?: string[]; favorite?: boolean }): Promise<boolean> {
    if (!document) return false;
    try {
      await updateDocuments([{ id: document.id, ...input }]);
      return true;
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update document");
      return false;
    }
  }

  async function removeDocument() {
    if (!document) return;
    await deleteDocuments([document.id]);
  }

  return { document, notFound, loading, updateDocument, removeDocument };
}
