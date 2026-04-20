import type { Tables } from "./database";

export type Character = Tables<"characters">;
export type CharacterRanking = Tables<"character_rankings">;
export type Item = Tables<"items">;
export type Build = Tables<"builds">;
export type BuildReaction = Tables<"build_reactions">;
export type BuildComment = Tables<"build_comments">;
export type BuildCommentReaction = Tables<"build_comment_reactions">;
export type Tier = Tables<"tiers">;
export type TierReaction = Tables<"tier_reactions">;
export type TierComment = Tables<"tier_comments">;
export type TierCommentReaction = Tables<"tier_comment_reactions">;
