import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsonError } from "@/lib/api";
import { SUPABASE_URL } from "@/lib/supabase/env";

/**
 * POST /api/cron/reminders — eksekusi RPC send_due_task_reminders() untuk tenggat < 24 jam.
 * Dilindungi header Authorization: Bearer <CRON_SECRET> dan memakai SUPABASE_SERVICE_ROLE_KEY.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !serviceKey) {
    return jsonError(500, "CRON_SECRET atau SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.");
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${secret}`) {
    return jsonError(401, "Token cron tidak valid.");
  }

  const adminSupabase = createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await adminSupabase.rpc("send_due_task_reminders");
  if (error) {
    console.error("[cron/reminders]", error);
    return jsonError(500, "Gagal menjalankan auto-reminder.");
  }

  return NextResponse.json({ reminders_sent: data ?? 0, executed_at: new Date().toISOString() });
}
