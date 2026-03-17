// ============================================================
// TypeScript types mirroring all backend Pydantic schemas
// ============================================================

// Response envelope
export interface MetaInfo {
  request_id: string;
  timestamp: string;
}

export interface SuccessResponse<T> {
  data: T;
  meta: MetaInfo;
}

export interface ErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ErrorResponse {
  error: ErrorDetail;
  meta: MetaInfo;
}

// ============================================================
// Auth
// ============================================================

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
}

export interface RegisterResponse {
  user_id: string;
  email: string;
  display_name: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface RefreshRequest {
  refresh_token: string;
}

// ============================================================
// User
// ============================================================

export interface TokenStatus {
  status: "active" | "invalid" | "not_configured";
  platform: string;
}

export interface UserResponse {
  id: string;
  email: string;
  display_name: string;
  gpa_target: number | null;
  gpa_scale: string;
  tokens: Record<string, TokenStatus>;
  created_at: string;
}

export interface UserUpdateRequest {
  display_name?: string;
  gpa_target?: number | null;
}

export interface TokenConfigRequest {
  token: string;
}

export interface TokenConfigResponse {
  status: string;
  platform: string;
  courses_found: number;
}

// ============================================================
// GPA
// ============================================================

export interface CourseSummary {
  course_id: string;
  course_name: string;
  course_code: string;
  semester: string;
  credit_points: number;
  wam: number;
  grade_band: string;
  gpa_point: number;
  pct_assessed: number;
  assessment_count: number;
  graded_count: number;
}

export interface GPASummaryResponse {
  cumulative_wam: number;
  cumulative_gpa: number;
  total_credit_points: number;
  course_count: number;
  courses: CourseSummary[];
}

export interface AssessmentDetail {
  id: string;
  name: string;
  score: number | null;
  max_score: number;
  weight: number;
  group_name: string;
}

export interface CourseDetailResponse {
  course_id: string;
  course_name: string;
  course_code: string;
  semester: string;
  credit_points: number;
  wam: number;
  grade_band: string;
  gpa_point: number;
  pct_assessed: number;
  assessments: AssessmentDetail[];
  weight_source: string;
}

export interface WhatIfScore {
  assessment_id: string;
  hypothetical_score: number;
}

export interface WhatIfCreateRequest {
  name: string;
  scores: WhatIfScore[];
}

export interface WhatIfScenarioResponse {
  id: string;
  name: string;
  result_wam: number;
  result_gpa: number;
  scores: WhatIfScore[];
  created_at: string;
}

export interface TargetRequest {
  target_wam: number;
  mode: "uniform" | "smart";
}

export interface AssessmentTarget {
  assessment_id: string;
  assessment_name: string;
  course_code: string;
  current_score: number | null;
  required_score: number;
  weight: number;
}

export interface TargetPathResponse {
  target_wam: number;
  is_achievable: boolean;
  max_achievable_wam: number;
  required_scores: AssessmentTarget[];
}

export interface SemesterTrend {
  semester: string;
  semester_wam: number;
  semester_gpa: number;
  cumulative_wam: number;
  cumulative_gpa: number;
  credit_points: number;
}

export interface TrendResponse {
  semesters: SemesterTrend[];
}

// ============================================================
// Deadlines
// ============================================================

export interface DeadlineResponse {
  id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  title: string;
  due_date: string;
  source: string;
  source_tags: string[];
  weight: number | null;
  description: string | null;
  urgency: "urgent" | "warning" | "normal" | "past_due";
  is_confirmed: boolean;
}

export type DeadlineDetailResponse = DeadlineResponse;

export interface ConflictDay {
  date: string;
  deadline_count: number;
  deadlines: DeadlineResponse[];
}

// ============================================================
// Materials
// ============================================================

export interface FolderItem {
  id: string;
  title: string;
  type: string;
  url: string | null;
  source: string;
}

export interface FolderResponse {
  id: string;
  name: string;
  source: string;
  position: number;
  item_count: number;
  ai_description: string | null;
  items: FolderItem[] | null;
}

export interface CourseMaterialsResponse {
  course_id: string;
  course_name: string;
  folders: FolderResponse[];
}

export interface SearchHit {
  id: string;
  title: string;
  course_id: string;
  course_name: string;
  course_code: string;
  type: string;
  source: string;
  snippet: string;
  rank: number;
}

export interface SearchResponse {
  query: string;
  total_hits: number;
  results: SearchHit[];
}

// ============================================================
// Intelligence
// ============================================================

export interface HighValuePostResponse {
  id: string;
  ed_thread_id: string;
  title: string;
  category: string;
  content_summary: string;
  is_endorsed: boolean;
  is_staff_post: boolean;
  created_at: string;
}

// ============================================================
// Notifications
// ============================================================

export interface NotificationResponse {
  id: string;
  type: "deadline_reminder" | "gpa_risk" | "digest" | "system";
  severity: "critical" | "warning" | "info";
  title: string;
  body: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
  metadata_json: Record<string, string> | null;
}

export interface UnreadCountResponse {
  count: number;
}

// ============================================================
// Digest (AI-enhanced)
// ============================================================

export interface DigestItemResponse {
  type: "grade" | "deadline" | "post";
  title: string;
  detail: string;
  course_code: string;
  urgency_score: number | null; // 1-5, null if AI not applied
  timestamp: string;
}

export interface DigestResponse {
  id: string;
  digest_date: string;
  items: DigestItemResponse[];
  ai_summary: string | null;
  created_at: string;
}

export interface RiskAlertResponse {
  id: string;
  course_code: string;
  course_name: string;
  current_wam: number;
  target_wam: number;
  gap: number;
  severity: string;
  recommendation: string;
  created_at: string;
}

// ============================================================
// Sync
// ============================================================

export interface SyncSourceStatus {
  platform: string;
  status: string;
  last_synced_at: string | null;
  token_status: string;
}

export interface SyncStatusResponse {
  sources: SyncSourceStatus[];
  is_syncing: boolean;
}

export interface SyncTriggerResponse {
  message: string;
  next_allowed_at: string;
}
