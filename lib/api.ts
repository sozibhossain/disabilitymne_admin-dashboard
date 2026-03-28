import axios, { AxiosError } from "axios";
import { getSession, signOut } from "next-auth/react";

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
  meta?: PaginationMeta;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  subscription: string;
  selectedPlan: string;
  mobilityType: string;
  status: "active" | "deactivated" | "suspended";
  isActive: boolean;
};

export type DashboardOverview = {
  totals: {
    totalUsers: number;
    totalMonthlyUsers: number;
    totalQuarterlyUsers: number;
    totalAnnualUsers: number;
    totalPremiumUsers: number;
    totalRevenue: number;
    totalRevenueDisplay: string;
  };
  earningsSeries: Array<{ label: string; revenue: number }>;
  subscriptionSurvey: Array<{ key: string; label: string; count: number; percentage: number }>;
  recentUsers: AdminUser[];
};

export type Program = {
  id: string;
  programName: string;
  programDuration: string;
  durationMinutes: number;
  programLevel: string;
  userType: "normal_user" | "premium_user";
  plan: string;
  assignedUser: { id: string; firstName: string; email: string } | null;
  programDescription: string;
  safetyNote?: string;
  mobilityType: string;
  weekCount?: number;
  totalExercises: number;
  exerciseIds: string[];
  exercises: Array<{
    id: string;
    exerciseName: string;
    executionMode?: string;
    demoVideo?: string | null;
    demoVideos?: string[];
    image?: string | null;
    exerciseImages?: string[];
  }>;
  workoutDays: Array<{
    dayIndex: number;
    dayLabel: string;
    exerciseIds: string[];
    totalExercises: number;
    exercises: Array<{
      id: string;
      exerciseName: string;
      executionMode?: string;
      demoVideo?: string | null;
      demoVideos?: string[];
      image?: string | null;
      exerciseImages?: string[];
    }>;
  }>;
  status: "draft" | "published" | "archived";
  isActive: boolean;
  programImage: string | null;
  programThumbnail: string | null;
  programImages: string[];
  programThumbnails: string[];
  createdAt: string;
  updatedAt: string;
};

export type Exercise = {
  id: string;
  exerciseName: string;
  userType: "all_user" | "premium_user";
  assignedUser: { id: string; firstName: string; email: string } | null;
  description: string;
  keyBenefits: string[];
  muscleGroups: string[];
  exerciseImage: string | null;
  targetMuscleImage: string | null;
  demoVideo: string | null;
  defaultSets: Array<{ setNumber: number; reps?: number; durationSeconds?: number; weightKg?: number }>;
  executionMode: "set_reps" | "countdown";
  sets: number;
  reps: number | null;
  countdown: boolean;
  durationSeconds: number | null;
  isVisibleInLibrary: boolean;
  status: "draft" | "published" | "archived";
  isActive: boolean;
  programNames?: string[];
};

