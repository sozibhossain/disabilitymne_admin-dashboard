"use client";

import { MessageCircle, Send, Ticket } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
import {
  createOrGetChatThread,
  getChatMessages,
  getChatPremiumUsers,
  getChatThreads,
  getErrorMessage,
  getSupportTickets,
  markChatThreadRead,
  sendChatMessage,
  updateSupportTicket,
  type ChatThread,
  type SupportTicket,
} from "@/lib/api";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import { useChatSocket } from "@/hooks/use-chat-socket";

export default function SupportPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"tickets" | "chat">("tickets");

  const [ticketPage, setTicketPage] = useState(1);
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatus, setTicketStatus] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketUpdate, setTicketUpdate] = useState<{
    status: SupportTicket["status"];
    adminResponse: string;
  }>({ status: "open", adminResponse: "" });

  const [chatPage, setChatPage] = useState(1);
  const [chatSearch, setChatSearch] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [newThreadUserId, setNewThreadUserId] = useState("");

  const ticketsQuery = useQuery({
    queryKey: ["support-tickets", ticketPage, ticketSearch, ticketStatus],
    queryFn: () =>
      getSupportTickets({
        page: ticketPage,
        limit: 10,
        search: ticketSearch,
        status: ticketStatus || undefined,
      }),
  });

  const chatThreadsQuery = useQuery({
    queryKey: ["chat-threads", chatPage, chatSearch],
    queryFn: () => getChatThreads({ page: chatPage, limit: 20, search: chatSearch }),
    enabled: tab === "chat",
  });

  const premiumUsersQuery = useQuery({
    queryKey: ["chat-premium-users"],
    queryFn: () => getChatPremiumUsers(),
    enabled: tab === "chat",
  });

  const threads = useMemo(() => chatThreadsQuery.data?.data || [], [chatThreadsQuery.data?.data]);
  const effectiveActiveThreadId = activeThreadId || threads[0]?.id || null;

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", effectiveActiveThreadId],
    queryFn: () => getChatMessages(effectiveActiveThreadId as string, { page: 1, limit: 50 }),
    enabled: Boolean(effectiveActiveThreadId),
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({
      ticketId,
      payload,
    }: {
      ticketId: string;
      payload: { status: SupportTicket["status"]; adminResponse: string };
    }) =>
      updateSupportTicket(ticketId, payload),
    onSuccess: () => {
      toast.success("Support ticket updated.");
      setSelectedTicket(null);
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const createThreadMutation = useMutation({
    mutationFn: createOrGetChatThread,
    onSuccess: (thread) => {
      toast.success("Chat thread opened.");
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      setActiveThreadId(thread.id);
      setNewThreadUserId("");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ threadId, messageText }: { threadId: string; messageText: string }) =>
      sendChatMessage(threadId, { message: messageText }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", effectiveActiveThreadId] });
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  useEffect(() => {
    if (!effectiveActiveThreadId) return;
    markChatThreadRead(effectiveActiveThreadId).catch(() => undefined);
  }, [effectiveActiveThreadId]);

  const { events } = useChatSocket(effectiveActiveThreadId || undefined);

  useEffect(() => {
    if (!events.length) return;
    queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    if (effectiveActiveThreadId) {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", effectiveActiveThreadId] });
    }
  }, [effectiveActiveThreadId, events, queryClient]);

  const messages = useMemo(() => messagesQuery.data?.data || [], [messagesQuery.data?.data]);
  const activeThread: ChatThread | null = threads.find((thread) => thread.id === effectiveActiveThreadId) || null;

  return (
    <div
      className={cn(
        "space-y-5",
        tab === "chat" && "flex h-full min-h-0 flex-col overflow-hidden"
      )}
    >
      <PageTitle title={tab === "tickets" ? "Support Messages" : "Support Chat"} breadcrumb="Dashboard  >  Support" />

      <div className="flex gap-2">
        <Button variant={tab === "tickets" ? "default" : "outline"} onClick={() => setTab("tickets")}>
          <Ticket className="mr-2 size-4" />
          Tickets
        </Button>
        <Button variant={tab === "chat" ? "default" : "outline"} onClick={() => setTab("chat")}>
          <MessageCircle className="mr-2 size-4" />
          Chat
        </Button>
      </div>

      {tab === "tickets" ? (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                placeholder="Search tickets"
                value={ticketSearch}
                onChange={(event) => {
                  setTicketPage(1);
                  setTicketSearch(event.target.value);
                }}
              />
              <Select
                value={ticketStatus}
                className="md:w-56"
                onChange={(event) => {
                  setTicketPage(1);
                  setTicketStatus(event.target.value);
                }}
              >
                <option value="">All status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </Select>
            </div>

            {ticketsQuery.isLoading ? (
              <TableSkeleton rows={10} />
            ) : (ticketsQuery.data?.data?.length || 0) === 0 ? (
              <EmptyState title="No support tickets" description="Tickets from app users will appear here." />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(ticketsQuery.data?.data || []).map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>{[ticket.user?.firstName, ticket.user?.lastName].filter(Boolean).join(" ") || "-"}</TableCell>
                        <TableCell>{ticket.email}</TableCell>
                        <TableCell>{ticket.subject}</TableCell>
                        <TableCell>
                          <StatusChip value={ticket.status} />
                        </TableCell>
                        <TableCell>{formatRelativeTime(ticket.createdAt)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setTicketUpdate({
                                status: ticket.status,
                                adminResponse: ticket.adminResponse || "",
                              });
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Pagination page={ticketPage} totalPages={ticketsQuery.data?.meta?.totalPages || 1} onPageChange={setTicketPage} />
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="min-h-0 flex-1 overflow-hidden">
          <CardContent className="grid h-full min-h-0 grid-cols-1 gap-4 overflow-hidden p-4 xl:grid-cols-[340px_1fr]">
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <Input
                placeholder="Search thread"
                value={chatSearch}
                onChange={(event) => {
                  setChatPage(1);
                  setChatSearch(event.target.value);
                }}
              />

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Select value={newThreadUserId} onChange={(event) => setNewThreadUserId(event.target.value)}>
                  <option value="">Create thread with premium user</option>
                  {(premiumUsersQuery.data || []).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} ({user.email})
                    </option>
                  ))}
                </Select>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!newThreadUserId) {
                      toast.error("Select a premium user first.");
                      return;
                    }
                    createThreadMutation.mutate({ premiumUserId: newThreadUserId });
                  }}
                >
                  Start
                </Button>
              </div>

              <div className="space-y-2">
                {chatThreadsQuery.isLoading ? (
                  <TableSkeleton rows={6} />
                ) : threads.length === 0 ? (
                  <EmptyState title="No threads" description="Start a new chat with a premium user." />
                ) : (
                  threads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        effectiveActiveThreadId === thread.id
                          ? "border-[#8ccfff] bg-[#72B4E6]/20"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                      onClick={() => setActiveThreadId(thread.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-white">{thread.counterpart?.firstName || "Unknown"}</p>
                        <span className="text-xs text-slate-300">{formatRelativeTime(thread.lastMessageAt)}</span>
                      </div>
                      <p className="line-clamp-1 text-xs text-slate-300">{thread.lastMessagePreview || "No message"}</p>
                      {thread.unreadCount > 0 ? (
                        <span className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff1d58] px-1 text-[11px] font-semibold text-white">
                          {thread.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>

              <Pagination page={chatPage} totalPages={chatThreadsQuery.data?.meta?.totalPages || 1} onPageChange={setChatPage} />
            </div>

            <div className="flex h-[650px] flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5">
              {activeThread ? (
                <>
                  <div className="border-b border-white/10 px-4 py-3">
                    <h3 className="text-xl font-semibold text-white">{activeThread.counterpart?.firstName || "Chat"}</h3>
                    <p className="text-sm text-slate-300">{activeThread.counterpart?.email}</p>
                  </div>

                  <div className=" flex-1 space-y-3 overflow-y-auto p-4">
                    {messagesQuery.isLoading ? (
                      <TableSkeleton rows={6} />
                    ) : messages.length === 0 ? (
                      <EmptyState title="No messages yet" description="Send a message to start the conversation." />
                    ) : (
                      messages.map((item) => (
                        <div key={item.id} className={`flex ${item.isMine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                              item.isMine ? "bg-[#7ac6f4] text-[#10233f]" : "bg-white text-[#1d2e4f]"
                            }`}
                          >
                            <p>{item.message || "Attachment"}</p>
                            <p className="mt-1 text-xs opacity-70">{formatRelativeTime(item.createdAt)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form
                    className="grid grid-cols-[1fr_auto] gap-2 border-t border-white/10 p-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!effectiveActiveThreadId || !message.trim()) return;
                      sendMessageMutation.mutate({ threadId: effectiveActiveThreadId, messageText: message.trim() });
                    }}
                  >
                    <Input
                      placeholder="Type a message"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                    />
                    <Button type="submit" disabled={sendMessageMutation.isPending}>
                      <Send className="mr-2 size-4" />
                      Send
                    </Button>
                  </form>
                </>
              ) : (
                <EmptyState title="No thread selected" description="Select a thread from the left panel." />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Modal open={Boolean(selectedTicket)} onClose={() => setSelectedTicket(null)} title="Ticket Details" className="max-w-3xl">
        {selectedTicket ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              updateTicketMutation.mutate({
                ticketId: selectedTicket.id,
                payload: {
                  status: ticketUpdate.status,
                  adminResponse: ticketUpdate.adminResponse,
                },
              });
            }}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-blue-300/30 bg-white/5 p-3">
                <p className="text-xs text-slate-300">User</p>
                <p>{[selectedTicket.user?.firstName, selectedTicket.user?.lastName].filter(Boolean).join(" ") || "-"}</p>
              </div>
              <div className="rounded-lg border border-blue-300/30 bg-white/5 p-3">
                <p className="text-xs text-slate-300">Email</p>
                <p>{selectedTicket.email}</p>
              </div>
              <div className="rounded-lg border border-blue-300/30 bg-white/5 p-3 md:col-span-2">
                <p className="text-xs text-slate-300">Subject</p>
                <p>{selectedTicket.subject}</p>
              </div>
              <div className="rounded-lg border border-blue-300/30 bg-white/5 p-3 md:col-span-2">
                <p className="text-xs text-slate-300">Description</p>
                <p>{selectedTicket.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={ticketUpdate.status}
                  onChange={(event) =>
                    setTicketUpdate((prev) => ({
                      ...prev,
                      status: event.target.value as SupportTicket["status"],
                    }))
                  }
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Created At</Label>
                <Input value={formatDate(selectedTicket.createdAt)} readOnly />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Admin Response</Label>
                <Textarea
                  value={ticketUpdate.adminResponse}
                  onChange={(event) => setTicketUpdate((prev) => ({ ...prev, adminResponse: event.target.value }))}
                  placeholder="Write response"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => setSelectedTicket(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTicketMutation.isPending}>
                {updateTicketMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
