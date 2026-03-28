"use client";

import { ArrowDown, ArrowLeft, ArrowUp, Eye, Plus, SquarePen, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Pagination } from "@/components/shared/pagination";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ProgramFormActions } from "./_components/program-form-actions";
import { ProgramUserTypeFields } from "./_components/program-user-type-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createProgram,
  deleteProgram,
  getAdminExercises,
  getAdminProgramById,
  getAdminPrograms,
  getExercisePremiumUsers,
  getErrorMessage,
  updateProgram,
  type Program,
} from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

const defaultForm = {
  programName: "",
  durationMinutes: "30",
  programLevel: "beginner",
  userType: "normal_user",
  assignedUser: "",
  programDescription: "",
  mobilityType: "",
  programImages: [] as string[],
  programThumbnails: [] as string[],
  status: "published",
};

type WorkoutDayAssignment = {
  dayIndex: number;
  exerciseIds: string[];
};

const WEEKDAY_OPTIONS: Array<{ dayIndex: number; label: string }> = [
  { dayIndex: 1, label: "Mon" },
  { dayIndex: 2, label: "Tue" },
  { dayIndex: 3, label: "Wed" },
  { dayIndex: 4, label: "Thu" },
  { dayIndex: 5, label: "Fri" },
  { dayIndex: 6, label: "Sat" },
  { dayIndex: 7, label: "Sun" },
];

const DEFAULT_DAY_INDICES = [1, 3, 5];

const getWorkoutDayLabel = (dayIndex: number) =>
  WEEKDAY_OPTIONS.find((day) => day.dayIndex === dayIndex)?.label || `Day ${dayIndex}`;

const normalizeWorkoutDays = (days: WorkoutDayAssignment[]) => {
  const seenDays = new Set<number>();

  return (Array.isArray(days) ? days : [])
    .map((day) => ({
      dayIndex: Number(day.dayIndex),
      exerciseIds: Array.from(
        new Set(
          (Array.isArray(day.exerciseIds) ? day.exerciseIds : [])
            .map((id) => String(id).trim())
            .filter(Boolean)
        )
      ),
    }))
    .filter((day) => Number.isInteger(day.dayIndex) && day.dayIndex >= 1 && day.dayIndex <= 7)
    .filter((day) => {
      if (seenDays.has(day.dayIndex)) {
        return false;
      }

      seenDays.add(day.dayIndex);
      return true;
    })
    .sort((a, b) => a.dayIndex - b.dayIndex);
};

const deriveExerciseIdsFromWorkoutDays = (days: WorkoutDayAssignment[]) =>
  Array.from(new Set(normalizeWorkoutDays(days).flatMap((day) => day.exerciseIds)));

const distributeExerciseIdsAcrossDays = (exerciseIds: string[]) => {
  const uniqueExerciseIds = Array.from(
    new Set((Array.isArray(exerciseIds) ? exerciseIds : []).map((id) => String(id).trim()).filter(Boolean))
  );

  if (uniqueExerciseIds.length === 0) {
    return [] as WorkoutDayAssignment[];
  }

  const buckets = new Map(DEFAULT_DAY_INDICES.map((dayIndex) => [dayIndex, [] as string[]]));
  uniqueExerciseIds.forEach((exerciseId, index) => {
    const dayIndex = DEFAULT_DAY_INDICES[index % DEFAULT_DAY_INDICES.length];
    const list = buckets.get(dayIndex);
    if (list) {
      list.push(exerciseId);
    }
  });

  return DEFAULT_DAY_INDICES.map((dayIndex) => ({
    dayIndex,
    exerciseIds: buckets.get(dayIndex) || [],
  })).filter((day) => day.exerciseIds.length > 0);
};

const extractWorkoutDaysFromProgram = (program: Program): WorkoutDayAssignment[] => {
  if (Array.isArray(program.workoutDays) && program.workoutDays.length > 0) {
    return normalizeWorkoutDays(
      program.workoutDays.map((day) => ({
        dayIndex: day.dayIndex,
        exerciseIds: day.exerciseIds || day.exercises.map((exercise) => exercise.id).filter(Boolean),
      }))
    );
  }

  return distributeExerciseIdsAcrossDays(program.exerciseIds || []);
};

const getPlanMeta = (program: Program) => {
  const rawPlan = String(program.plan || "").toLowerCase();
  const rawUserType = String(program.userType || "").toLowerCase();

  if (rawPlan.includes("premium") || rawUserType.includes("premium")) {
    return {
      label: "Premium user",
      className: "bg-[#37d66f] text-white",
    };
  }

  if (rawPlan.includes("annual")) {
    return {
      label: "Annual user",
      className: "bg-[#0d97ff] text-white",
    };
  }

  if (rawPlan.includes("quarterly")) {
    return {
      label: "Quarterly user",
      className: "bg-[#4eabff] text-white",
    };
  }

  return {
    label: "Monthly user",
    className: "bg-[#ff9f31] text-white",
  };
};