export type Recipe = {
  id: string;
  recipeName: string;
  recipeDuration: string;
  durationMinutes: number;
  recipeType: string;
  userType: "normal_user" | "premium_user";
  assignedUser: { id: string; firstName: string; email: string } | null;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  nutritionSummary: string;
  recipeImage: string | null;
  recipeImages: string[];
  howToPrepare?: string;
  ingredients?: string[];
  status: "draft" | "published" | "archived";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionPlan = {
  key: "monthly" | "quarterly" | "annual" | "premium";
  name: string;
  price: number;
  currency: string;
  durationLabel: string;
  durationMonths: number;
  trialDays: number;
  features: string[];
  isPopular: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SupportTicket = {
  id: string;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
  email: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  adminResponse: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkoutExperience = {
  id: string;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
  program: { id: string; programName: string } | null;
  experienceLevel: "easy" | "intermediate" | "very_hard";
  notes: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkoutProgress = {
  summary: {
    completedWorkoutDays: number;
    scheduledExercises: number;
    completedExercises: number;
    adherencePercent: number;
    totalTrainingVolume: number;
  };
  series: {
    adherenceByWeek: Array<{
      weekStartDate: string;
      scheduledExercises: number;
      completedExercises: number;
      adherencePercent: number;
    }>;
    strengthTrend: Array<{
      weekStartDate: string | null;
      exerciseId: string | null;
      exerciseName: string;
      bestWeightKg: number;
      bestReps: number;
      totalVolume: number;
    }>;
  };
  recentLogs: Array<{
    id: string;
    user: { id: string; firstName: string; lastName: string; email: string } | null;
    program: { id: string; programName: string } | null;
    exercise: { id: string; exerciseName: string } | null;
    sessionId: string | null;
    dayIndex: number | null;
    weekStartDate: string | null;
    caloriesBurned: number;
    durationMinutes: number;
    trainingVolume: number;
    completedAt: string;
  }>;
};

export type ChatUser = {
  id: string;
  firstName: string;
  email: string;
  role: string;
  profileImage: string | null;
};

export type ChatThread = {
  id: string;
  counterpart: ChatUser;
  admin: ChatUser;
  premiumUser: ChatUser;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  sender: ChatUser;
  recipient: ChatUser;
  message: string;
  attachments: Array<{ url: string; publicId: string; mimetype: string; size: number }>;
  readAt: string | null;
  isMine: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminSettingsProfile = {
  id: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  preferredLanguage: string;
  accessibilityPreferences: {
    largerText: boolean;
    highContrast: boolean;
    reducedMotion: boolean;
    screenReaderOptimized: boolean;
  };
  profileImage: string | null;
  gender: string | null;
  age: number | null;
  weightCurrent: number | null;
  goalWeight: number | null;
  height: number | null;
  fitnessGoals: string[];
  mobilityType: string | null;
  mobilityTypeOther: string | null;
  fitnessExperience: string | null;
  onboardingStep: number;
  onboardingCompleted: boolean;
  selectedPlan: string | null;
  subscriptionStatus: string;
  trialActivatedAt: string | null;
  trialEndsAt: string | null;
  subscriptionStartedAt: string | null;
  subscriptionEndsAt: string | null;
  lastLoginAt: string | null;
  accountStatus: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function getApiBaseUrl() {
  const raw = process.env.NEXTPUBLICBASEURL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000/api/v1";
  return raw.endsWith("/api/v1") ? raw : `${raw.replace(/\/$/, "")}/api/v1`;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401) {
      await signOut({ redirect: true, callbackUrl: "/login" });
    }

    return Promise.reject(error);
  }
);

function unwrap<T>(response: { data: ApiEnvelope<T> }) {
  return response.data.data;
}

function unwrapPaginated<T>(response: { data: ApiEnvelope<T[]> }) {
  return {
    data: response.data.data,
    meta: response.data.meta,
  };
}

const getMultipartConfig = (payload: unknown) => {
  if (typeof FormData === "undefined" || !(payload instanceof FormData)) {
    return undefined;
  }

  return {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  };
};

export function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.message || fallback);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export async function forgotPasswordSendOtp(email: string) {
  const response = await api.post<ApiEnvelope<{ devOtp?: string }>>("/auth/forgot-password/send-otp", { email });
  return response.data;
}

export async function verifyPasswordOtp(email: string, otp: string) {
  const response = await api.post<ApiEnvelope<null>>("/auth/forgot-password/verify-otp", { email, otp });
  return response.data;
}

export async function resetPassword(payload: {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const response = await api.post<ApiEnvelope<unknown>>("/auth/forgot-password/reset", payload);
  return response.data;
}

export async function getDashboardOverview() {
  const response = await api.get<ApiEnvelope<DashboardOverview>>("/admin/dashboard/overview");
  return unwrap(response);
}

export async function getAdminUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  subscription?: string;
}) {
  const response = await api.get<ApiEnvelope<AdminUser[]>>("/admin/users", { params });
  return unwrapPaginated(response);
}

export async function updateAdminUserStatus(userId: string, accountStatus: "active" | "deactivated" | "suspended") {
  const response = await api.patch<ApiEnvelope<AdminUser>>(`/admin/users/${userId}/status`, { accountStatus });
  return unwrap(response);
}

export async function deleteAdminUser(userId: string) {
  const response = await api.delete<ApiEnvelope<null>>(`/admin/users/${userId}`);
  return response.data;
}

export async function getAdminPrograms(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  userType?: string;
}) {
  const response = await api.get<ApiEnvelope<Program[]>>("/programs/admin", { params });
  return unwrapPaginated(response);
}

export async function getAdminProgramById(programId: string) {
  const response = await api.get<ApiEnvelope<Program>>(`/programs/admin/${programId}`);
  return unwrap(response);
}

export async function getProgramPremiumUsers(search?: string) {
  const response = await api.get<ApiEnvelope<Array<{ id: string; firstName: string; email: string }>>>(
    "/programs/admin/premium-users",
    { params: { search } }
  );
  return unwrap(response);
}

export type CreateProgramPayload = {
  programName: string;
  programDuration: string;
  durationMinutes: number;
  programLevel: string;
  userType: "normal_user" | "premium_user";
  assignedUser?: string;
  programDescription: string;
  mobilityType: string;
  exerciseIds: string[];
  workoutDays?: Array<{ dayIndex: number; exerciseIds: string[] }>;
  programImages: string[];
  programThumbnails?: string[];
  status?: string;
};

export type UpdateProgramPayload = Partial<{
  programName: string;
  programDuration: string;
  durationMinutes: number;
  programLevel: string;
  userType: "normal_user" | "premium_user";
  assignedUser?: string;
  programDescription: string;
  mobilityType: string;
  exerciseIds: string[];
  workoutDays: Array<{ dayIndex: number; exerciseIds: string[] }>;
  programImages: string[];
  programThumbnails: string[];
  status: string;
}>;

export async function createProgram(payload: CreateProgramPayload | FormData) {
  const response = await api.post<ApiEnvelope<Program>>("/programs/admin", payload, getMultipartConfig(payload));
  return unwrap(response);
}

export async function updateProgram(programId: string, payload: UpdateProgramPayload | FormData) {
  const response = await api.patch<ApiEnvelope<Program>>(
    `/programs/admin/${programId}`,
    payload,
    getMultipartConfig(payload)
  );
  return unwrap(response);
}

export async function deleteProgram(programId: string) {
  const response = await api.delete<ApiEnvelope<null>>(`/programs/admin/${programId}`);
  return response.data;
}

export async function getAdminExercises(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  userType?: string;
}) {
  const response = await api.get<ApiEnvelope<Exercise[]>>("/exercises/admin", { params });
  return unwrapPaginated(response);
}

