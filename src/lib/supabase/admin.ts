import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * API Route / Server Component 用 Supabase クライアント (service_role key)
 * RLS をバイパスし、全テーブルへの読み書きが可能
 * サーバーサイドでのみ使用すること
 *
 * モジュールスコープで singleton 化して毎リクエストの初期化コストを回避。
 * Supabase JS は内部で HTTP keep-alive するので同一インスタンス再利用で
 * TCP/TLS ハンドシェイクを減らせる。
 */
let cached: SupabaseClient<Database> | null = null;

export function createAdminClient(): SupabaseClient<Database> {
  if (cached) return cached;
  cached = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "X-Client-Info": "rank-nest-admin" } },
    }
  );
  return cached;
}
