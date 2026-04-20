import type { Metadata } from "next";
import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAllVisibleCharacters,
  getBuildByIdCached,
} from "@/lib/trickcal/cached-queries";
import { notFound } from "next/navigation";
import { BuildDetailClient } from "./build-detail-client";


export const revalidate = 60;

type CharacterInfo = {
  id: string;
  name: string;
  slug: string;
  element: string | null;
  position: string | null;
  image_url: string | null;
  is_hidden: boolean;
};

import { BUILD_MODE_LABEL_MAP } from "@/lib/trickcal/constants";
import type { BuildMode } from "@/lib/trickcal/constants";

type BuildData = {
  id: string;
  mode: BuildMode;
  party_size: number;
  members: (string | null)[];
  element_label: string | null;
  title: string | null;
  display_name: string | null;
  comment: string;
  likes_count: number;
  dislikes_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  user_hash: string;
};

type SimilarBuild = {
  id: string;
  mode: BuildMode;
  title: string | null;
  display_name: string | null;
  comment: string;
  element_label: string | null;
  likes_count: number;
  members_detail: CharacterInfo[];
  updated_at: string;
};

const getBuild = async (buildId: string): Promise<BuildData | null> => {
  const b = await getBuildByIdCached(buildId);
  return b as unknown as BuildData | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ buildId: string }>;
}): Promise<Metadata> {
  const { buildId } = await params;
  const build = await getBuild(buildId);

  if (!build) {
    return {
      title: "編成が見つかりません | みんなで決めるトリッカルランキング",
    };
  }

  const modeLabel = BUILD_MODE_LABEL_MAP[build.mode] ?? build.mode;
  const title = build.title || `${build.element_label ?? ""}${modeLabel}`;

  return {
    title: `${title} | 人気編成ランキング | みんなで決めるトリッカルランキング`,
    description: `トリッカルの編成「${title}」の詳細・コメント`,
    alternates: {
      canonical: `/trickcal/builds/${buildId}`,
    },
  };
}

export default async function BuildDetailPage({
  params,
}: {
  params: Promise<{ buildId: string }>;
}) {
  const { buildId } = await params;
  const supabase = createAdminClient();

  const [build, allChars] = await Promise.all([
    getBuild(buildId),
    getAllVisibleCharacters(),
  ]);

  if (!build) {
    notFound();
  }

  if (build.is_deleted) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-text-secondary">この編成は削除されました</p>
      </div>
    );
  }

  const actualMemberIds = build.members.filter((id): id is string => id !== null);

  // similar builds + コメントを並列
  const [{ data: rawCandidates }, commentsResult] = await Promise.all([
    supabase
      .from("builds")
      .select("*")
      .eq("is_deleted", false)
      .neq("id", buildId)
      .eq("mode", build.mode)
      .order("likes_count", { ascending: false })
      .limit(20),
    supabase
      .from("build_comments")
      .select("id, build_id, display_name, body, thumbs_up_count, thumbs_down_count, created_at, is_deleted")
      .eq("build_id", buildId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(21),
  ]);

  const charMap = new Map(
    allChars.map((c) => [c.id, c as CharacterInfo])
  );

  const membersDetail = actualMemberIds.map(
    (id) =>
      charMap.get(id) ?? {
        id,
        name: "不明",
        slug: "",
        element: null,
        position: null,
        image_url: null,
        is_hidden: false,
      }
  );

  const candidates = ((rawCandidates as BuildData[] | null) ?? [])
    .map((sb) => ({
      ...sb,
      commonCount: sb.members.filter((m): m is string => m !== null).filter((m) => actualMemberIds.includes(m)).length,
      sameElement: sb.element_label === build.element_label,
    }))
    .filter((sb) => sb.commonCount > 0 || sb.sameElement)
    .sort((a, b) => {
      if (b.commonCount !== a.commonCount) return b.commonCount - a.commonCount;
      return b.likes_count - a.likes_count;
    })
    .slice(0, 5);

  const similarBuilds: SimilarBuild[] = candidates.map((sb) => ({
    id: sb.id,
    mode: sb.mode,
    title: sb.title,
    display_name: sb.display_name,
    comment: sb.comment,
    element_label: sb.element_label,
    likes_count: sb.likes_count,
    members_detail: sb.members.filter((id): id is string => id !== null).map(
      (id) =>
        charMap.get(id) ?? {
          id,
          name: "不明",
          slug: "",
          element: null,
          position: null,
          image_url: null,
          is_hidden: false,
        }
    ),
    updated_at: sb.updated_at,
  }));

  const commentsRaw = commentsResult.data;
  const commentsData = (commentsRaw ?? []).slice(0, 20);
  const hasMoreComments = (commentsRaw ?? []).length > 20;

  return (
    <Suspense>
      <BuildDetailClient
        build={{
          id: build.id,
          mode: build.mode,
          party_size: build.party_size,
          element_label: build.element_label,
          title: build.title,
          display_name: build.display_name,
          comment: build.comment,
          likes_count: build.likes_count,
          dislikes_count: build.dislikes_count,
          created_at: build.created_at,
          updated_at: build.updated_at,
          members: build.members,
          members_detail: membersDetail,
        }}
        similarBuilds={similarBuilds}
        initialUserReaction={null}
        initialComments={{
          comments: commentsData.map((c) => ({
            id: c.id,
            build_id: c.build_id,
            display_name: c.display_name,
            body: c.body,
            thumbs_up_count: c.thumbs_up_count,
            thumbs_down_count: c.thumbs_down_count,
            created_at: c.created_at,
            user_reaction: null,
          })),
          hasMore: hasMoreComments,
        }}
      />
    </Suspense>
  );
}