export async function getAdminExerciseById(exerciseId: string) {
  const response = await api.get<ApiEnvelope<Exercise>>(`/exercises/admin/${exerciseId}`);
  return unwrap(response);
}

export async function getExercisePremiumUsers(search?: string) {
  const response = await api.get<ApiEnvelope<Array<{ id: string; firstName: string; email: string }>>>(
    "/exercises/admin/premium-users",
    { params: { search } }
  );
  return unwrap(response);
}

export type CreateExercisePayload = {
  exerciseName: string;
  userType: "all_user" | "premium_user";
  assignedUser?: string;
  description: string;
  keyBenefits: string[];
  muscleGroups: string[];
  exerciseImages: string[];
  targetMuscleImages: string[];
  demoVideos: string[];
  executionMode: "set_reps" | "countdown";
  defaultSets: Array<{ setNumber: number; reps?: number; durationSeconds?: number; weightKg?: number }>;
  isVisibleInLibrary: boolean;
  status?: string;
};

export type UpdateExercisePayload = Partial<{
  exerciseName: string;
  userType: "all_user" | "premium_user";
  assignedUser?: string;
  description: string;
  keyBenefits: string[];
  muscleGroups: string[];
  exerciseImages: string[];
  targetMuscleImages: string[];
  demoVideos: string[];
  executionMode: "set_reps" | "countdown";
  defaultSets: Array<{ setNumber: number; reps?: number; durationSeconds?: number; weightKg?: number }>;
  isVisibleInLibrary: boolean;
  status: string;
}>;

