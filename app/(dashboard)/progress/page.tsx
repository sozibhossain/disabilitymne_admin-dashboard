"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Pagination } from "@/components/shared/pagination";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getAdminExercises,
  getAdminPrograms,
  getAdminUsers,
  getWorkoutProgress,
  type WorkoutProgress,
} from "@/lib/api";
import { formatDate } from "@/lib/utils";

const DAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

const LOGS_PAGE_SIZE = 20;

const toChartDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const aggregateStrengthByWeek = (strengthTrend: WorkoutProgress["series"]["strengthTrend"]) => {
  const grouped = new Map<
    string,
    { weekStartDate: string; totalVolume: number; bestWeightKg: number; bestReps: number }
  >();

  for (const row of strengthTrend) {
    const weekStartDate = row.weekStartDate ? String(row.weekStartDate).slice(0, 10) : "Unknown";
    const current = grouped.get(weekStartDate) || {
      weekStartDate,
      totalVolume: 0,
      bestWeightKg: 0,
      bestReps: 0,
    };

    current.totalVolume += Number(row.totalVolume || 0);
    current.bestWeightKg = Math.max(current.bestWeightKg, Number(row.bestWeightKg || 0));
    current.bestReps = Math.max(current.bestReps, Number(row.bestReps || 0));

    grouped.set(weekStartDate, current);
  }

  return [...grouped.values()].sort((a, b) => new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime());
};

