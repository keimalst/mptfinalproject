"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Menyegarkan halaman detail saat status/riwayat surat berubah (stepper real-time). */
export function RealtimeRefresh({ documentId }: { documentId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`doc-${documentId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "document_status_history", filter: `document_id=eq.${documentId}` }, () => router.refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [documentId, router]);
  return null;
}
