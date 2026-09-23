"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  ChevronsUpDown,
  CircleHelp,
  ClipboardList,
  Loader2,
  LogOut,
  Settings,
} from "lucide-react";

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
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth/client";
import { getVersionWithDateLabel } from "@/lib/shared/version";

interface NavUserProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
    isPlatformOperator?: boolean;
  };
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

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const initials = getInitials(user.name, user.email);

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
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {user.image ? (
                  <AvatarImage src={user.image} alt={user.name} />
                ) : null}
                <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-sidebar-foreground">
                  {user.name}
                </span>
                <span className="truncate text-xs text-sidebar-muted">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-sidebar-muted" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {user.image ? (
                    <AvatarImage src={user.image} alt={user.name} />
                  ) : null}
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {user.isPlatformOperator ? (
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
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
