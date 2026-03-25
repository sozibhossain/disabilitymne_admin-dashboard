"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/constants";
import { getAdminSettingsProfile } from "@/lib/api";
import Image from "next/image";

interface AppSidebarProps {
  mobile?: boolean;
  open?: boolean;
  onClose?: () => void;
}

export function AppSidebar({
  mobile = false,
  open = true,
  onClose,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["admin-settings-profile"],
    queryFn: getAdminSettingsProfile,
  });

  const profileImage = String(profileQuery.data?.profileImage || "");
  const userName = useMemo(() => {
    const firstName = String(profileQuery.data?.firstName || "").trim();
    const lastName = String(profileQuery.data?.lastName || "").trim();
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || session?.user?.name || "Admin User";
  }, [profileQuery.data?.firstName, profileQuery.data?.lastName, session?.user?.name]);
  const userEmail = String(profileQuery.data?.email || session?.user?.email || "admin@example.com");
  const shouldShowImage = Boolean(profileImage) && failedImageSrc !== profileImage;

  const avatarFallback = userName.trim().charAt(0).toUpperCase() || "A";

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#010408] px-4 py-5 text-slate-100">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Image
            src="/logo.png"
            alt="Logo"
            width={500}
            height={500}
            className="w-[294px] h-[71px]"
          />
        </div>
        {mobile ? (
          <button
            type="button"
            className="rounded-md p-1 text-slate-200 transition-colors hover:bg-white/10"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-200 transition-all hover:bg-[#72B4E6]/25",
                active && "bg-[rgba(75,127,168,1)] text-white",
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/10">
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
          <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-white/20">
            {shouldShowImage ? (
              <img
                src={profileImage}
                alt={`${userName}'s avatar`}
                className="size-full object-cover"
                onError={() => setFailedImageSrc(profileImage)}
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-white/10 text-sm font-semibold text-white">
                {avatarFallback}
              </div>
            )}
          </div>
          <div className="min-w-0 overflow-hidden">
            <p className="truncate text-sm font-semibold text-white">
              {userName}
            </p>
            <p className="truncate text-xs text-slate-400">
              {userEmail}
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => setLogoutOpen(true)}
        >
          <LogOut className="mr-2 size-4" />
          Log out
        </Button>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => {
          signOut({ callbackUrl: "/login" });
        }}
        title="Are you sure?"
        description="You are about to log out from this dashboard."
        confirmText="Log out"
      />
    </div>
  );

  if (!mobile) {
    return (
      <aside className="hidden h-screen w-[280px] shrink-0 border-r border-white/5 xl:block">
        {sidebarContent}
      </aside>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/70 transition-opacity xl:hidden",
        open
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
      )}
      onClick={onClose}
    >
      <aside
        className={cn(
          "h-full w-[280px] max-w-[84vw] transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {sidebarContent}
      </aside>
    </div>
  );
}
