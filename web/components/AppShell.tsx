"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const THEME_KEY = "gre-study-theme-v1";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/exam/full", label: "Mock" },
  { href: "/study/mixed", label: "Practice" },
  { href: "/vocab", label: "Vocab" },
  { href: "/awa", label: "Writing" },
  { href: "/guides", label: "Guides" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
          <Link href="/" className="site-brand">
            <span className="brand-badge" aria-hidden="true">GRE</span>
            <span className="brand-name">GRE Exam Simulator</span>
          </Link>

          <nav className="site-nav-desktop" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href.replace("/mixed", ""));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="header-controls">
            <button
              type="button"
              className="btn-ghost theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              {theme === "light" ? "Dark Mode" : "Light Mode"}
            </button>
            <button
              type="button"
              className="btn-ghost mobile-menu-btn"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-drawer"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="mobile-nav-drawer" className="site-nav-mobile" aria-label="Mobile navigation">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href.replace("/mixed", ""));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link-mobile ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <div id="main-content" className="app-main">
        {children}
      </div>
    </div>
  );
}
