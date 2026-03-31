"use client";

import { MessageCircleMore } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Pagination } from "@/components/shared/pagination";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import {
  createOrGetChatThread,
  getChatPremiumUsers,
  getErrorMessage,
  type ChatUser,
} from "@/lib/api";

const PAGE_SIZE = 10;

export default function SupportPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [openingChatForUserId, setOpeningChatForUserId] = useState<string | null>(null);

  const premiumUsersQuery = useQuery({
    queryKey: ["chat-premium-users", "support-page"],
    queryFn: () => getChatPremiumUsers(),
  });

  const openChatMutation = useMutation({
    mutationFn: async (premiumUser: ChatUser) => {
      const thread = await createOrGetChatThread({ premiumUserId: premiumUser.id });
      return { thread, premiumUser };
    },
    onSuccess: ({ thread, premiumUser }) => {
      const name = premiumUser.firstName || thread.counterpart?.firstName || "";
      const email = premiumUser.email || thread.counterpart?.email || "";
      const query = new URLSearchParams();
      if (name) {
        query.set("name", name);
      }
      if (email) {
        query.set("email", email);
      }
      router.push(`/support/chat/${thread.id}${query.size > 0 ? `?${query.toString()}` : ""}`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => setOpeningChatForUserId(null),
  });

  const premiumUsers = useMemo(() => premiumUsersQuery.data || [], [premiumUsersQuery.data]);
  const totalCount = premiumUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return premiumUsers.slice(start, start + PAGE_SIZE);
  }, [currentPage, premiumUsers]);

  return (
    <div className="space-y-5">
      <PageTitle title="Support Messages" breadcrumb="Dashboard  >  Support" />

      {premiumUsersQuery.isLoading ? (
        <TableSkeleton rows={10} />
      ) : premiumUsersQuery.isError ? (
        <EmptyState title="Failed to load premium users" description={getErrorMessage(premiumUsersQuery.error)} />
      ) : premiumUsers.length === 0 ? (
        <EmptyState title="No premium users" description="Premium users will appear here." />
      ) : (
        <div className="space-y-1 rounded-xl border border-[#7cb6df33] bg-[linear-gradient(120deg,rgba(18,40,72,.72)_0%,rgba(29,56,96,.56)_55%,rgba(24,46,79,.68)_100%)] p-2">
          {visibleUsers.map((user) => {
            const userName = user.firstName || "Premium User";
            const initials = userName
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part.charAt(0).toUpperCase())
              .join("");

            return (
              <div
                key={user.id}
                className="flex w-full items-start justify-between gap-4 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-xs font-semibold text-white">
                    {initials || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-white">{userName}</p>
                    <p className="max-w-[620px] truncate text-sm text-slate-200">{user.email || "Premium member"}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-xs text-slate-300">Premium user</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex size-6 items-center justify-center rounded-full bg-[#ff1d58] text-white transition-colors hover:bg-[#ff3f73] disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        setOpeningChatForUserId(user.id);
                        openChatMutation.mutate(user);
                      }}
                      disabled={openChatMutation.isPending && openingChatForUserId === user.id}
                      aria-label="Open chat page"
                    >
                      <MessageCircleMore className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex flex-col gap-2 border-t border-white/25 px-2 pb-1 pt-2 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-slate-300/80">
              Showing {visibleUsers.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0} to {(currentPage - 1) * PAGE_SIZE + visibleUsers.length} of {totalCount}
              results
            </p>
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