export async function createExercise(payload: CreateExercisePayload | FormData) {
  const response = await api.post<ApiEnvelope<Exercise>>("/exercises/admin", payload, getMultipartConfig(payload));
  return unwrap(response);
}

export async function updateExercise(exerciseId: string, payload: UpdateExercisePayload | FormData) {
  const response = await api.patch<ApiEnvelope<Exercise>>(
    `/exercises/admin/${exerciseId}`,
    payload,
    getMultipartConfig(payload)
  );
  return unwrap(response);
}

export async function updateExerciseVisibility(exerciseId: string, isVisibleInLibrary: boolean) {
  const response = await api.patch<ApiEnvelope<{ id: string; isVisibleInLibrary: boolean }>>(
    `/exercises/admin/${exerciseId}/visibility`,
    { isVisibleInLibrary }
  );
  return unwrap(response);
}

export async function deleteExercise(exerciseId: string) {
  const response = await api.delete<ApiEnvelope<null>>(`/exercises/admin/${exerciseId}`);
  return response.data;
}

export async function getAdminRecipes(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  userType?: string;
}) {
  const response = await api.get<ApiEnvelope<Recipe[]>>("/recipes/admin", { params });
  return unwrapPaginated(response);
}

export async function getAdminRecipeById(recipeId: string) {
  const response = await api.get<ApiEnvelope<Recipe>>(`/recipes/admin/${recipeId}`);
  return unwrap(response);
}

export async function getRecipePremiumUsers(search?: string) {
  const response = await api.get<ApiEnvelope<Array<{ id: string; firstName: string; email: string }>>>(
    "/recipes/admin/premium-users",
    { params: { search } }
  );
  return unwrap(response);
}

export type CreateRecipePayload = {
  recipeName: string;
  recipeDuration: string;
  durationMinutes: number;
  recipeType: string;
  userType: "normal_user" | "premium_user";
  assignedUser?: string;
  howToPrepare: string;
  ingredients: string[];
  recipeImages: string[];
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  status?: string;
};

export type UpdateRecipePayload = Partial<{
  recipeName: string;
  recipeDuration: string;
  durationMinutes: number;
  recipeType: string;
  userType: "normal_user" | "premium_user";
  assignedUser?: string;
  howToPrepare: string;
  ingredients: string[];
  recipeImages: string[];
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  status: string;
}>;

export async function createRecipe(payload: CreateRecipePayload | FormData) {
  const response = await api.post<ApiEnvelope<Recipe>>("/recipes/admin", payload, getMultipartConfig(payload));
  return unwrap(response);
}

export async function updateRecipe(recipeId: string, payload: UpdateRecipePayload | FormData) {
  const response = await api.patch<ApiEnvelope<Recipe>>(
    `/recipes/admin/${recipeId}`,
    payload,
    getMultipartConfig(payload)
  );
  return unwrap(response);
}

export async function deleteRecipe(recipeId: string) {
  const response = await api.delete<ApiEnvelope<null>>(`/recipes/admin/${recipeId}`);
  return response.data;
}

export async function getSubscriptionPlans(includeInactive = true) {
  const response = await api.get<ApiEnvelope<SubscriptionPlan[]>>("/admin/subscriptions/plans", {
    params: { includeInactive },
  });
  return unwrap(response);
}

export async function createSubscriptionPlan(payload: {
  key: "monthly" | "quarterly" | "annual" | "premium";
  name: string;
  price: number;
  currency: string;
  durationLabel: string;
  durationMonths: number;
  trialDays: number;
  features: string[];
}) {
  const response = await api.post<ApiEnvelope<SubscriptionPlan>>("/admin/subscriptions/plans", payload);
  return unwrap(response);
}

export async function updateSubscriptionPlan(
  planKey: string,
  payload: Partial<{
    name: string;
    price: number;
    currency: string;
    durationLabel: string;
    durationMonths: number;
    trialDays: number;
    features: string[];
    isActive: boolean;
    isPopular: boolean;
    sortOrder: number;
  }>
) {
  const response = await api.patch<ApiEnvelope<SubscriptionPlan>>(`/admin/subscriptions/plans/${planKey}`, payload);
  return unwrap(response);
}