export default function ProgressPage() {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");
  const [programId, setProgramId] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const usersQuery = useQuery({
    queryKey: ["progress-users-options"],
    queryFn: () => getAdminUsers({ page: 1, limit: 100 }),
  });

  const programsQuery = useQuery({
    queryKey: ["progress-programs-options"],
    queryFn: () => getAdminPrograms({ page: 1, limit: 100 }),
  });

  const exercisesQuery = useQuery({
    queryKey: ["progress-exercises-options"],
    queryFn: () => getAdminExercises({ page: 1, limit: 100 }),
  });

  const progressQuery = useQuery({
    queryKey: ["admin-workout-progress", page, userId, programId, exerciseId, startDate, endDate],
    queryFn: () =>
      getWorkoutProgress({
        page,
        limit: LOGS_PAGE_SIZE,
        userId: userId || undefined,
        programId: programId || undefined,
        exerciseId: exerciseId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  const progressData = progressQuery.data?.data;
  const summary = progressData?.summary;
  const recentLogs = progressData?.recentLogs || [];

  const adherenceChartData = useMemo(
    () =>
      (progressData?.series.adherenceByWeek || []).map((row) => ({
        ...row,
        weekLabel: toChartDate(row.weekStartDate),
      })),
    [progressData?.series.adherenceByWeek]
  );

  const strengthByWeek = useMemo(
    () => aggregateStrengthByWeek(progressData?.series.strengthTrend || []),
    [progressData?.series.strengthTrend]
  );

  return (
    <div className="space-y-5">
      <PageTitle title="Progress" breadcrumb="Dashboard  >  Progress" />

      <Card className="border-[#80b8df42]">
        <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs">User</Label>
            <Select
              value={userId}
              className="h-10"
              onChange={(event) => {
                setUserId(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All users</option>
              {(usersQuery.data?.data || []).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Program</Label>
            <Select
              value={programId}
              className="h-10"
              onChange={(event) => {
                setProgramId(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All programs</option>
              {(programsQuery.data?.data || []).map((program) => (
                <option key={program.id} value={program.id}>
                  {program.programName}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Exercise</Label>
            <Select
              value={exerciseId}
              className="h-10"
              onChange={(event) => {
                setExerciseId(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All exercises</option>
              {(exercisesQuery.data?.data || []).map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.exerciseName}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Start Date</Label>
            <input
              type="date"
              className="h-10 w-full rounded border border-[#7cb6df66] bg-[#1b3457]/80 px-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-[#93ceff99]"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">End Date</Label>
            <input
              type="date"
              className="h-10 w-full rounded border border-[#7cb6df66] bg-[#1b3457]/80 px-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-[#93ceff99]"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-[#80b8df42] bg-[#1b3457]/40">
          <CardContent className="p-4">
            <p className="text-xs text-slate-300">Completed Workout Days</p>
            <p className="mt-1 text-2xl font-semibold text-white">{summary?.completedWorkoutDays ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-[#80b8df42] bg-[#1b3457]/40">
          <CardContent className="p-4">
            <p className="text-xs text-slate-300">Scheduled Exercises</p>
            <p className="mt-1 text-2xl font-semibold text-white">{summary?.scheduledExercises ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-[#80b8df42] bg-[#1b3457]/40">
          <CardContent className="p-4">
            <p className="text-xs text-slate-300">Completed Exercises</p>
            <p className="mt-1 text-2xl font-semibold text-white">{summary?.completedExercises ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-[#80b8df42] bg-[#1b3457]/40">
          <CardContent className="p-4">
            <p className="text-xs text-slate-300">Adherence</p>
            <p className="mt-1 text-2xl font-semibold text-white">{summary?.adherencePercent ?? 0}%</p>
          </CardContent>
        </Card>
        <Card className="border-[#80b8df42] bg-[#1b3457]/40">
          <CardContent className="p-4">
            <p className="text-xs text-slate-300">Total Volume</p>
            <p className="mt-1 text-2xl font-semibold text-white">{summary?.totalTrainingVolume ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="border-[#80b8df42]">
          <CardContent className="p-4">
            <p className="mb-3 text-sm font-semibold text-white">Adherence Trend</p>
            {adherenceChartData.length === 0 ? (
              <p className="text-sm text-slate-300">No adherence data for selected filters.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={adherenceChartData}>
                    <CartesianGrid stroke="#ffffff12" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="weekLabel" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0e2444", borderColor: "#7cb6df66", color: "#fff" }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Line type="monotone" dataKey="adherencePercent" stroke="#7dcfff" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#80b8df42]">
          <CardContent className="p-4">
            <p className="mb-3 text-sm font-semibold text-white">Strength Progression</p>
            {strengthByWeek.length === 0 ? (
              <p className="text-sm text-slate-300">No strength data for selected filters.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={strengthByWeek.map((row) => ({
                      ...row,
                      weekLabel: toChartDate(row.weekStartDate),
                    }))}
                  >
                    <defs>
                      <linearGradient id="strengthVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6cd7be" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6cd7be" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#ffffff12" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="weekLabel" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0e2444", borderColor: "#7cb6df66", color: "#fff" }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Area type="monotone" dataKey="totalVolume" stroke="#6cd7be" fill="url(#strengthVolumeGradient)" />
                    <Line type="monotone" dataKey="bestWeightKg" stroke="#ffd676" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-[#80b8df42]">
        <CardContent className="space-y-4 p-0">
          {progressQuery.isLoading ? (
            <div className="px-4 py-4">
              <TableSkeleton rows={10} />
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="px-4 py-6">
              <EmptyState title="No activity found" description="Recent workout logs will appear here." />
            </div>
          ) : (
            <>
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-11 text-xs">Completed</TableHead>
                    <TableHead className="h-11 text-xs">User</TableHead>
                    <TableHead className="h-11 text-xs">Program</TableHead>
                    <TableHead className="h-11 text-xs">Day</TableHead>
                    <TableHead className="h-11 text-xs">Exercise</TableHead>
                    <TableHead className="h-11 text-xs">Volume</TableHead>
                    <TableHead className="h-11 text-xs">Duration</TableHead>
                    <TableHead className="h-11 text-xs">Calories</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogs.map((log) => (
                    <TableRow key={log.id} className="border-white/30 hover:bg-white/[0.03]">
                      <TableCell className="py-3 text-xs text-slate-200">{formatDate(log.completedAt)}</TableCell>
                      <TableCell className="py-3 text-xs text-slate-200">
                        {[log.user?.firstName, log.user?.lastName].filter(Boolean).join(" ") || log.user?.email || "-"}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-slate-200">{log.program?.programName || "-"}</TableCell>
                      <TableCell className="py-3 text-xs text-slate-200">
                        {log.dayIndex ? DAY_LABELS[log.dayIndex] || `Day ${log.dayIndex}` : "-"}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-slate-200">{log.exercise?.exerciseName || "-"}</TableCell>
                      <TableCell className="py-3 text-xs text-slate-200">{log.trainingVolume}</TableCell>
                      <TableCell className="py-3 text-xs text-slate-200">{log.durationMinutes}</TableCell>
                      <TableCell className="py-3 text-xs text-slate-200">{log.caloriesBurned}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="space-y-1 px-4 pb-4">
                <p className="text-xs text-slate-300/80">
                  Showing {recentLogs.length > 0 ? (page - 1) * LOGS_PAGE_SIZE + 1 : 0} to {(page - 1) * LOGS_PAGE_SIZE + recentLogs.length} of {progressQuery.data?.meta?.total || 0} results
                </p>
                <Pagination page={page} totalPages={progressQuery.data?.meta?.totalPages || 1} onPageChange={setPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
