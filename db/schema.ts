import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const runnerProfiles = sqliteTable("runner_profiles", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  homeCity: text("home_city"),
  preferredPace: text("preferred_pace"),
  weeklyGoalKm: integer("weekly_goal_km").notNull().default(10),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const savedRunPlans = sqliteTable(
  "saved_run_plans",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    filterCity: text("filter_city"),
    filterDistanceKm: integer("filter_distance_km"),
    filterPace: text("filter_pace"),
    filterSocial: text("filter_social"),
    eventIdsJson: text("event_ids_json").notNull(),
    totalDistanceKm: integer("total_distance_km").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_saved_run_plans_user_created").on(table.userId, table.createdAt)],
);

export const runPasses = sqliteTable(
  "run_passes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    eventId: text("event_id").notNull(),
    runnerName: text("runner_name").notNull(),
    email: text("email").notNull(),
    emergencyContact: text("emergency_contact").notNull(),
    pace: text("pace").notNull(),
    socialPreference: text("social_preference").notNull(),
    age20Plus: integer("age_20_plus", { mode: "boolean" }).notNull(),
    transportMode: text("transport_mode").notNull(),
    rulesAccepted: integer("rules_accepted", { mode: "boolean" }).notNull(),
    privacyAccepted: integer("privacy_accepted", { mode: "boolean" }).notNull(),
    status: text("status").notNull().default("confirmed"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("idx_run_passes_user_created").on(table.userId, table.createdAt)],
);