export async function deleteSubscriptionPlan(planKey: string) {
  const response = await api.delete<ApiEnvelope<null>>(`/admin/subscriptions/plans/${planKey}`);
  return response.data;
}

export async function getSupportTickets(params: { page?: number; limit?: number; search?: string; status?: string }) {
  const response = await api.get<ApiEnvelope<SupportTicket[]>>("/admin/support/tickets", { params });
  return unwrapPaginated(response);
}

export async function getSupportTicketById(ticketId: string) {
  const response = await api.get<ApiEnvelope<SupportTicket>>(`/admin/support/tickets/${ticketId}`);
  return unwrap(response);
}

export async function updateSupportTicket(
  ticketId: string,
  payload: Partial<Pick<SupportTicket, "status" | "adminResponse">>
) {
  const response = await api.patch<ApiEnvelope<SupportTicket>>(`/admin/support/tickets/${ticketId}`, payload);
  return unwrap(response);
}

export async function getWorkoutExperiences(params: {
  page?: number;
  limit?: number;
  search?: string;
  experienceLevel?: string;
}) {
  const response = await api.get<ApiEnvelope<WorkoutExperience[]>>("/admin/workout-experiences", { params });
  return unwrapPaginated(response);
}

export async function getWorkoutExperienceById(experienceId: string) {
  const response = await api.get<ApiEnvelope<WorkoutExperience>>(`/admin/workout-experiences/${experienceId}`);
  return unwrap(response);
}

export async function getWorkoutProgress(params: {
  page?: number;
  limit?: number;
  userId?: string;
  programId?: string;
  exerciseId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const response = await api.get<ApiEnvelope<WorkoutProgress>>("/admin/workout-progress", { params });
  return {
    data: response.data.data,
    meta: response.data.meta,
  };
}

export async function getAdminSettingsProfile() {
  const response = await api.get<ApiEnvelope<AdminSettingsProfile>>("/users/me/profile");
  return unwrap(response);
}

export async function updateAdminSettingsProfile(payload: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  profileImage?: string | null;
}) {
  const response = await api.patch<ApiEnvelope<AdminSettingsProfile>>("/admin/settings/profile", payload);
  return unwrap(response);
}

export async function updateAdminSettingsProfileImage(profileImage: File) {
  const formData = new FormData();
  formData.append("profileImage", profileImage);

  const response = await api.patch<ApiEnvelope<AdminSettingsProfile>>("/users/me/profile-image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return unwrap(response);
}

export async function updateAdminSettingsPassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}) {
  const response = await api.patch<ApiEnvelope<null>>("/admin/settings/password", payload);
  return response.data;
}

export async function getChatThreads(params: { page?: number; limit?: number; search?: string }) {
  const response = await api.get<ApiEnvelope<ChatThread[]>>("/chat/threads", { params });
  return unwrapPaginated(response);
}

export async function getChatPremiumUsers(search?: string) {
  const response = await api.get<ApiEnvelope<ChatUser[]>>("/chat/admin/premium-users", { params: { search } });
  return unwrap(response);
}

export async function createOrGetChatThread(payload: { premiumUserId: string }) {
  const response = await api.post<ApiEnvelope<ChatThread>>("/chat/threads", payload);
  return unwrap(response);
}

export async function getChatMessages(threadId: string, params: { page?: number; limit?: number }) {
  const response = await api.get<ApiEnvelope<ChatMessage[]>>(`/chat/threads/${threadId}/messages`, { params });
  return unwrapPaginated(response);
}

export async function sendChatMessage(threadId: string, payload: { message: string }) {
  const response = await api.post<ApiEnvelope<ChatMessage>>(`/chat/threads/${threadId}/messages`, payload);
  return unwrap(response);
}

export async function markChatThreadRead(threadId: string) {
  const response = await api.patch<ApiEnvelope<{ markedCount: number; readAt: string }>>(`/chat/threads/${threadId}/read`);
  return unwrap(response);
}

export { api };
