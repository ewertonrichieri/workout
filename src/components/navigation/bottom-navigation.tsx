"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { translate, type TranslationKey } from "@/lib/i18n/translate";
import { APP_ROUTES } from "@/lib/constants/routes";
import {
  CalendarIcon,
  DumbbellIcon,
  HomeIcon,
  UserIcon,
} from "@/components/navigation/navigation-icons";

interface NavigationItem {
  href: string;
  labelKey: TranslationKey;
  icon: ReactNode;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { href: APP_ROUTES.home, labelKey: "navigation.home", icon: <HomeIcon /> },
  { href: APP_ROUTES.workout, labelKey: "navigation.workout", icon: <DumbbellIcon /> },
  { href: APP_ROUTES.schedule, labelKey: "navigation.schedule", icon: <CalendarIcon /> },
  { href: APP_ROUTES.profile, labelKey: "navigation.profile", icon: <UserIcon /> },
];

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === APP_ROUTES.home) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label={translate("navigation.label")}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {NAVIGATION_ITEMS.map((item) => {
          const isActive = isActiveRoute(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-strong ${
                  isActive ? "font-semibold text-accent-strong" : "text-muted"
                }`}
              >
                {item.icon}
                <span>{translate(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
