import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { EXPERIENCE_LEVELS, SPLIT_PREFERENCES } from "@/lib/constants/assessment";
import { PLAN_GOALS } from "@/lib/constants/training";
import { RepositoryError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { AssessmentInput, SavedAssessment } from "./assessment-schema";

export interface AssessmentRepository {
  /** Saves the assessment and its equipment atomically; returns the new assessment id. */
  saveAssessment(input: AssessmentInput): Promise<string>;
  /** Newest assessment of the user, or null when there is none. */
  findLatestAssessment(userId: string): Promise<SavedAssessment | null>;
}

const SAVE_FUNCTION = "save_assessment";
const ASSESSMENT_COLUMNS =
  "id, created_at, goal, experience_level, days_per_week, session_minutes, split_preference, limitations, assessment_equipment(equipment(slug))";

const assessmentIdSchema = z.uuid();

const assessmentRowSchema = z.object({
  id: z.uuid(),
  created_at: z.string(),
  goal: z.enum(PLAN_GOALS),
  experience_level: z.enum(EXPERIENCE_LEVELS),
  days_per_week: z.number().int(),
  session_minutes: z.number().int(),
  split_preference: z.enum(SPLIT_PREFERENCES),
  limitations: z.string().nullable(),
  assessment_equipment: z.array(z.object({ equipment: z.object({ slug: z.string() }) })),
});

function mapAssessmentRow(row: z.infer<typeof assessmentRowSchema>): SavedAssessment {
  return {
    id: row.id,
    createdAt: row.created_at,
    goal: row.goal,
    experienceLevel: row.experience_level,
    daysPerWeek: row.days_per_week,
    sessionMinutes: row.session_minutes,
    splitPreference: row.split_preference,
    limitations: row.limitations,
    equipmentSlugs: row.assessment_equipment.map((item) => item.equipment.slug),
  };
}

function toSaveParameters(input: AssessmentInput) {
  return {
    p_goal: input.goal,
    p_experience_level: input.experienceLevel,
    p_days_per_week: input.daysPerWeek,
    p_session_minutes: input.sessionMinutes,
    p_split_preference: input.splitPreference,
    p_limitations: input.limitations,
    p_equipment_slugs: input.equipmentSlugs,
  };
}

/** Reads and writes through the user's Supabase session (RLS applies). */
export function createSupabaseAssessmentRepository(client: SupabaseClient): AssessmentRepository {
  return {
    async saveAssessment(input) {
      const { data, error } = await client.rpc(SAVE_FUNCTION, toSaveParameters(input));
      const assessmentId = assessmentIdSchema.safeParse(data);
      if (error || !assessmentId.success) throw new RepositoryError(translate("errors.internal"), "assessments.saveAssessment");
      return assessmentId.data;
    },
    async findLatestAssessment(userId) {
      const { data, error } = await client
        .from("assessments")
        .select(ASSESSMENT_COLUMNS)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const operation = "assessments.findLatestAssessment";
      if (error) throw new RepositoryError(translate("errors.internal"), operation);
      if (data === null) return null;
      const row = assessmentRowSchema.safeParse(data);
      if (!row.success) throw new RepositoryError(translate("errors.internal"), operation);
      return mapAssessmentRow(row.data);
    },
  };
}
