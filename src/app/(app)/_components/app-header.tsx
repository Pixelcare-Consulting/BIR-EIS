"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  FileWarning,
  Loader2,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { useAppSearch } from "@/app/(app)/_components/app-search-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { WhatsNewDialog } from "@/components/whats-new-dialog";
import { appNavigation } from "@/config/app-navigation";
import { authClient } from "@/lib/auth/client";
import {
  formatVersionLabel,
  getCurrentRelease,
  getCurrentReleaseDateLabel,
  getVersionWithDateLabel,
} from "@/lib/shared/version";

function resolvePageContextLabel(pathname: string): string {
  const navMatch = appNavigation.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  if (navMatch) return navMatch.label;
  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return "Settings";
  }
  if (pathname === "/users" || pathname.startsWith("/users/")) {
    return "Users";
  }
  if (pathname === "/audit-log" || pathname.startsWith("/audit-log/")) {
    return "Audit Logs";
  }
  return "Workspace";
}

const SAMPLE_NOTIFICATIONS = [
  {
    id: "n1",
    title: "Sample: invoice ready to review",
    body: "Outbound draft INV-1001 is waiting for a quick look.",
    icon: FileWarning,
  },
  {
    id: "n2",
    title: "Sample: submission accepted",
    body: "A demo acknowledgment came back from the EIS sandbox.",
    icon: ShieldCheck,
  },
  {
    id: "n3",
    title: "Sample: reminder",
    body: "Three demo invoices are due this week.",
    icon: Bell,
  },
] as const;

interface AppHeaderProps {
  userName: string;
  userEmail: string;
  userImage?: string | null;
  isPlatformOperator?: boolean;
}

function getInitials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  if (parts[0] && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email.slice(0, 2) || "U").toUpperCase();
}

export function AppHeader({
  userName,
  userEmail,
  userImage,
  isPlatformOperator = false,
}: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { query, setQuery } = useAppSearch();
  const [isBusy, setIsBusy] = useState(false);
  const initials = getInitials(userName, userEmail);
  const notificationCount = SAMPLE_NOTIFICATIONS.length;
  const pageContextLabel = resolvePageContextLabel(pathname);
  const versionLabel = formatVersionLabel();
  const releaseDateLabel = getCurrentReleaseDateLabel();
  const currentRelease = getCurrentRelease();

  async function handleSignOut() {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setIsBusy(false);
    }
  }

  return (
    <header className="flex shrink-0 items-center gap-4 py-5 pr-4 pl-2 sm:pr-6 sm:pl-3 lg:pr-8 lg:pl-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
        <SidebarTrigger className="-ml-0.5 size-8 shrink-0 text-muted-foreground hover:text-foreground" />
        <span className="truncate text-sm font-medium text-muted-foreground">
          {pageContextLabel}
        </span>
        <span
          className="hidden h-4 w-px shrink-0 bg-border/80 sm:block"
          aria-hidden
        />
        <WhatsNewDialog
          triggerClassName="inline-flex items-center gap-2 p-0 hover:bg-transparent"
          triggerAriaLabel={`What's new — ${versionLabel}${releaseDateLabel ? ` · ${releaseDateLabel}` : ""}`}
        >
          <span className="rounded-full border border-border/60 bg-white/70 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
            {versionLabel}
          </span>
          {releaseDateLabel ? (
            <time
              dateTime={currentRelease?.releasedAt ?? currentRelease?.date}
              className="text-xs font-normal text-muted-foreground"
            >
              {releaseDateLabel}
            </time>
          ) : null}
        </WhatsNewDialog>
      </div>

      <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
        <label className="relative hidden h-11 w-56 items-center md:flex lg:w-72">
          <span className="sr-only">Search invoices</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground opacity-60"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            autoComplete="off"
            className="h-11 w-full rounded-full border border-transparent bg-white py-2 pr-4 pl-10 text-sm text-foreground shadow-[0_2px_10px_rgba(15,23,42,0.05)] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white hover:text-foreground hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Notifications, ${notificationCount} unread`}
            >
              <Bell className="size-5" />
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white">
                {notificationCount}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-80 rounded-xl p-0"
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold">
              Notifications
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {notificationCount} new
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="m-0" />
            <DropdownMenuGroup>
              {SAMPLE_NOTIFICATIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.id}
                    className="cursor-default items-start gap-3 rounded-none px-3 py-3 focus:bg-accent/60"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 space-y-0.5">
                      <span className="block text-sm font-medium text-foreground">
                        {item.title}
                      </span>
                      <span className="block text-xs leading-relaxed text-muted-foreground">
                        {item.body}
                      </span>
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="m-0" />
            <div className="px-3 py-2 text-center text-[11px] text-muted-foreground">
              Sample previews — live alerts come in a later release
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full py-1 pr-1 pl-1 transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Account menu"
            >
              <Avatar size="default" className="size-9 ring-2 ring-white">
                {userImage ? (
                  <AvatarImage src={userImage} alt={userName} />
                ) : null}
                <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-xl"
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8">
                  {userImage ? (
                    <AvatarImage src={userImage} alt={userName} />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{userName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {userEmail}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {isPlatformOperator ? (
                <DropdownMenuItem asChild disabled={isBusy}>
                  <Link href="/provider">
                    <Building2 />
                    Provider console
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild disabled={isBusy}>
                <Link href="/settings/profile">
                  <Settings />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild disabled={isBusy}>
                <Link href="/#help">
                  <CircleHelp />
                  Help & Support
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild disabled={isBusy}>
                <Link href="/#requirements">
                  <ClipboardList />
                  Requirements
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isBusy}
              onClick={() => void handleSignOut()}
            >
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <LogOut />
              )}
              {isBusy ? "Signing out…" : "Log out"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {getVersionWithDateLabel()}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
