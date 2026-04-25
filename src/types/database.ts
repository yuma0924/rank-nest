/**
 * Supabase Database 型定義
 * supabase/migrations/ のスキーマと同期すること
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      characters: {
        Row: {
          id: string;
          slug: string;
          name: string;
          rarity: string | null;
          element: string | null;
          role: string | null;
          race: string | null;
          position: string | null;
          attack_type: string | null;
          stats: Json;
          skills: Json;
          metadata: Json;
          image_url: string | null;
          favorite_item_id: string | null;

          is_hidden: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          rarity?: string | null;
          element?: string | null;
          role?: string | null;
          race?: string | null;
          position?: string | null;
          attack_type?: string | null;
          stats?: Json;
          skills?: Json;
          metadata?: Json;
          image_url?: string | null;
          favorite_item_id?: string | null;

          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          rarity?: string | null;
          element?: string | null;
          role?: string | null;
          race?: string | null;
          position?: string | null;
          attack_type?: string | null;
          stats?: Json;
          skills?: Json;
          metadata?: Json;
          image_url?: string | null;
          favorite_item_id?: string | null;

          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          character_id: string;
          user_hash: string;
          comment_type: "vote" | "board";
          rating: number | null;
          body: string | null;
          display_name: string | null;
          is_latest_vote: boolean | null;
          is_deleted: boolean;
          thumbs_up_count: number;
          thumbs_down_count: number;
          image_url: string | null;
          game_slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          character_id: string;
          user_hash: string;
          comment_type: "vote" | "board";
          rating?: number | null;
          body?: string | null;
          display_name?: string | null;
          is_latest_vote?: boolean | null;
          is_deleted?: boolean;
          thumbs_up_count?: number;
          thumbs_down_count?: number;
          image_url?: string | null;
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          character_id?: string;
          user_hash?: string;
          comment_type?: "vote" | "board";
          rating?: number | null;
          body?: string | null;
          display_name?: string | null;
          is_latest_vote?: boolean | null;
          is_deleted?: boolean;
          thumbs_up_count?: number;
          thumbs_down_count?: number;
          image_url?: string | null;
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: false;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
        ];
      };
      character_rankings: {
        Row: {
          character_id: string;
          avg_rating: number;
          valid_votes_count: number;
          board_comments_count: number;
          rank: number | null;
          updated_at: string;
        };
        Insert: {
          character_id: string;
          avg_rating?: number;
          valid_votes_count?: number;
          board_comments_count?: number;
          rank?: number | null;
          updated_at?: string;
        };
        Update: {
          character_id?: string;
          avg_rating?: number;
          valid_votes_count?: number;
          board_comments_count?: number;
          rank?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "character_rankings_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: true;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
        ];
      };
      comment_reactions: {
        Row: {
          id: string;
          comment_id: string;
          user_hash: string;
          reaction_type: "up" | "down";
          game_slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          comment_id: string;
          user_hash: string;
          reaction_type: "up" | "down";
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          comment_id?: string;
          user_hash?: string;
          reaction_type?: "up" | "down";
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };
      site_config: {
        Row: {
          id: number;
          display_name: string;
          labels: Json;
          description: string | null;
        };
        Insert: {
          id: number;
          display_name?: string;
          labels?: Json;
          description?: string | null;
        };
        Update: {
          id?: number;
          display_name?: string;
          labels?: Json;
          description?: string | null;
        };
        Relationships: [];
      };
      blacklist: {
        Row: {
          id: string;
          user_hash: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_hash: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_hash?: string;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      builds: {
        Row: {
          id: string;
          mode: "general" | "arena" | "dimension" | "world_tree";
          party_size: number;
          members: string[];
          element_label: string | null;
          title: string | null;
          display_name: string | null;
          comment: string;
          user_hash: string;
          likes_count: number;
          dislikes_count: number;
          is_deleted: boolean;
          game_slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mode: "general" | "arena" | "dimension" | "world_tree";
          party_size: number;
          members: string[];
          element_label?: string | null;
          title?: string | null;
          display_name?: string | null;
          comment: string;
          user_hash: string;
          likes_count?: number;
          dislikes_count?: number;
          is_deleted?: boolean;
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mode?: "general" | "arena" | "dimension" | "world_tree";
          party_size?: number;
          members?: string[];
          element_label?: string | null;
          title?: string | null;
          display_name?: string | null;
          comment?: string;
          user_hash?: string;
          likes_count?: number;
          dislikes_count?: number;
          is_deleted?: boolean;
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      build_reactions: {
        Row: {
          id: string;
          build_id: string;
          user_hash: string;
          reaction_type: "up" | "down";
          game_slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          build_id: string;
          user_hash: string;
          reaction_type: "up" | "down";
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          build_id?: string;
          user_hash?: string;
          reaction_type?: "up" | "down";
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "build_reactions_build_id_fkey";
            columns: ["build_id"];
            isOneToOne: false;
            referencedRelation: "builds";
            referencedColumns: ["id"];
          },
        ];
      };
      build_comments: {
        Row: {
          id: string;
          build_id: string;
          user_hash: string;
          display_name: string | null;
          body: string;
          is_deleted: boolean;
          thumbs_up_count: number;
          thumbs_down_count: number;
          game_slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          build_id: string;
          user_hash: string;
          display_name?: string | null;
          body: string;
          is_deleted?: boolean;
          thumbs_up_count?: number;
          thumbs_down_count?: number;
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          build_id?: string;
          user_hash?: string;
          display_name?: string | null;
          body?: string;
          is_deleted?: boolean;
          thumbs_up_count?: number;
          thumbs_down_count?: number;
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "build_comments_build_id_fkey";
            columns: ["build_id"];
            isOneToOne: false;
            referencedRelation: "builds";
            referencedColumns: ["id"];
          },
        ];
      };
      build_comment_reactions: {
        Row: {
          id: string;
          build_comment_id: string;
          user_hash: string;
          reaction_type: "up" | "down";
          game_slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          build_comment_id: string;
          user_hash: string;
          reaction_type: "up" | "down";
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          build_comment_id?: string;
          user_hash?: string;
          reaction_type?: "up" | "down";
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "build_comment_reactions_build_comment_id_fkey";
            columns: ["build_comment_id"];
            isOneToOne: false;
            referencedRelation: "build_comments";
            referencedColumns: ["id"];
          },
        ];
      };
      character_rewards: {
        Row: {
          character_id: string;
          item_id: string;
          sort_order: number;
        };
        Insert: {
          character_id: string;
          item_id: string;
          sort_order?: number;
        };
        Update: {
          character_id?: string;
          item_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "character_rewards_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: false;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "character_rewards_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      items: {
        Row: {
          id: string;
          name: string;
          image_url: string | null;
          item_type: "favorite" | "reward";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          image_url?: string | null;
          item_type: "favorite" | "reward";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          image_url?: string | null;
          item_type?: "favorite" | "reward";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tiers: {
        Row: {
          id: string;
          title: string | null;
          display_name: string | null;
          description: string | null;
          data: Record<string, string[]>;
          user_hash: string;
          likes_count: number;
          is_deleted: boolean;
          game_slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title?: string | null;
          display_name?: string | null;
          description?: string | null;
          data: Record<string, string[]>;
          user_hash: string;
          likes_count?: number;
          is_deleted?: boolean;
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string | null;
          display_name?: string | null;
          description?: string | null;
          data?: Record<string, string[]>;
          user_hash?: string;
          likes_count?: number;
          is_deleted?: boolean;
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tier_reactions: {
        Row: {
          id: string;
          tier_id: string;
          user_hash: string;
          reaction_type: "up";
          game_slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tier_id: string;
          user_hash: string;
          reaction_type?: "up";
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tier_id?: string;
          user_hash?: string;
          reaction_type?: "up";
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tier_reactions_tier_id_fkey";
            columns: ["tier_id"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["id"];
          },
        ];
      };
      tier_comments: {
        Row: {
          id: string;
          tier_id: string;
          user_hash: string;
          display_name: string | null;
          body: string;
          is_deleted: boolean;
          thumbs_up_count: number;
          thumbs_down_count: number;
          game_slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tier_id: string;
          user_hash: string;
          display_name?: string | null;
          body: string;
          is_deleted?: boolean;
          thumbs_up_count?: number;
          thumbs_down_count?: number;
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tier_id?: string;
          user_hash?: string;
          display_name?: string | null;
          body?: string;
          is_deleted?: boolean;
          thumbs_up_count?: number;
          thumbs_down_count?: number;
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tier_comments_tier_id_fkey";
            columns: ["tier_id"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["id"];
          },
        ];
      };
      tier_comment_reactions: {
        Row: {
          id: string;
          tier_comment_id: string;
          user_hash: string;
          reaction_type: "up" | "down";
          game_slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tier_comment_id: string;
          user_hash: string;
          reaction_type: "up" | "down";
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tier_comment_id?: string;
          user_hash?: string;
          reaction_type?: "up" | "down";
          game_slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tier_comment_reactions_tier_comment_id_fkey";
            columns: ["tier_comment_id"];
            isOneToOne: false;
            referencedRelation: "tier_comments";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          target_type: "comment" | "build" | "build_comment" | "tier_comment";
          target_id: string;
          user_hash: string;
          reason: string | null;
          status: "pending" | "resolved" | "dismissed";
          game_slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_type: "comment" | "build" | "build_comment" | "tier_comment";
          target_id: string;
          user_hash: string;
          reason?: string | null;
          status?: "pending" | "resolved" | "dismissed";
          game_slug?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          target_type?: "comment" | "build" | "build_comment" | "tier_comment";
          target_id?: string;
          user_hash?: string;
          reason?: string | null;
          status?: "pending" | "resolved" | "dismissed";
          game_slug?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ユーティリティ型
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// 共通テーブルのエイリアス（ゲーム横断で同じ構造）
export type Comment = Tables<"comments">;
export type CommentReaction = Tables<"comment_reactions">;
export type SiteConfig = Tables<"site_config">;
export type Blacklist = Tables<"blacklist">;
export type Report = Tables<"reports">;
