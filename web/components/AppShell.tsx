"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const THEME_KEY = "gre-study-theme-v1";

const NAV_ITEMS = [
  { href: "/practice", label: "Practice", related: ["/study/", "/awa", "/vocab"] },
  { href: "/tests", label: "Tests", related: [] },
  { href: "/learn", label: "Learn", related: ["/courses", "/guides"] },
  { href: "/progress", label: "Progress", related: ["/study/mistakes"] },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const [theme, setTheme] = useState<"light" | "dark">("light");


  // Full-screen ETS exam routes hide global nav chrome to preserve test-day focus
  const isExamFocus = pathname.startsWith("/exam/");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
        document.documentElement.setAttribute("data-theme", saved);
      } else {
        const prefersDark =
          typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
        const initial = prefersDark ? "dark" : "light";
        setTheme(initial);
        document.documentElement.setAttribute("data-theme", initial);
      }
    } catch {
      // ignore storage access issues
    }
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore
    }
  }

  if (isExamFocus) {
    return <>{children}</>;
  }

  return (
    <div className="app-frame">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-brand" aria-label="GRE study desk home" aria-current={pathname === "/" ? "page" : undefined}>
            GRE Study
          </Link>
          <nav className="site-navigation" aria-label="Study navigation">
            {NAV_ITEMS.map(({ href, label, related }) => {
              const active = pathname === href || (pathname === "/study/mistakes"
                ? href === "/progress"
                : related.some((route) => pathname.startsWith(route)));
              return (
                <Link key={href} href={href} className="nav-link" aria-current={active ? (pathname === href ? "page" : "location") : undefined}>
                  {label}
                </Link>
              );
            })}
          </nav>
          <button type="button" className="btn-ghost theme-toggle" onClick={toggleTheme}>
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
        </div>
      </header>
      <div id="main-content" className="app-main" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
