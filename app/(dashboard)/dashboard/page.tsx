"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  UserPlus,
  Star,
  DollarSign,
  Ban,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDate, cn } from "@/lib/utils";
import {
  getDashboardOverview,
  getErrorMessage,
  updateAdminUserStatus,
  type AdminUser,
} from "@/lib/api";

const cardConfigs = [
  {
    label: "Total User",
    key: "totalUsers",
    color: "from-[#4a1231] to-[#1e1122]",
    icon: Users,
    iconColor: "bg-[#ff1d58]",
  },
  {
    label: "Total Monthly User",
    key: "totalMonthlyUsers",
    color: "from-[#0d335d] to-[#111c31]",
    icon: UserCheck,
    iconColor: "bg-[#1890ff]",
  },
  {
    label: "Total Quarterly User",
    key: "totalQuarterlyUsers",
    color: "from-[#4c481a] to-[#111c31]",
    icon: UserPlus,
    iconColor: "bg-[#ff9f31]",
  },
  {
    label: "Total Annual user",
    key: "totalAnnualUsers",
    color: "from-[#2d2158] to-[#111c31]",
    icon: UserPlus,
    iconColor: "bg-[#8f7dff]",
  },
  {
    label: "Total Premium user",
    key: "totalPremiumUsers",
    color: "from-[#124231] to-[#111c31]",
    icon: Star,
    iconColor: "bg-[#3dcc5f]",
  },
  {
    label: "Total Revenue",
    key: "totalRevenueDisplay",
    color: "from-[#4a3412] to-[#111c31]",
    icon: DollarSign,
    iconColor: "bg-[#ff9f31]",
    isRevenue: true,
  },
];

const subscriptionColorMap: Record<string, string> = {
  monthly: "#ff9f31",
  quarterly: "#ff1d58",
  annual: "#1890ff",
  premium: "#3dcc5f",
};

