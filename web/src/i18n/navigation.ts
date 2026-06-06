import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation primitives.
 *
 * Use these in place of `next/link`, `next/navigation` Router/Pathname helpers
 * whenever you want a path that automatically prepends the active locale.
 *
 * Example:
 *   import { Link, useRouter, usePathname } from "@/i18n/navigation";
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
