"use client";

import { Edit3, Eye, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Pagination } from "@/components/shared/pagination";
import { StatusChip } from "@/components/shared/status-chip";
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
  createProgram,
  deleteProgram,
  getAdminExercises,
  getAdminPrograms,
  getErrorMessage,
  getProgramPremiumUsers,
  updateProgram,
  type Program,
} from "@/lib/api";
import { formatDate } from "@/lib/utils";

const defaultForm = {
  programName: "",
  durationMinutes: "30",
  programLevel: "beginner",
  userType: "normal_user",
  assignedUser: "",
  programDescription: "",
  mobilityType: "",
  exerciseIds: "",
  programImage: "",
  programThumbnail: "",
  status: "published",
};

export default function ProgramManagementPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [programImageFile, setProgramImageFile] = useState<File | null>(null);
  const [programThumbnailFile, setProgramThumbnailFile] = useState<File | null>(null);
  const programImagePreview = useFilePreview(programImageFile);
  const programThumbnailPreview = useFilePreview(programThumbnailFile);

  const resetFormState = () => {
    setFormData(defaultForm);
    setProgramImageFile(null);
    setProgramThumbnailFile(null);
  };

  const programsQuery = useQuery({
    queryKey: ["admin-programs", page, search, status],
    queryFn: () => getAdminPrograms({ page, limit: 10, search, status: status || undefined }),
  });

  const exercisesQuery = useQuery({
    queryKey: ["admin-exercises-options"],
    queryFn: () => getAdminExercises({ page: 1, limit: 100 }),
  });

  const premiumUsersQuery = useQuery({
    queryKey: ["program-premium-users"],
    queryFn: () => getProgramPremiumUsers(),
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
      toast.success("Program archived.");
      setDeleteOpen(false);
      setSelectedProgram(null);
      queryClient.invalidateQueries({ queryKey: ["admin-programs"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const programs = useMemo(() => programsQuery.data?.data || [], [programsQuery.data?.data]);

  const onOpenCreate = () => {
    setSelectedProgram(null);
    resetFormState();
    setFormOpen(true);
  };

  const onOpenEdit = (program: Program) => {
    setSelectedProgram(program);
    setProgramImageFile(null);
    setProgramThumbnailFile(null);
    setFormData({
      programName: program.programName || "",
      durationMinutes: String(program.durationMinutes || 30),
      programLevel: program.programLevel || "beginner",
      userType: program.userType || "normal_user",
      assignedUser: program.assignedUser?.id || "",
      programDescription: program.programDescription || "",
      mobilityType: program.mobilityType || "",
      exerciseIds: program.exerciseIds?.join(",") || "",
      programImage: program.programImage || "",
      programThumbnail: program.programThumbnail || "",
      status: program.status || "published",
    });
    setFormOpen(true);
  };

  const onSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedProgram && !programImageFile) {
      toast.error("Program image is required.");
      return;
    }

    const exerciseIds = formData.exerciseIds
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = new FormData();
    payload.append("programName", formData.programName);
    payload.append("programDuration", `${formData.durationMinutes} Minutes`);
    payload.append("durationMinutes", String(Number(formData.durationMinutes)));
    payload.append("programLevel", formData.programLevel);
    payload.append("userType", formData.userType);
    payload.append("programDescription", formData.programDescription);
    payload.append("mobilityType", formData.mobilityType);
    payload.append("exerciseIds", JSON.stringify(exerciseIds));
    payload.append("status", formData.status);

    if (formData.userType === "premium_user" && formData.assignedUser) {
      payload.append("assignedUser", formData.assignedUser);
    }

    if (programImageFile) {
      payload.append("programImages", programImageFile);
    }

    if (programThumbnailFile) {
      payload.append("programThumbnails", programThumbnailFile);
    }

    if (selectedProgram) {
      updateMutation.mutate({ programId: selectedProgram.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-5">
      <PageTitle
        title="Programs Management"
        breadcrumb="Dashboard  >  Programs Management"
        action={
          <Button className="w-full md:w-auto" onClick={onOpenCreate}>
            <Plus className="mr-2 size-4" />
            Add new Programs
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-300" />
              <Input
                className="pl-10"
                placeholder="Search programs"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
              />
            </div>
            <Select
              value={status}
              className="md:w-48"
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
            >
              <option value="">All status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </Select>
          </div>

          {programsQuery.isLoading ? (
            <TableSkeleton rows={10} />
          ) : programs.length === 0 ? (
            <EmptyState title="No programs found" description="Create your first program." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Programs Name</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Exercise</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programs.map((program) => (
                    <TableRow key={program.id}>
                      <TableCell>{program.programName}</TableCell>
                      <TableCell className="capitalize">{program.userType.replace("_", " ")}</TableCell>
                      <TableCell>{program.totalExercises} Exercises</TableCell>
                      <TableCell>{program.durationMinutes} Minutes</TableCell>
                      <TableCell>
                        <StatusChip value={program.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedProgram(program);
                              setViewOpen(true);
                            }}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button variant="secondary" size="icon" onClick={() => onOpenEdit(program)}>
                            <Edit3 className="size-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                              setSelectedProgram(program);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <p className="text-sm text-slate-300">
                Showing {programs.length > 0 ? (page - 1) * 10 + 1 : 0} to {(page - 1) * 10 + programs.length} of {programsQuery.data?.meta?.total || 0}
                results
              </p>

              <Pagination page={page} totalPages={programsQuery.data?.meta?.totalPages || 1} onPageChange={setPage} />
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
        title={selectedProgram ? "Edit Program" : "Add New Program"}
      >
        <form className="space-y-4" onSubmit={onSubmitForm}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Program Name</Label>
              <Input
                value={formData.programName}
                onChange={(event) => setFormData((prev) => ({ ...prev, programName: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Program Duration (Minutes)</Label>
              <Input
                type="number"
                min={1}
                value={formData.durationMinutes}
                onChange={(event) => setFormData((prev) => ({ ...prev, durationMinutes: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Program Level</Label>
              <Select
                value={formData.programLevel}
                onChange={(event) => setFormData((prev) => ({ ...prev, programLevel: event.target.value }))}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>User type</Label>
              <Select
                value={formData.userType}
                onChange={(event) => setFormData((prev) => ({ ...prev, userType: event.target.value }))}
              >
                <option value="normal_user">Normal user</option>
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
              <Label>Program Description</Label>
              <Textarea
                value={formData.programDescription}
                onChange={(event) => setFormData((prev) => ({ ...prev, programDescription: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Mobility Type</Label>
              <Input
                value={formData.mobilityType}
                onChange={(event) => setFormData((prev) => ({ ...prev, mobilityType: event.target.value }))}
              />
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
            <div className="space-y-2 md:col-span-2">
              <Label>Exercise IDs (comma separated)</Label>
              <Input
                value={formData.exerciseIds}
                onChange={(event) => setFormData((prev) => ({ ...prev, exerciseIds: event.target.value }))}
                placeholder="Paste exercise ids separated by commas"
                required
              />
              <p className="text-xs text-slate-300">
                Available IDs: {(exercisesQuery.data?.data || []).slice(0, 8).map((exercise) => exercise.id).join(", ")}
              </p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Program Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => setProgramImageFile(event.target.files?.[0] || null)}
                required={!selectedProgram}
              />
              {programImagePreview || formData.programImage ? (
                <img
                  src={programImagePreview || formData.programImage}
                  alt="Program preview"
                  className="h-40 w-full rounded-lg object-cover"
                />
              ) : null}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Program Thumbnail</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => setProgramThumbnailFile(event.target.files?.[0] || null)}
              />
              {programThumbnailPreview || formData.programThumbnail ? (
                <img
                  src={programThumbnailPreview || formData.programThumbnail}
                  alt="Program thumbnail preview"
                  className="h-28 w-full rounded-lg object-cover"
                />
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : selectedProgram
                  ? "Save"
                  : "Add New Program"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title={selectedProgram?.programName || "Program details"}>
        {selectedProgram ? (
          <div className="space-y-4 text-slate-100">
            <p className="text-sm text-slate-300">Created: {formatDate(selectedProgram.createdAt)}</p>
            <p>{selectedProgram.programDescription || "No description"}</p>
            <div className="flex flex-wrap gap-2">
              <StatusChip value={selectedProgram.status} />
              <span className="rounded-full border border-blue-300/40 px-3 py-1 text-xs capitalize">{selectedProgram.userType.replace("_", " ")}</span>
              <span className="rounded-full border border-blue-300/40 px-3 py-1 text-xs">{selectedProgram.durationMinutes} min</span>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-white">Exercises</p>
              <ul className="space-y-2 text-sm text-slate-200">
                {selectedProgram.exercises?.length ? (
                  selectedProgram.exercises.map((exercise, index) => (
                    <li key={exercise.id || `${exercise.exerciseName}-${index}`}>
                      {index + 1}. {exercise.exerciseName}
                    </li>
                  ))
                ) : (
                  <li>No exercises found.</li>
                )}
              </ul>
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
        description="You want to delete this program from dashboard and user app."
        confirmText="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