export default function ProgramManagementPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewProgramId, setViewProgramId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [workoutDays, setWorkoutDays] = useState<WorkoutDayAssignment[]>([]);
  const [activePlannerDay, setActivePlannerDay] = useState<number | null>(null);
  const [plannerExercisePickerValue, setPlannerExercisePickerValue] = useState("");
  const [programImageFiles, setProgramImageFiles] = useState<File[]>([]);
  const [programThumbnailFiles, setProgramThumbnailFiles] = useState<File[]>([]);

  const programImagePreviews = useMemo(() => programImageFiles.map((file) => URL.createObjectURL(file)), [programImageFiles]);
  const programThumbnailPreviews = useMemo(
    () => programThumbnailFiles.map((file) => URL.createObjectURL(file)),
    [programThumbnailFiles]
  );

  useEffect(
    () => () => {
      for (const preview of programImagePreviews) {
        URL.revokeObjectURL(preview);
      }
    },
    [programImagePreviews]
  );

  useEffect(
    () => () => {
      for (const preview of programThumbnailPreviews) {
        URL.revokeObjectURL(preview);
      }
    },
    [programThumbnailPreviews]
  );

  const resetFormState = () => {
    setFormData(defaultForm);
    setWorkoutDays([]);
    setActivePlannerDay(null);
    setPlannerExercisePickerValue("");
    setProgramImageFiles([]);
    setProgramThumbnailFiles([]);
  };

  const programsQuery = useQuery({
    queryKey: ["admin-programs", page, status],
    queryFn: () => getAdminPrograms({ page, limit: 10, status: status || undefined }),
  });

  const exercisesQuery = useQuery({
    queryKey: ["admin-exercises-options"],
    queryFn: () => getAdminExercises({ page: 1, limit: 100 }),
  });

  const premiumUsersQuery = useQuery({
    queryKey: ["exercise-premium-users"],
    queryFn: () => getExercisePremiumUsers(),
  });

  const viewProgramQuery = useQuery({
    queryKey: ["admin-program-details", viewProgramId],
    queryFn: () => getAdminProgramById(viewProgramId || ""),
    enabled: Boolean(viewOpen && viewProgramId),
  });

  const createMutation = useMutation({
    mutationFn: createProgram,
    onSuccess: () => {
      toast.success("Program created.");
      setFormOpen(false);
      resetFormState();
      queryClient.invalidateQueries({ queryKey: ["admin-programs"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ programId, payload }: { programId: string; payload: Parameters<typeof updateProgram>[1] }) =>
      updateProgram(programId, payload),
    onSuccess: () => {
      toast.success("Program updated.");
      setFormOpen(false);
      setSelectedProgram(null);
      resetFormState();
      queryClient.invalidateQueries({ queryKey: ["admin-programs"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProgram,
    onSuccess: () => {
      toast.success("Program deleted.");
      setDeleteOpen(false);
      setSelectedProgram(null);
      queryClient.invalidateQueries({ queryKey: ["admin-programs"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const programs = useMemo(() => programsQuery.data?.data || [], [programsQuery.data?.data]);
  const exerciseOptions = useMemo(() => exercisesQuery.data?.data || [], [exercisesQuery.data?.data]);
  const normalizedWorkoutDays = useMemo(() => normalizeWorkoutDays(workoutDays), [workoutDays]);
  const unionExerciseIds = useMemo(
    () => deriveExerciseIdsFromWorkoutDays(normalizedWorkoutDays),
    [normalizedWorkoutDays]
  );
  const resolvedActivePlannerDay = useMemo(() => {
    if (normalizedWorkoutDays.length === 0) return null;
    if (activePlannerDay && normalizedWorkoutDays.some((day) => day.dayIndex === activePlannerDay)) {
      return activePlannerDay;
    }

    return normalizedWorkoutDays[0].dayIndex;
  }, [activePlannerDay, normalizedWorkoutDays]);
  const activeWorkoutDay = useMemo(
    () => normalizedWorkoutDays.find((day) => day.dayIndex === resolvedActivePlannerDay) || null,
    [normalizedWorkoutDays, resolvedActivePlannerDay]
  );

  const onOpenCreate = () => {
    setSelectedProgram(null);
    resetFormState();
    setFormOpen(true);
  };

  const onOpenEdit = (program: Program) => {
    const nextWorkoutDays = extractWorkoutDaysFromProgram(program);

    setSelectedProgram(program);
    setProgramImageFiles([]);
    setProgramThumbnailFiles([]);
    setWorkoutDays(nextWorkoutDays);
    setActivePlannerDay(nextWorkoutDays[0]?.dayIndex || null);
    setPlannerExercisePickerValue("");
    setFormData({
      programName: program.programName || "",
      durationMinutes: String(program.durationMinutes || 30),
      programLevel: program.programLevel || "beginner",
      userType: program.userType || "normal_user",
      assignedUser: program.assignedUser?.id || "",
      programDescription: program.programDescription || "",
      mobilityType: program.mobilityType || "",
      programImages:
        Array.isArray(program.programImages) && program.programImages.length > 0
          ? program.programImages
          : program.programImage
            ? [program.programImage]
            : [],
      programThumbnails:
        Array.isArray(program.programThumbnails) && program.programThumbnails.length > 0
          ? program.programThumbnails
          : program.programThumbnail
            ? [program.programThumbnail]
            : [],
      status: program.status || "published",
    });
    setFormOpen(true);
  };

  const onOpenView = (program: Program) => {
    setSelectedProgram(program);
    setViewProgramId(program.id);
    setViewOpen(true);
  };

  const openCreateExerciseModal = () => {
    closeViewModal();
    setFormOpen(false);
    router.push("/exercise-library?open=create");
  };

  const selectWorkoutPlannerDay = (dayIndex: number) => {
    const isAlreadySelected = normalizedWorkoutDays.some((day) => day.dayIndex === dayIndex);
    if (!isAlreadySelected) {
      setWorkoutDays((prev) => normalizeWorkoutDays([...prev, { dayIndex, exerciseIds: [] }]));
    }

    setActivePlannerDay(dayIndex);
    setPlannerExercisePickerValue("");
  };

  const removeWorkoutPlannerDay = (dayIndex: number) => {
    setWorkoutDays((prev) => prev.filter((day) => day.dayIndex !== dayIndex));
    if (activePlannerDay === dayIndex) {
      setActivePlannerDay(null);
    }
    setPlannerExercisePickerValue("");
  };

  const addExerciseToWorkoutDay = (dayIndex: number, exerciseId: string) => {
    if (!exerciseId) return;

    setWorkoutDays((prev) =>
      normalizeWorkoutDays(
        prev.map((day) =>
          day.dayIndex !== dayIndex
            ? day
            : {
                ...day,
                exerciseIds: day.exerciseIds.includes(exerciseId)
                  ? day.exerciseIds
                  : [...day.exerciseIds, exerciseId],
              }
        )
      )
    );
    setPlannerExercisePickerValue("");
  };

  const removeExerciseFromWorkoutDay = (dayIndex: number, exerciseId: string) => {
    setWorkoutDays((prev) =>
      normalizeWorkoutDays(
        prev.map((day) =>
          day.dayIndex !== dayIndex
            ? day
            : {
                ...day,
                exerciseIds: day.exerciseIds.filter((id) => id !== exerciseId),
              }
        )
      )
    );
  };

  const moveExerciseInWorkoutDay = (dayIndex: number, exerciseId: string, direction: "up" | "down") => {
    setWorkoutDays((prev) =>
      normalizeWorkoutDays(
        prev.map((day) => {
          if (day.dayIndex !== dayIndex) return day;

          const currentIndex = day.exerciseIds.findIndex((id) => id === exerciseId);
          if (currentIndex < 0) return day;

          const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
          if (nextIndex < 0 || nextIndex >= day.exerciseIds.length) return day;

          const nextExerciseIds = [...day.exerciseIds];
          const [item] = nextExerciseIds.splice(currentIndex, 1);
          nextExerciseIds.splice(nextIndex, 0, item);

          return {
            ...day,
            exerciseIds: nextExerciseIds,
          };
        })
      )
    );
  };

  const onSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedProgram && programImageFiles.length === 0 && formData.programImages.length === 0) {
      toast.error("Program image is required.");
      return;
    }

    if (normalizedWorkoutDays.length === 0) {
      toast.error("Select at least one workout day.");
      return;
    }

    const emptyDay = normalizedWorkoutDays.find((day) => day.exerciseIds.length === 0);
    if (emptyDay) {
      toast.error(`${getWorkoutDayLabel(emptyDay.dayIndex)} must include at least one exercise.`);
      return;
    }

    if (unionExerciseIds.length === 0) {
      toast.error("Select at least one exercise.");
      return;
    }

    const payload = new FormData();
    payload.append("programName", formData.programName);
    payload.append("programDuration", `${formData.durationMinutes} Minutes`);
    payload.append("durationMinutes", String(Number(formData.durationMinutes)));
    payload.append("programLevel", formData.programLevel);
    payload.append("userType", formData.userType);
    payload.append("programDescription", formData.programDescription);
    payload.append("mobilityType", formData.mobilityType);
    payload.append("exerciseIds", JSON.stringify(unionExerciseIds));
    payload.append("workoutDays", JSON.stringify(normalizedWorkoutDays));
    payload.append("status", formData.status);

    if (formData.userType === "premium_user" && formData.assignedUser) {
      payload.append("assignedUser", formData.assignedUser);
    }

    if (programImageFiles.length > 0) {
      for (const file of programImageFiles) {
        payload.append("programImages", file);
      }
    } else if (selectedProgram) {
      payload.append("programImages", JSON.stringify(formData.programImages));
    }

    if (programThumbnailFiles.length > 0) {
      for (const file of programThumbnailFiles) {
        payload.append("programThumbnails", file);
      }
    } else if (selectedProgram) {
      payload.append("programThumbnails", JSON.stringify(formData.programThumbnails));
    }

    if (selectedProgram) {
      updateMutation.mutate({ programId: selectedProgram.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const displayedProgramImages = programImagePreviews.length > 0 ? programImagePreviews : formData.programImages;
  const displayedProgramThumbnails = programThumbnailPreviews.length > 0 ? programThumbnailPreviews : formData.programThumbnails;
  const activeDayExercises = useMemo(
    () =>
      (activeWorkoutDay?.exerciseIds || []).map((exerciseId) => {
        const matchedExercise = exerciseOptions.find((exercise) => exercise.id === exerciseId);
        return {
          id: exerciseId,
          name: matchedExercise?.exerciseName || exerciseId,
        };
      }),
    [activeWorkoutDay?.exerciseIds, exerciseOptions]
  );

  const removeProgramImageAt = (index: number) => {
    if (programImagePreviews.length > 0) {
      setProgramImageFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      programImages: prev.programImages.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const removeProgramThumbnailAt = (index: number) => {
    if (programThumbnailPreviews.length > 0) {
      setProgramThumbnailFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      programThumbnails: prev.programThumbnails.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const activeViewProgram = viewProgramQuery.data || selectedProgram;
  const activeViewWorkoutDays = useMemo(() => {
    if (!activeViewProgram) {
      return [] as Array<{
        dayIndex: number;
        dayLabel: string;
        exercises: Array<{ id: string; exerciseName: string }>;
      }>;
    }

    const fallbackExerciseLookup = new Map(
      (activeViewProgram.exercises || []).map((exercise) => [exercise.id, exercise.exerciseName])
    );
    const extractedDays = extractWorkoutDaysFromProgram(activeViewProgram);

    return extractedDays.map((day) => ({
      dayIndex: day.dayIndex,
      dayLabel:
        activeViewProgram.workoutDays?.find((item) => item.dayIndex === day.dayIndex)?.dayLabel ||
        getWorkoutDayLabel(day.dayIndex),
      exercises: day.exerciseIds.map((exerciseId) => ({
        id: exerciseId,
        exerciseName:
          activeViewProgram.workoutDays
            ?.find((item) => item.dayIndex === day.dayIndex)
            ?.exercises.find((exercise) => exercise.id === exerciseId)?.exerciseName ||
          fallbackExerciseLookup.get(exerciseId) ||
          exerciseId,
      })),
    }));
  }, [activeViewProgram]);
  const featuredExercise = activeViewProgram?.exercises?.[0] as
    | (Program["exercises"][number] & { demoVideo?: string | null; demoVideos?: string[] })
    | undefined;
  const featuredVideo = featuredExercise?.demoVideo || featuredExercise?.demoVideos?.[0] || "";
  const closeViewModal = () => {
    setViewOpen(false);
    setViewProgramId(null);
  };

  return (
    <div className="space-y-5">
      <PageTitle
        title="Programs Management"
        breadcrumb="Dashboard  >  Programs Management"
        action={
          <Button
            className="w-full rounded-md border border-[#9cd7ff6e] bg-[linear-gradient(180deg,#98d5f8_0%,#5d97c4_100%)] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_-16px_rgba(126,195,244,.8)] hover:brightness-105 md:w-auto"
            onClick={onOpenCreate}
          >
            <Plus className="mr-2 size-4" />
            Add new Programs
          </Button>
        }
      />

      <Card className="overflow-hidden border-[#80b8df42]">
        <CardContent className="space-y-4 p-0">
          <div className="flex items-center justify-end px-4 pt-4">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span>Sort by</span>
              <Select
                value={status}
                className="h-8 w-24 rounded-full border-[#8ec5eb7a] bg-[#0e2444]/80 px-2 text-xs"
                onChange={(event) => {
                  setPage(1);
                  setStatus(event.target.value);
                }}
              >
                <option value="">All</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
          </div>

          {programsQuery.isLoading ? (
            <div className="px-4 pb-4">
              <TableSkeleton rows={10} />
            </div>
          ) : programs.length === 0 ? (
            <div className="px-4 pb-6">
              <EmptyState title="No programs found" description="Create your first program." />
            </div>
          ) : (
            <>
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-11 text-xs">Programs Image</TableHead>
                    <TableHead className="h-11 text-xs">Plan</TableHead>
                    <TableHead className="h-11 text-xs">Programs Name</TableHead>
                    <TableHead className="h-11 text-xs">Exercise</TableHead>
                    <TableHead className="h-11 text-xs">Time</TableHead>
                    <TableHead className="h-11 text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programs.map((program) => {
                    const planMeta = getPlanMeta(program);

                    return (
                      <TableRow key={program.id} className="border-white/30 hover:bg-white/[0.03]">
                        <TableCell className="py-3">
                          {program.programImage || program.programImages?.[0] ? (
                            <img
                              src={program.programImage || program.programImages?.[0] || ""}
                              alt={program.programName}
                              className="size-11 rounded-md border border-white/15 object-cover"
                            />
                          ) : (
                            <div className="flex size-11 items-center justify-center rounded-md border border-white/10 bg-white/5 text-sm font-semibold text-slate-200">
                              {program.programName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <span
                            className={cn(
                              "inline-flex min-w-24 items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold",
                              planMeta.className
                            )}
                          >
                            {planMeta.label}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-sm">{program.programName}</TableCell>
                        <TableCell className="py-3 text-sm text-slate-200">{program.totalExercises} Exercises</TableCell>
                        <TableCell className="py-3 text-sm text-slate-200">{program.durationMinutes} Minutes</TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="inline-flex h-8 items-center gap-2 rounded-md border border-[#2f80cc] bg-[#102849] px-3 text-xs font-semibold text-[#63bfff] transition-colors hover:bg-[#16345c]"
                              onClick={() => onOpenView(program)}
                            >
                              <Eye className="size-3.5" />
                              View Details
                            </button>
                            <button
                              type="button"
                              className="inline-flex size-8 items-center justify-center rounded-full bg-[#22bf61] text-white transition-colors hover:bg-[#2cd46d]"
                              onClick={() => onOpenEdit(program)}
                              aria-label="Edit program"
                            >
                              <SquarePen className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex size-8 items-center justify-center rounded-full bg-[#ff2f5f] text-white transition-colors hover:bg-[#ff416f]"
                              onClick={() => {
                                setSelectedProgram(program);
                                setDeleteOpen(true);
                              }}
                              aria-label="Delete program"
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

              <div className="space-y-1 px-4 pb-4">
                <p className="text-xs text-slate-300/80">
                  Showing {programs.length > 0 ? (page - 1) * 10 + 1 : 0} to {(page - 1) * 10 + programs.length} of {programsQuery.data?.meta?.total || 0}
                  results
                </p>
                <Pagination page={page} totalPages={programsQuery.data?.meta?.totalPages || 1} onPageChange={setPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedProgram(null);
          resetFormState();
        }}
        title={selectedProgram ? selectedProgram.programName : "Add New Program"}
        className="sm:max-w-3xl"
      >
        <form className="space-y-4" onSubmit={onSubmitForm}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Program Name</Label>
              <input
                className="h-10 w-full rounded border border-[#7cb6df66] bg-[#1b3457]/80 px-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-[#93ceff99]"
                value={formData.programName}
                onChange={(event) => setFormData((prev) => ({ ...prev, programName: event.target.value }))}
                placeholder="Strength Training"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Program Duration</Label>
              <input
                type="number"
                min={1}
                className="h-10 w-full rounded border border-[#7cb6df66] bg-[#1b3457]/80 px-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-[#93ceff99]"
                value={formData.durationMinutes}
                onChange={(event) => setFormData((prev) => ({ ...prev, durationMinutes: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Program Level</Label>
              <Select
                value={formData.programLevel}
                className="h-10"
                onChange={(event) => setFormData((prev) => ({ ...prev, programLevel: event.target.value }))}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            </div>
            <ProgramUserTypeFields
              userType={formData.userType}
              assignedUser={formData.assignedUser}
              premiumUsers={premiumUsersQuery.data || []}
              onUserTypeChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  userType: value,
                  assignedUser: value === "premium_user" ? prev.assignedUser : "",
                }))
              }
              onAssignedUserChange={(value) => setFormData((prev) => ({ ...prev, assignedUser: value }))}
            />

            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">Program Description</Label>
              <Textarea
                className="min-h-[92px]"
                value={formData.programDescription}
                onChange={(event) => setFormData((prev) => ({ ...prev, programDescription: event.target.value }))}
                placeholder="Type..."
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">Upload Program Image</Label>
              {displayedProgramImages.length > 0 ? (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {displayedProgramImages.map((imageUrl, index) => (
                    <div key={`${imageUrl}-${index}`} className="relative inline-flex">
                      <img
                        src={imageUrl}
                        alt="Program preview"
                        className="size-16 rounded border border-white/15 object-cover"
                      />
                      <button
                        type="button"
                        className="absolute -right-2 -top-2 inline-flex size-5 items-center justify-center rounded-full border border-white/20 bg-[#ff2f5f] text-white transition-colors hover:bg-[#ff4672]"
                        onClick={() => removeProgramImageAt(index)}
                        aria-label="Remove program image"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <input
                id="program-image-upload"
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  setProgramImageFiles(files);
                  if (files.length > 0) {
                    setFormData((prev) => ({ ...prev, programImages: [] }));
                  }
                }}
                required={!selectedProgram && programImageFiles.length === 0 && formData.programImages.length === 0}
              />
              <label
                htmlFor="program-image-upload"
                className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded border border-[#7cb6df66] bg-[#1b3457]/50 text-xs text-slate-100 transition hover:bg-[#23456f]/55"
              >
                <Upload className="size-3.5" />
                Upload Program Image
              </label>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">Upload Program Thumbnail</Label>
              {displayedProgramThumbnails.length > 0 ? (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {displayedProgramThumbnails.map((imageUrl, index) => (
                    <div key={`${imageUrl}-${index}`} className="relative inline-flex">
                      <img
                        src={imageUrl}
                        alt="Program thumbnail preview"
                        className="h-16 w-24 rounded border border-white/15 object-cover"
                      />
                      <button
                        type="button"
                        className="absolute -right-2 -top-2 inline-flex size-5 items-center justify-center rounded-full border border-white/20 bg-[#ff2f5f] text-white transition-colors hover:bg-[#ff4672]"
                        onClick={() => removeProgramThumbnailAt(index)}
                        aria-label="Remove program thumbnail"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <input
                id="program-thumbnail-upload"
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  setProgramThumbnailFiles(files);
                  if (files.length > 0) {
                    setFormData((prev) => ({ ...prev, programThumbnails: [] }));
                  }
                }}
              />
              <label
                htmlFor="program-thumbnail-upload"
                className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded border border-[#7cb6df66] bg-[#1b3457]/50 text-xs text-slate-100 transition hover:bg-[#23456f]/55"
              >
                <Upload className="size-3.5" />
                Upload Program Thumbnail
              </label>
            </div>

            <div className="space-y-3 md:col-span-2">
              <Label className="text-xs">Workout Day Planner</Label>
              <div className="rounded-lg border border-[#7cb6df55] bg-[#1b3457]/35 p-3">
                <p className="text-xs text-slate-200">Choose workout days (Monday = 1 to Sunday = 7)</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const isSelected = normalizedWorkoutDays.some((item) => item.dayIndex === day.dayIndex);
                    const isActive = isSelected && activePlannerDay === day.dayIndex;

                    return (
                      <div key={day.dayIndex} className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          className={cn(
                            "inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold transition-colors",
                            isActive
                              ? "border-[#9fd8ff] bg-[#5d97c4] text-white"
                              : isSelected
                                ? "border-[#7cb6df99] bg-[#1f4268] text-slate-100 hover:bg-[#285176]"
                                : "border-[#7cb6df55] bg-[#10253f] text-slate-300 hover:bg-[#163354]"
                          )}
                          onClick={() => selectWorkoutPlannerDay(day.dayIndex)}
                        >
                          {day.label}
                        </button>
                        {isSelected ? (
                          <button
                            type="button"
                            className="inline-flex size-5 items-center justify-center rounded-full border border-[#7cb6df66] bg-[#132f4f] text-slate-300 transition-colors hover:bg-[#20486e] hover:text-white"
                            onClick={() => removeWorkoutPlannerDay(day.dayIndex)}
                            aria-label={`Remove ${day.label}`}
                          >
                            <X className="size-3" />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-300/90">
                  {normalizedWorkoutDays.length} day(s) selected • {unionExerciseIds.length} unique exercise(s)
                </p>
              </div>

              {activeWorkoutDay ? (
                <div className="rounded-lg border border-[#7cb6df55] bg-[#1b3457]/35 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">
                      Exercises for {getWorkoutDayLabel(activeWorkoutDay.dayIndex)}
                    </p>
                    <span className="rounded-full border border-[#7cb6df66] bg-[#163457]/80 px-2 py-1 text-[11px] text-slate-200">
                      {activeDayExercises.length} assigned
                    </span>
                  </div>

                  <Select
                    value={plannerExercisePickerValue}
                    className="h-10"
                    onChange={(event) => {
                      const value = event.target.value;
                      setPlannerExercisePickerValue(value);
                      addExerciseToWorkoutDay(activeWorkoutDay.dayIndex, value);
                    }}
                  >
                    <option value="">Add exercise to {getWorkoutDayLabel(activeWorkoutDay.dayIndex)}</option>
                    {exerciseOptions.map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.exerciseName}
                      </option>
                    ))}
                  </Select>

                  {activeDayExercises.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {activeDayExercises.map((exercise, index) => (
                        <li
                          key={exercise.id}
                          className="flex items-center justify-between gap-2 rounded-md border border-[#7cb6df44] bg-[#173456]/55 px-3 py-2 text-sm text-slate-100"
                        >
                          <div className="inline-flex items-center gap-2">
                            <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#4f8dc6] text-[11px] font-semibold">
                              {index + 1}
                            </span>
                            {exercise.name}
                          </div>
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              className="inline-flex size-6 items-center justify-center rounded border border-[#7cb6df66] bg-[#102849] text-slate-200 transition-colors hover:bg-[#18406d] disabled:opacity-40"
                              onClick={() => moveExerciseInWorkoutDay(activeWorkoutDay.dayIndex, exercise.id, "up")}
                              disabled={index === 0}
                              aria-label="Move up"
                            >
                              <ArrowUp className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex size-6 items-center justify-center rounded border border-[#7cb6df66] bg-[#102849] text-slate-200 transition-colors hover:bg-[#18406d] disabled:opacity-40"
                              onClick={() => moveExerciseInWorkoutDay(activeWorkoutDay.dayIndex, exercise.id, "down")}
                              disabled={index === activeDayExercises.length - 1}
                              aria-label="Move down"
                            >
                              <ArrowDown className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex size-6 items-center justify-center rounded-full bg-[#ff2f5f] text-white transition-colors hover:bg-[#ff416f]"
                              onClick={() => removeExerciseFromWorkoutDay(activeWorkoutDay.dayIndex, exercise.id)}
                              aria-label="Remove exercise"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-slate-300/85">
                      No exercises assigned for this day yet. Add at least one to continue.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-300/85">
                  Select at least one workout day, then assign exercises for each selected day.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Program Mobility</Label>
              <input
                className="h-10 w-full rounded border border-[#7cb6df66] bg-[#1b3457]/80 px-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-[#93ceff99]"
                value={formData.mobilityType}
                onChange={(event) => setFormData((prev) => ({ ...prev, mobilityType: event.target.value }))}
                placeholder="Wheelchair user"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Status</Label>
              <Select
                value={formData.status}
                className="h-10"
                onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
          </div>

          <ProgramFormActions
            isPending={createMutation.isPending || updateMutation.isPending}
            isEditMode={Boolean(selectedProgram)}
            onCancel={() => setFormOpen(false)}
            onAddExercise={openCreateExerciseModal}
          />
        </form>
      </Modal>

      <Modal
        open={viewOpen}
        onClose={closeViewModal}
        title=""
        className="sm:max-w-4xl"
      >
        {viewProgramQuery.isLoading && !activeViewProgram ? (
          <div className="py-10 text-center text-sm text-slate-300">Loading program details...</div>
        ) : viewProgramQuery.isError && !activeViewProgram ? (
          <div className="space-y-3 py-6 text-center">
            <p className="text-sm text-red-300">{getErrorMessage(viewProgramQuery.error, "Failed to load program details.")}</p>
            <Button
              type="button"
              className="h-9 rounded border border-[#9cd7ff6e] bg-[linear-gradient(180deg,#98d5f8_0%,#5d97c4_100%)] px-4 text-xs"
              onClick={() => viewProgramQuery.refetch()}
            >
              Try Again
            </Button>
          </div>
        ) : activeViewProgram ? (
          <div className="space-y-4 text-slate-100">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-slate-200 transition-colors hover:text-white"
                onClick={closeViewModal}
              >
                <ArrowLeft className="size-4" />
                Go Back
              </button>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-full bg-[#22bf61] text-white transition-colors hover:bg-[#2cd46d]"
                onClick={() => {
                  closeViewModal();
                  onOpenEdit(activeViewProgram);
                }}
                aria-label="Edit program"
              >
                <SquarePen className="size-4" />
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-[1.8fr_1fr]">
              <div className="overflow-hidden rounded-lg border border-[#7cb6df55] bg-[#1b3457]/45">
                {activeViewProgram.programThumbnail || activeViewProgram.programThumbnails?.[0] || activeViewProgram.programImage || activeViewProgram.programImages?.[0] ? (
                  <img
                    src={activeViewProgram.programThumbnail || activeViewProgram.programThumbnails?.[0] || activeViewProgram.programImage || activeViewProgram.programImages?.[0] || ""}
                    alt={`${activeViewProgram.programName} banner`}
                    className="h-28 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-28 items-center justify-center text-sm text-slate-300">No program banner</div>
                )}
              </div>
              <div className="overflow-hidden rounded-lg border border-[#7cb6df55] bg-[#1b3457]/45">
                {featuredVideo ? (
                  <video
                    src={featuredVideo}
                    className="h-28 w-full object-cover"
                    controls
                    preload="metadata"
                  />
                ) : activeViewProgram.programImage || activeViewProgram.programImages?.[0] ? (
                  <img src={activeViewProgram.programImage || activeViewProgram.programImages?.[0] || ""} alt={activeViewProgram.programName} className="h-28 w-full object-cover" />
                ) : (
                  <div className="flex h-28 items-center justify-center text-sm text-slate-300">No media available</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white">{activeViewProgram.programName}</h3>
              <p className="mt-1 text-xs text-slate-300">Created: {formatDate(activeViewProgram.createdAt)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#7cb6df66] bg-[#1b3457]/70 px-2 py-1 text-[11px] text-slate-100">
                  {activeViewProgram.totalExercises} Exercise
                </span>
                <span className="rounded-full border border-[#7cb6df66] bg-[#1b3457]/70 px-2 py-1 text-[11px] text-slate-100">
                  {activeViewProgram.durationMinutes} min
                </span>
                <span className="rounded-full border border-[#7cb6df66] bg-[#1b3457]/70 px-2 py-1 text-[11px] capitalize text-slate-100">
                  {activeViewProgram.weekCount || 0} Weeks
                </span>
                <span className="rounded-full border border-[#7cb6df66] bg-[#1b3457]/70 px-2 py-1 text-[11px] capitalize text-slate-100">
                  {activeViewProgram.programLevel}
                </span>
                <span className="rounded-full border border-[#7cb6df66] bg-[#1b3457]/70 px-2 py-1 text-[11px] capitalize text-slate-100">
                  {activeViewProgram.status}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">Description</p>
              <p className="mt-1 text-sm text-slate-200/90">{activeViewProgram.programDescription || "No description available."}</p>
            </div>

            <div className="rounded-lg border border-[#7cb6df55] bg-[#1b3457]/35 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Workout Days & Exercises</p>
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-[#8ec5eb6e] bg-[linear-gradient(180deg,#98d5f8_0%,#5d97c4_100%)] px-3 text-xs font-semibold text-white"
                  onClick={openCreateExerciseModal}
                >
                  <Plus className="size-3.5" />
                  Add New Exercise
                </button>
              </div>

              {activeViewWorkoutDays.length > 0 ? (
                <div className="space-y-3">
                  {activeViewWorkoutDays.map((day) => (
                    <div key={day.dayIndex} className="rounded-md border border-[#7cb6df44] bg-[#173456]/55 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">{day.dayLabel}</p>
                        <span className="rounded-full border border-[#7cb6df66] bg-[#163457]/80 px-2 py-1 text-[11px] text-slate-200">
                          {day.exercises.length} exercise(s)
                        </span>
                      </div>

                      {day.exercises.length > 0 ? (
                        <ul className="space-y-2">
                          {day.exercises.map((exercise, index) => (
                            <li key={exercise.id || `${exercise.exerciseName}-${index}`} className="flex items-center gap-2 text-sm text-slate-100">
                              <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#4f8dc6] text-[11px] font-semibold">
                                {index + 1}
                              </span>
                              {exercise.exerciseName}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-300">No exercises assigned.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-300">No exercises found.</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (selectedProgram) {
            deleteMutation.mutate(selectedProgram.id);
          }
        }}
        title="Are you sure?"
        description="You want to delete this program from your dashboard. This will remove it from the user app as well."
        confirmText="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
