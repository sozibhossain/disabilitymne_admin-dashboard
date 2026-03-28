"use client";

import { Ban, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminUsers, getErrorMessage, updateAdminUserStatus, type AdminUser } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

const toLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getSubscriptionMeta = (value: string) => {
  const normalized = String(value || "").toLowerCase();

  if (normalized.includes("premium")) {
    return {
      label: "Premium user",
      className: "bg-[#37d66f] text-white",
    };
  }

  if (normalized.includes("annual")) {
    return {
      label: "Annual user",
      className: "bg-[#0d97ff] text-white",
    };
  }

  if (normalized.includes("quarterly")) {
    return {
      label: "Quarterly user",
      className: "bg-[#8f7dff] text-white",
    };
  }

  if (normalized.includes("monthly")) {
    return {
      label: "Monthly user",
      className: "bg-[#ff9f31] text-white",
    };
  }

  if (normalized.includes("active")) {
    return {
      label: "active",
      className: "border border-[#31c56f] bg-[#0f4f36]/85 text-[#39dd78]",
    };
  }

  return {
    label: value ? toLabel(value) : "N/A",
    className: "bg-[#2d4f78] text-white",
  };
};

const getStatusMeta = (value: string) => {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "active") {
    return {
      label: "active",
      className: "border-[#31c56f]/85 bg-[#0d4d34]/85 text-[#38d978]",
    };
  }

  if (normalized === "deactivated") {
    return {
      label: "Deactivated",
      className: "border-[#ff9f31]/85 bg-[#5f3b15]/70 text-[#ff9f31]",
    };
  }

  if (normalized === "suspended") {
    return {
      label: "Suspended",
      className: "border-[#ff2f5f]/85 bg-[#5b1730]/70 text-[#ff4672]",
    };
  }

  return {
    label: value ? toLabel(value) : "Unknown",
    className: "border-white/30 bg-white/10 text-slate-100",
  };
};

export default function UserManagementPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusUser, setStatusUser] = useState<AdminUser | null>(null);

  const query = useQuery({
    queryKey: ["admin-users", page, status],
    queryFn: () => getAdminUsers({ page, limit: 10, status: status || undefined }),
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ userId, accountStatus }: { userId: string; accountStatus: "active" | "deactivated" | "suspended" }) =>
      updateAdminUserStatus(userId, accountStatus),
    onSuccess: () => {
      toast.success("User status updated.");
      setStatusOpen(false);
      setStatusUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const users = useMemo(() => query.data?.data || [], [query.data?.data]);

  const totalPages = query.data?.meta?.totalPages || 1;
  const visiblePages = useMemo(() => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const start = Math.max(1, Math.min(page - 1, totalPages - 2));
    return [start, start + 1, start + 2];
  }, [page, totalPages]);

  const nextStatus = statusUser?.status === "active" ? "suspended" : "active";
  const statusActionText = nextStatus === "suspended" ? "Block" : "Activate";
  const statusDescription =
    nextStatus === "suspended"
      ? "You want to block this user from the platform."
      : "You want to activate this user again.";

  return (
    <div className="space-y-5">
      <PageTitle title="User Management" breadcrumb="Dashboard  >  User Management" />

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
                <option value="active">Active</option>
                <option value="deactivated">Deactivated</option>
                <option value="suspended">Suspended</option>
              </Select>
            </div>
          </div>

          {query.isLoading ? (
            <div className="px-4 pb-4">
              <TableSkeleton rows={8} />
            </div>
          ) : users.length === 0 ? (
            <div className="px-4 pb-6">
              <EmptyState title="No users found" description="Try a different status filter." />
            </div>
          ) : (
            <>
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-11 text-xs">User Name</TableHead>
                    <TableHead className="h-11 text-xs">Email</TableHead>
                    <TableHead className="h-11 text-xs">Phone</TableHead>
                    <TableHead className="h-11 text-xs">Date</TableHead>
                    <TableHead className="h-11 text-xs">Subscription</TableHead>
                    <TableHead className="h-11 text-xs">Mobility</TableHead>
                    <TableHead className="h-11 text-xs text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const subscriptionMeta = getSubscriptionMeta(user.subscription || "");
                    const statusMeta = getStatusMeta(user.status || "");

                    return (
                      <TableRow key={user.id} className="border-white/30 hover:bg-white/[0.03]">
                        <TableCell className="py-3 text-sm">{user.name}</TableCell>
                        <TableCell className="py-3 text-sm">{user.email}</TableCell>
                        <TableCell className="py-3 text-sm text-slate-200">{user.phone || "-"}</TableCell>
                        <TableCell className="py-3 text-sm text-slate-200">{formatDate(user.createdAt)}</TableCell>
                        <TableCell className="py-3">
                          <span
                            className={cn(
                              "inline-flex min-w-28 items-center justify-center rounded-full px-3 py-[3px] text-[11px] font-semibold",
                              subscriptionMeta.className
                            )}
                          >
                            {subscriptionMeta.label}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-slate-200">{user.mobilityType || "-"}</TableCell>
                        <TableCell className="py-3 flex items-center justify-center space-x-2">
                          <span
                            className={cn(
                              "inline-flex min-w-[90px] items-center justify-center rounded-full border px-3 py-[3px] text-[11px] font-semibold",
                              statusMeta.className
                            )}
                          >
                            {statusMeta.label}
                          </span>
                          <button
                            type="button"
                            className="inline-flex size-8 items-center justify-center rounded-full bg-[#ff3d6f]/30 text-[#ff2f5f] transition-colors hover:bg-[#ff2f5f]/15"
                            onClick={() => {
                              setStatusUser(user);
                              setStatusOpen(true);
                            }}
                            aria-label="Block user"
                          >
                            <Ban className="size-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="space-y-1 px-4 pb-4">
                <p className="text-xs text-slate-300/80">
                  Showing {users.length > 0 ? (page - 1) * 10 + 1 : 0} to {(page - 1) * 10 + users.length} of {query.data?.meta?.total || 0} results
                </p>

                {totalPages > 1 ? (
                  <div className="mt-2 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#8ec5eb5e] bg-[#0e2444]/75 text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page <= 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="size-4" />
                    </button>

                    {visiblePages.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={cn(
                          "inline-flex h-8 min-w-8 items-center justify-center rounded border px-2 text-xs font-semibold",
                          item === page
                            ? "border-white bg-white text-[#0e2444]"
                            : "border-[#8ec5eb5e] bg-[#0e2444]/75 text-slate-100 hover:bg-[#16345c]"
                        )}
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </button>
                    ))}

                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#8ec5eb5e] bg-[#5d97c4] text-white disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
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

      <ConfirmDialog
        open={statusOpen}
        onClose={() => {
          setStatusOpen(false);
          setStatusUser(null);
        }}
        onConfirm={() => {
          if (statusUser) {
            changeStatusMutation.mutate({
              userId: statusUser.id,
              accountStatus: nextStatus,
            });
          }
        }}
        title="Are you sure?"
        description={statusDescription}
        confirmText={statusActionText}
        loading={statusOpen && changeStatusMutation.isPending}
      />
    </div>
  );
}