const RECENT_USERS_PAGE_SIZE = 5;

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [statusUser, setStatusUser] = useState<AdminUser | null>(null);
  const [recentUsersPage, setRecentUsersPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: getDashboardOverview,
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({
      userId,
      accountStatus,
    }: {
      userId: string;
      accountStatus: "active" | "deactivated" | "suspended";
    }) => updateAdminUserStatus(userId, accountStatus),
    onSuccess: () => {
      toast.success("User status updated.");
      setStatusUser(null);
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  useEffect(() => {
    if (error) toast.error(getErrorMessage(error));
  }, [error]);

  if (isLoading)
    return (
      <div className="space-y-6 p-6 bg-[#0f172a] min-h-screen">
        <TableSkeleton rows={8} />
      </div>
    );

  if (!data)
    return <EmptyState title="No data" description="Analytics unavailable." />;

  const recentUsers = data.recentUsers ?? [];
  const totalRecentUsers = recentUsers.length;
  const totalRecentUserPages = Math.max(
    1,
    Math.ceil(totalRecentUsers / RECENT_USERS_PAGE_SIZE),
  );
  const activeRecentUsersPage = Math.min(recentUsersPage, totalRecentUserPages);
  const recentUsersStartIndex =
    (activeRecentUsersPage - 1) * RECENT_USERS_PAGE_SIZE;
  const visibleRecentUsers = recentUsers.slice(
    recentUsersStartIndex,
    recentUsersStartIndex + RECENT_USERS_PAGE_SIZE,
  );

  const showingFrom = totalRecentUsers > 0 ? recentUsersStartIndex + 1 : 0;
  const showingTo = recentUsersStartIndex + visibleRecentUsers.length;
  const visiblePageNumbers =
    totalRecentUserPages <= 3
      ? Array.from({ length: totalRecentUserPages }, (_, index) => index + 1)
      : (() => {
          const start = Math.max(
            1,
            Math.min(activeRecentUsersPage - 1, totalRecentUserPages - 2),
          );

          return [start, start + 1, start + 2];
        })();

  const subscriptionPieData = data.subscriptionSurvey.map((item) => ({
    name: item.label.replace(/\s*user$/i, ""),
    value: item.percentage ?? 0,
    color: subscriptionColorMap[item.key] ?? "#94a3b8",
  }));

  const nextStatus =
    statusUser?.status === "suspended" ? "active" : "suspended";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400">
          Welcome back to your admin panel
        </p>
      </div>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {cardConfigs.map((config) => (
          <div
            key={config.label}
            className={cn(
              "relative overflow-hidden rounded-xl bg-gradient-to-b p-5 border border-white/5 shadow-2xl",
              config.color,
            )}
          >
            <div className="relative z-10">
              <p className="text-2xl font-bold text-white">
                {config.isRevenue
                  ? `$${data.totals.totalRevenueDisplay ?? "0.00"}`
                  : (data.totals[config.key as keyof typeof data.totals] ?? 0)}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-300">
                {config.label}
              </p>
            </div>
            <div
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 shadow-inner",
                config.iconColor,
              )}
            >
              <config.icon className="size-4 text-white" />
            </div>
          </div>
        ))}
      </section>

      {/* Charts Section */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Earnings Area Chart */}
        <Card className="border-white/10 bg-[#111c44] xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-white text-lg">
                Earnings Overview
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Track total revenue, platform commission, and payouts over time.
              </CardDescription>
            </div>
            <select className="bg-[#1e293b] border border-white/10 text-[10px] text-white rounded px-2 py-1">
              <option>Monthly</option>
            </select>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.earningsSeries}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#ffffff05"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{
                    stroke: "#1890ff",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-2 rounded shadow-lg text-center">
                          <p className="text-[10px] text-slate-500">
                            {payload[0].payload.label}
                          </p>
                          <p className="text-xs font-bold text-[#1890ff]">
                            ${payload[0].value?.toLocaleString()}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#fff"
                  strokeWidth={3}
                  fill="url(#areaGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subscription Pie Chart */}
        <Card className="border-white/10 bg-[#111c44]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-white text-lg">
              Survey for Subscription
            </CardTitle>
            <select className="bg-[#1e293b] border border-white/10 text-[10px] text-white rounded px-2 py-1">
              <option>Monthly</option>
            </select>
          </CardHeader>
          <CardContent className="h-[350px] relative flex flex-col justify-between">
            <div className="flex-1 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subscriptionPieData}
                    dataKey="value"
                    innerRadius={65}
                    outerRadius={90}
                    startAngle={90}
                    endAngle={450}
                    stroke="none"
                  >
                    {subscriptionPieData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 gap-y-2 pb-2">
              {subscriptionPieData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-300 text-xs">
                    {item.name} {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Recent User Table */}
      <Card className="border-white/10 bg-[#111c44]">
        <CardHeader>
          <CardTitle className="text-white text-lg">Recent User</CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            See your Recent users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-white/5">
            <Table>
              <TableHeader className="">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-[#111c44] text-xs">
                    User Name
                  </TableHead>
                  <TableHead className="text-[#111c44] text-xs">
                    Phone
                  </TableHead>
                  <TableHead className="text-[#111c44] text-xs">
                    Email
                  </TableHead>
                  <TableHead className="text-[#111c44] text-xs">Date</TableHead>
                  <TableHead className="text-[#111c44] text-xs">
                    Subscription
                  </TableHead>
                  <TableHead className="text-[#111c44] text-xs">
                    mobility
                  </TableHead>
                  <TableHead className="text-[#111c44] text-xs text-center">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRecentUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <TableCell className="text-xs font-medium text-slate-200">
                      {user.name}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {user.phone || "(209) 555-0104"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {user.email}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "rounded-full px-6 py-1 font-normal text-[10px] border-none min-w-[100px] justify-center",
                          user.subscription?.includes("Premium")
                            ? "bg-[#3dcc5f] text-white"
                            : user.subscription?.includes("Annual")
                              ? "bg-[#1890ff] text-white"
                              : user.subscription?.includes("Quarterly")
                                ? "bg-[#8f7dff] text-white"
                              : "bg-[#ff9f31] text-white",
                        )}
                      >
                        {user.subscription || "Monthly user"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 capitalize">
                      {user.mobilityType || "Plumber"}
                    </TableCell>
                    <TableCell className="space-x-2 flex items-center justify-center">
                      <div
                        className={cn(
                          "inline-flex items-center justify-center rounded-full border px-4 py-1 text-[10px] w-24 sp",
                          user.status === "active"
                            ? "border-green-500/50 text-green-400 bg-green-500/5"
                            : user.status === "suspended"
                              ? "border-red-500/50 text-red-400 bg-red-500/5"
                              : "border-orange-500/50 text-orange-400 bg-orange-500/5",
                        )}
                      >
                        {user.status}
                      </div>
                      <button
                        onClick={() => setStatusUser(user)}
                        className="inline-flex size-8 items-center justify-center rounded-full bg-[#ff3d6f]/30 text-[#ff2f5f] transition-colors hover:bg-[#ff2f5f]/15"
                      >
                        <Ban className="size-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500">
            <span>
              Showing {showingFrom} to {showingTo} of {totalRecentUsers} results
            </span>
            {totalRecentUserPages > 1 ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={activeRecentUsersPage <= 1}
                  onClick={() =>
                    setRecentUsersPage(Math.max(1, activeRecentUsersPage - 1))
                  }
                  className="size-7 bg-transparent border-white/10 text-white hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                {visiblePageNumbers.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setRecentUsersPage(pageNumber)}
                    className={cn(
                      "size-7 border-white/10",
                      pageNumber === activeRecentUsersPage
                        ? "bg-white text-black font-bold border-none hover:bg-white/90"
                        : "bg-transparent text-white hover:bg-white/5",
                    )}
                    aria-label={`Go to page ${pageNumber}`}
                  >
                    {pageNumber}
                  </Button>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={activeRecentUsersPage >= totalRecentUserPages}
                  onClick={() =>
                    setRecentUsersPage(
                      Math.min(totalRecentUserPages, activeRecentUsersPage + 1),
                    )
                  }
                  className="size-7 bg-[#1890ff] border-none text-white hover:bg-[#1890ff]/80 disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(statusUser)}
        onClose={() => setStatusUser(null)}
        onConfirm={() =>
          statusUser &&
          changeStatusMutation.mutate({
            userId: statusUser.id,
            accountStatus: nextStatus,
          })
        }
        title="Are you sure?"
        description={
          nextStatus === "suspended"
            ? "Block this user?"
            : "Activate this user?"
        }
        confirmText={nextStatus === "suspended" ? "Block" : "Activate"}
        loading={changeStatusMutation.isPending}
      />
    </div>
  );
}
