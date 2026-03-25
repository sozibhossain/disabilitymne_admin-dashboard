"use client";

import { ArrowLeft, Paperclip, SendHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { getChatMessages, getChatThreads, getErrorMessage, markChatThreadRead, sendChatMessage } from "@/lib/api";
import { cn, formatRelativeTime } from "@/lib/utils";

const toShortTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function SupportChatPage() {
  const router = useRouter();
  const params = useParams<{ threadId: string }>();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [draftMessage, setDraftMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const threadId = useMemo(() => {
    const raw = params?.threadId;
    if (Array.isArray(raw)) return raw[0] || "";
    return raw || "";
  }, [params]);

  const fallbackName = searchParams.get("name") || "Support User";
  const fallbackEmail = searchParams.get("email") || "";

  const threadsQuery = useQuery({
    queryKey: ["chat-threads", "support-page", threadId],
    queryFn: () => getChatThreads({ page: 1, limit: 100 }),
    enabled: Boolean(threadId),
  });

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", threadId],
    queryFn: () => getChatMessages(threadId, { page: 1, limit: 200 }),
    enabled: Boolean(threadId),
  });

  const activeThread = useMemo(
    () => threadsQuery.data?.data?.find((thread) => thread.id === threadId) || null,
    [threadId, threadsQuery.data?.data]
  );
  const messages = useMemo(() => messagesQuery.data?.data || [], [messagesQuery.data?.data]);

  const markReadMutation = useMutation({
    mutationFn: (nextThreadId: string) => markChatThreadRead(nextThreadId),
  });

  const sendMessageMutation = useMutation({
    mutationFn: (payload: { threadId: string; message: string }) =>
      sendChatMessage(payload.threadId, { message: payload.message }),
    onSuccess: () => {
      setDraftMessage("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", threadId] });
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  useEffect(() => {
    if (!threadId || !messagesQuery.data) return;
    markReadMutation.mutate(threadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, messagesQuery.data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const onSendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draftMessage.trim();
    if (!message || !threadId) return;
    sendMessageMutation.mutate({ threadId, message });
  };

  return (
    <div className="rounded-xl border border-[#7cb6df33] bg-[linear-gradient(120deg,rgba(18,40,72,.72)_0%,rgba(29,56,96,.56)_55%,rgba(24,46,79,.68)_100%)] p-2">
      <div className="flex h-[calc(100vh-12rem)] flex-col">
        <div className="flex items-start gap-3 border-b border-white/15 px-2 py-2">
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-full text-slate-100 transition-colors hover:bg-white/10"
            onClick={() => router.push("/support")}
            aria-label="Back to support"
          >
            <ArrowLeft className="size-4" />
          </button>

          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white">
              {activeThread?.counterpart?.firstName || fallbackName}
            </p>
            <p className="truncate text-xs text-slate-300">
              {activeThread?.counterpart?.email || fallbackEmail || "Premium user"}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          {!threadId ? (
            <EmptyState title="Invalid chat thread" description="Thread id is missing." />
          ) : messagesQuery.isLoading ? (
            <div className="space-y-3">
              <div className="h-14 w-2/3 animate-pulse rounded-lg bg-white/20" />
              <div className="ml-auto h-14 w-2/3 animate-pulse rounded-lg bg-white/20" />
              <div className="h-14 w-2/3 animate-pulse rounded-lg bg-white/20" />
            </div>
          ) : messagesQuery.isError ? (
            <EmptyState title="Failed to load chat" description={getErrorMessage(messagesQuery.error)} />
          ) : messages.length === 0 ? (
            <EmptyState title="No messages yet" description="Start the conversation." />
          ) : (
            <div className="space-y-5">
              {messages.map((message) => (
                <div key={message.id} className={cn("flex", message.isMine ? "justify-end" : "justify-start")}>
                  <div className="max-w-[86%] rounded-lg bg-[#f2f4f7] px-3 py-2 text-[#1f2937] shadow-sm sm:max-w-[74%]">
                    <div className="mb-1 flex items-start gap-2">
                      <div className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[#d4d7dd] text-[10px] font-semibold text-[#3d4652]">
                        {(message.sender?.firstName || "U").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        {message.message ? (
                          <p className="break-words text-[12px] leading-5 text-[#1f2937]">{message.message}</p>
                        ) : null}
                        {message.attachments?.length ? (
                          <div className="space-y-1">
                            {message.attachments.map((attachment, index) => (
                              <a
                                key={`${attachment.url}-${index}`}
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block break-all text-[11px] text-[#2269a8] underline"
                              >
                                Attachment {index + 1}
                              </a>
                            ))}
                          </div>
                        ) : null}
                        <p className="text-[10px] text-[#5f6571]">{toShortTime(message.createdAt) || formatRelativeTime(message.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form className="border-t border-white/15 px-2 py-2" onSubmit={onSendMessage}>
          <div className="flex items-center gap-2 rounded-md border border-[#cad7e566] bg-[#dfe3e8] px-2 py-1.5">
            <button
              type="button"
              className="inline-flex size-7 items-center justify-center rounded-full bg-[#55657a] text-white"
              disabled
              aria-label="Attachment"
            >
              <Paperclip className="size-4" />
            </button>

            <input
              className="h-8 w-full border-none bg-transparent text-sm text-[#1f2937] outline-none placeholder:text-[#7b8796]"
              placeholder="Type a messages"
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
            />

            <button
              type="submit"
              className="inline-flex size-7 items-center justify-center rounded-full bg-[#72B4E6] text-white transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={sendMessageMutation.isPending || !draftMessage.trim()}
              aria-label="Send message"
            >
              <SendHorizontal className="size-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
