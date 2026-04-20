import { createAdminClient } from "@/lib/supabase/admin";
import { ItemEditor } from "../../_components/item-editor";
import type { Item } from "@/types/trickcal";

export default async function ItemsManagePage() {
  const supabase = createAdminClient();
  const { data: items, error } = await supabase
    .from("items")
    .select("*")
    .order("item_type")
    .order("name")
    .returns<Item[]>();

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-text-primary">アイテム管理</h1>
        <div className="rounded-xl border border-thumbs-down/30 bg-thumbs-down/5 p-4 text-sm text-thumbs-down">
          データの取得に失敗しました: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-text-primary">アイテム管理</h1>
        <p className="mt-1 text-sm text-text-secondary">
          大好物・アルバイト報酬アイテムの登録・編集
        </p>
      </div>
      <ItemEditor initialItems={items ?? []} />
    </div>
  );
}
