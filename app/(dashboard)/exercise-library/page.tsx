"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Eye, Plus, SquarePen, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useFilePreview } from "@/hooks/use-file-preview";
import {
  createExercise,
  deleteExercise,
  getAdminExercises,
  getErrorMessage,
  getExercisePremiumUsers,
  updateExercise,
  updateExerciseVisibility,
  type Exercise,
} from "@/lib/api";

const defaultForm = {
  exerciseName: "",
  userType: "all_user",
  assignedUser: "",
  description: "",
  keyBenefits: "",
  muscleGroups: "",
  executionMode: "set_reps",
  setCount: "3",
  reps: "12",
  durationSeconds: "45",
  weightKg: "1",
  exerciseImage: "",
  muscleImage: "",
  demoVideo: "",
  isVisibleInLibrary: "true",
  status: "published",
};

const getPlanMeta = (exercise: Exercise) => {
  if (exercise.userType === "all_user") {
    return {
      label: "All user",
      className: "bg-[#37d66f] text-white",
    };
  }

  return {
    label: "Premium user",
    className: "bg-[#ff9f31] text-white",
  };
};

export default function ExerciseLibraryPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(defaultForm);
  const [exerciseImageFile, setExerciseImageFile] = useState<File | null>(null);
  const [muscleImageFile, setMuscleImageFile] = useState<File | null>(null);
  const [demoVideoFile, setDemoVideoFile] = useState<File | null>(null);
  const exerciseImagePreview = useFilePreview(exerciseImageFile);
  const muscleImagePreview = useFilePreview(muscleImageFile);
  const demoVideoPreview = useFilePreview(demoVideoFile);

  const resetFormState = () => {
    setFormData(defaultForm);
    setExerciseImageFile(null);
    setMuscleImageFile(null);
    setDemoVideoFile(null);
  };

  const exercisesQuery = useQuery({
    queryKey: ["admin-exercises", page],
    queryFn: () => getAdminExercises({ page, limit: 10 }),
  });

  const premiumUsersQuery = useQuery({
    queryKey: ["exercise-premium-users"],
    queryFn: () => getExercisePremiumUsers(),
  });

  const createMutation = useMutation({
    mutationFn: createExercise,
    onSuccess: () => {
      toast.success("Exercise created.");
      setFormOpen(false);
      resetFormState();
      queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ exerciseId, payload }: { exerciseId: string; payload: Parameters<typeof updateExercise>[1] }) =>
      updateExercise(exerciseId, payload),
    onSuccess: () => {
      toast.success("Exercise updated.");
      setFormOpen(false);
      setSelectedExercise(null);
      resetFormState();
      queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExercise,
    onSuccess: () => {
      toast.success("Exercise archived.");
      setDeleteOpen(false);
      setSelectedExercise(null);
      queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const visibilityMutation = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) => updateExerciseVisibility(id, visible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const exercises = useMemo(() => exercisesQuery.data?.data || [], [exercisesQuery.data?.data]);
  const totalCount = exercisesQuery.data?.meta?.total || 0;
  const totalPages = exercisesQuery.data?.meta?.totalPages || 1;
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [];

    return Array.from({ length: totalPages }, (_, index) => index + 1).slice(
      Math.max(0, page - 2),
      Math.min(totalPages, page + 1)
    );
  }, [page, totalPages]);

  const onOpenCreate = () => {
    setSelectedExercise(null);
    resetFormState();
    setFormOpen(true);
  };

  const onOpenEdit = (exercise: Exercise) => {
    const primarySet = exercise.defaultSets?.[0];
    setSelectedExercise(exercise);
    setExerciseImageFile(null);
    setMuscleImageFile(null);
    setDemoVideoFile(null);
    setFormData({
      exerciseName: exercise.exerciseName || "",
      userType: exercise.userType || "all_user",
      assignedUser: exercise.assignedUser?.id || "",
      description: exercise.description || "",
      keyBenefits: (exercise.keyBenefits || []).join(", "),
      muscleGroups: (exercise.muscleGroups || []).join(", "),
      executionMode: exercise.executionMode || "set_reps",
      setCount: String(exercise.defaultSets?.length || 3),
      reps: String(primarySet?.reps ?? 12),
      durationSeconds: String(primarySet?.durationSeconds ?? 45),
      weightKg: String(primarySet?.weightKg ?? 1),
      exerciseImage: exercise.exerciseImage || "",
      muscleImage: exercise.targetMuscleImage || "",
      demoVideo: exercise.demoVideo || "",
      isVisibleInLibrary: String(exercise.isVisibleInLibrary),
      status: exercise.status || "published",
    });
    setFormOpen(true);
  };

  const onSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedExercise && !exerciseImageFile) {
      toast.error("Exercise image is required.");
      return;
    }

    if (!selectedExercise && !demoVideoFile) {
      toast.error("Demo video is required.");
      return;
    }

    const setCount = Math.max(1, Number(formData.setCount));
    const weightKg = Number(formData.weightKg || 1);

    const defaultSets = Array.from({ length: setCount }, (_, index) => ({
      setNumber: index + 1,
      reps: formData.executionMode === "set_reps" ? Number(formData.reps || 0) : undefined,
      durationSeconds: formData.executionMode === "countdown" ? Number(formData.durationSeconds || 0) : undefined,
      weightKg,
    }));

    const keyBenefits = formData.keyBenefits
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const muscleGroups = formData.muscleGroups
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = new FormData();
    payload.append("exerciseName", formData.exerciseName);
    payload.append("userType", formData.userType);
    payload.append("description", formData.description);
    payload.append("keyBenefits", JSON.stringify(keyBenefits));
    payload.append("muscleGroups", JSON.stringify(muscleGroups));
    payload.append("executionMode", formData.executionMode);
    payload.append("defaultSets", JSON.stringify(defaultSets));
    payload.append("isVisibleInLibrary", String(formData.isVisibleInLibrary === "true"));
    payload.append("status", formData.status);

    if (formData.userType === "premium_user" && formData.assignedUser) {
      payload.append("assignedUser", formData.assignedUser);
    }

    if (exerciseImageFile) {
      payload.append("exerciseImages", exerciseImageFile);
    } else if (selectedExercise && formData.exerciseImage) {
      payload.append("exerciseImages", JSON.stringify([formData.exerciseImage]));
    }

    if (muscleImageFile) {
      payload.append("targetMuscleImages", muscleImageFile);
    } else if (selectedExercise && formData.muscleImage) {
      payload.append("targetMuscleImages", JSON.stringify([formData.muscleImage]));
    }

    if (demoVideoFile) {
      payload.append("demoVideos", demoVideoFile);
    } else if (selectedExercise && formData.demoVideo) {
      payload.append("demoVideos", JSON.stringify([formData.demoVideo]));
    }

    if (selectedExercise) {
      updateMutation.mutate({ exerciseId: selectedExercise.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-5">
      <PageTitle
        title="Exercise Library"
        breadcrumb="Dashboard  >  Exercise Library"
        action={
          <Button
            className="w-full rounded-md border border-[#9cd7ff6e] bg-[linear-gradient(180deg,#98d5f8_0%,#5d97c4_100%)] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_-16px_rgba(126,195,244,.8)] hover:brightness-105 md:w-auto"
            onClick={onOpenCreate}
          >
            <Plus className="mr-2 size-4" />
            Add new Exercise
          </Button>
        }
      />

      <Card className="overflow-hidden border-[#80b8df42]">
        <CardContent className="space-y-4 p-0">
          {exercisesQuery.isLoading ? (
            <div className="px-4 pb-4 pt-4">
              <TableSkeleton rows={10} />
            </div>
          ) : exercises.length === 0 ? (
            <div className="px-4 pb-6 pt-4">
              <EmptyState title="No exercises found" description="Create your first exercise." />
            </div>
          ) : (
            <>
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-11 text-xs">Exercise Image</TableHead>
                    <TableHead className="h-11 text-xs">Program Name</TableHead>
                    <TableHead className="h-11 text-xs">Exercise Name</TableHead>
                    <TableHead className="h-11 text-xs">Plan</TableHead>
                    <TableHead className="h-11 text-xs">Visibility</TableHead>
                    <TableHead className="h-11 text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exercises.map((exercise) => {
                    const planMeta = getPlanMeta(exercise);
                    const programName = exercise.programNames?.[0] || "-";

                    return (
                    <TableRow key={exercise.id} className="border-white/30 hover:bg-white/[0.03]">
                      <TableCell className="py-3">
                        {exercise.exerciseImage ? (
                          <img src={exercise.exerciseImage} alt={exercise.exerciseName} className="size-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-sm">{programName}</TableCell>
                      <TableCell className="py-3 text-sm">{exercise.exerciseName}</TableCell>
                      <TableCell className="py-3">
                        <span className={`inline-flex min-w-24 items-center justify-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${planMeta.className}`}>
                          {planMeta.label}
                          <ChevronDown className="size-3" />
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={exercise.isVisibleInLibrary}
                            onChange={(event) => visibilityMutation.mutate({ id: exercise.id, visible: event.target.checked })}
                            aria-label={`Toggle visibility for ${exercise.exerciseName}`}
                          />
                          <span className="h-6 w-11 rounded-full bg-[#5f7fa2] transition-colors peer-checked:bg-[#72B4E6]" />
                          <span className="pointer-events-none absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                        </label>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex h-8 items-center gap-2 rounded-md border border-[#2f80cc] bg-[#102849] px-3 text-xs font-semibold text-[#63bfff] transition-colors hover:bg-[#16345c]"
                            onClick={() => {
                              setSelectedExercise(exercise);
                              setViewOpen(true);
                            }}
                            aria-label="View exercise details"
                          >
                            <Eye className="size-3.5" />
                            View Details
                          </button>
                          <button
                            type="button"
                            className="inline-flex size-8 items-center justify-center rounded-full bg-[#22bf61] text-white transition-colors hover:bg-[#2cd46d]"
                            onClick={() => onOpenEdit(exercise)}
                            aria-label="Edit exercise"
                          >
                            <SquarePen className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex size-8 items-center justify-center rounded-full bg-[#ff2f5f] text-white transition-colors hover:bg-[#ff416f]"
                            onClick={() => {
                              setSelectedExercise(exercise);
                              setDeleteOpen(true);
                            }}
                            aria-label="Delete exercise"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-2 border-t border-white/25 px-4 pb-4 pt-3 md:flex-row md:items-center md:justify-between">
                <p className="text-xs text-slate-300/80">
                  Showing {exercises.length > 0 ? (page - 1) * 10 + 1 : 0} to {(page - 1) * 10 + exercises.length} of {totalCount}
                  results
                </p>
                {totalPages > 1 ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded border border-white/35 text-slate-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    {pageNumbers.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`inline-flex h-8 min-w-8 items-center justify-center rounded border px-2 text-xs font-semibold transition-colors ${
                          item === page
                            ? "border-white bg-white text-[#0f2747]"
                            : "border-white/35 bg-transparent text-slate-100 hover:bg-white/10"
                        }`}
                        onClick={() => setPage(item)}
                        aria-label={`Go to page ${item}`}
                      >
                        {item}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded border border-[#7fc7f6] bg-[#6aaee0] text-white transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedExercise(null);
          resetFormState();
        }}
        title={selectedExercise ? "Edit Exercise" : "Add New Exercise"}
      >
        <form className="space-y-4" onSubmit={onSubmitForm}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Exercise Name</Label>
              <Input
                value={formData.exerciseName}
                onChange={(event) => setFormData((prev) => ({ ...prev, exerciseName: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>User type</Label>
              <Select
                value={formData.userType}
                onChange={(event) => setFormData((prev) => ({ ...prev, userType: event.target.value }))}
              >
                <option value="all_user">All user</option>
                <option value="premium_user">Premium user</option>
              </Select>
            </div>
            {formData.userType === "premium_user" ? (
              <div className="space-y-2 md:col-span-2">
                <Label>Assigned Premium User</Label>
                <Select
                  value={formData.assignedUser}
                  onChange={(event) => setFormData((prev) => ({ ...prev, assignedUser: event.target.value }))}
                  required
                >
                  <option value="">Select premium user</option>
                  {(premiumUsersQuery.data || []).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} ({user.email})
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Key Benefits (comma separated)</Label>
              <Input
                value={formData.keyBenefits}
                onChange={(event) => setFormData((prev) => ({ ...prev, keyBenefits: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Muscle Groups (comma separated)</Label>
              <Input
                value={formData.muscleGroups}
                onChange={(event) => setFormData((prev) => ({ ...prev, muscleGroups: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Execution Mode</Label>
              <Select
                value={formData.executionMode}
                onChange={(event) => setFormData((prev) => ({ ...prev, executionMode: event.target.value }))}
              >
                <option value="set_reps">Set/Reps</option>
                <option value="countdown">Countdown</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Set count</Label>
              <Input
                type="number"
                min={1}
                value={formData.setCount}
                onChange={(event) => setFormData((prev) => ({ ...prev, setCount: event.target.value }))}
              />
            </div>
            {formData.executionMode === "set_reps" ? (
              <div className="space-y-2">
                <Label>Reps per set</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.reps}
                  onChange={(event) => setFormData((prev) => ({ ...prev, reps: event.target.value }))}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Duration Seconds per set</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.durationSeconds}
                  onChange={(event) => setFormData((prev) => ({ ...prev, durationSeconds: event.target.value }))}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                min={0}
                value={formData.weightKg}
                onChange={(event) => setFormData((prev) => ({ ...prev, weightKg: event.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Exercise Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => setExerciseImageFile(event.target.files?.[0] || null)}
                required={!selectedExercise}
              />
              {exerciseImagePreview || formData.exerciseImage ? (
                <img
                  src={exerciseImagePreview || formData.exerciseImage}
                  alt="Exercise preview"
                  className="h-40 w-full rounded-lg object-cover"
                />
              ) : null}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Target Muscle Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => setMuscleImageFile(event.target.files?.[0] || null)}
              />
              {muscleImagePreview || formData.muscleImage ? (
                <img
                  src={muscleImagePreview || formData.muscleImage}
                  alt="Target muscle preview"
                  className="h-32 w-full rounded-lg object-cover"
                />
              ) : null}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Demo Video</Label>
              <Input
                type="file"
                accept="video/*"
                onChange={(event) => setDemoVideoFile(event.target.files?.[0] || null)}
                required={!selectedExercise}
              />
              {demoVideoPreview || formData.demoVideo ? (
                <video
                  src={demoVideoPreview || formData.demoVideo}
                  controls
                  className="max-h-56 w-full rounded-lg bg-slate-900"
                />
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Visible in Library</Label>
              <Select
                value={formData.isVisibleInLibrary}
                onChange={(event) => setFormData((prev) => ({ ...prev, isVisibleInLibrary: event.target.value }))}
              >
                <option value="true">Visible</option>
                <option value="false">Hidden</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : selectedExercise
                  ? "Save"
                  : "Add New Exercise"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title={selectedExercise?.exerciseName || "Exercise details"}>
        {selectedExercise ? (
          <div className="space-y-4">
            {selectedExercise.exerciseImage ? (
              <img src={selectedExercise.exerciseImage} alt={selectedExercise.exerciseName} className="h-52 w-full rounded-xl object-cover" />
            ) : null}
            <p>{selectedExercise.description}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-blue-300/30 p-3 text-center">
                <p className="text-sm text-slate-300">Sets</p>
                <p className="text-2xl font-bold text-white">{selectedExercise.defaultSets.length}</p>
              </div>
              <div className="rounded-lg border border-blue-300/30 p-3 text-center">
                <p className="text-sm text-slate-300">Mode</p>
                <p className="text-2xl font-bold capitalize text-white">{selectedExercise.executionMode.replace("_", " ")}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 font-semibold">Key Benefits</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {(selectedExercise.keyBenefits || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (selectedExercise) {
            deleteMutation.mutate(selectedExercise.id);
          }
        }}
        title="Are you sure?"
        description="You want to delete this exercise from your dashboard."
        confirmText="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
