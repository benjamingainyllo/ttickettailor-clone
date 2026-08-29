"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import {
  Search,
  ChevronsLeft,
  ChevronsRight,
  Sun,
  Moon,
  LayoutGrid,
  CreditCard,
  UsersRound,
  Gem,
  Workflow,
  Compass,
  Link2,
  Settings2,
  Calendar,
  ExternalLink,
  Layers3,
  LogOut,
  Wallet,
  UserCircle
} from "lucide-react";

/**
 * What an organiser actually does, in the order they do it.
 *
 * SELLING is the daily work: put an event up, watch it sell, see who is
 * coming. MONEY is the weekly check. Everything else is settings.
 *
 * Gone from the old creator product: Offers (digital downloads — merch now
 * lives on the event that sells it), Automations and Experiments, which were
 * both empty placeholder screens. A nav item that leads to "coming soon"
 * costs trust every time somebody clicks it hoping for something.
 */
const navGroups = [
  {
    title: "SELLING",
    items: [
      { label: "Overview", icon: LayoutGrid, href: "/overview" },
      { label: "Events", icon: Calendar, href: "/events" },
      { label: "Attendees", icon: UsersRound, href: "/audience" },
    ]
  },
  {
    title: "MONEY",
    items: [
      { label: "Sales", icon: CreditCard, href: "/revenue" },
      { label: "Payouts", icon: Wallet, href: "/payouts" },
    ]
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);

  // Derive display values from auth context
  const userName = profile?.first_name || user?.user_metadata?.first_name || "Creator";
  const userEmail = user?.email || "";
  const userHandle = profile?.handle || "";
  const userPhoto = profile?.avatar_url || null;

  useEffect(() => {
    setMounted(true);
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(currentTheme);
  }, []);

  if (!mounted) return null;

  const handleLogout = async () => {
    await signOut();
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <aside 
      className={`relative hidden lg:flex flex-col border-r border-zinc-700 bg-black transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-[80px]" : "w-[260px]"
      } h-screen overflow-y-auto overflow-x-hidden`}
    >
      {/* Header & Logo */}
      <div className="flex h-[72px] shrink-0 items-center justify-between px-5">
        <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-black">
            <Layers3 className="h-5 w-5 fill-current" />
          </div>
          <span className="truncate text-lg font-bold tracking-tight text-white">Paylance</span>
        </div>
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors ${isCollapsed ? "mx-auto" : ""}`}
        >
          {isCollapsed ? <ChevronsRight strokeWidth={1.5} className="h-5 w-5" /> : <ChevronsLeft strokeWidth={1.5} className="h-5 w-5" />}
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-5 pb-6 pt-2">
        <div className={`relative flex items-center transition-all duration-300 ${isCollapsed ? "justify-center" : ""}`}>
          <Search strokeWidth={1.5} className={`absolute text-zinc-500 transition-all duration-300 ${isCollapsed ? "left-1/2 -translate-x-1/2 h-5 w-5" : "left-3 h-4 w-4"}`} />
          <input 
            type="text" 
            placeholder="Search" 
            className={`h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-800 transition-all duration-300 ${
              isCollapsed ? "cursor-pointer px-0 opacity-0" : "pl-9 pr-4 opacity-100"
            }`}
          />
          {/* Overlay button for search when collapsed */}
          {isCollapsed && (
            <button className="absolute inset-0 h-full w-full rounded-xl hover:bg-eclipse-medium/50"></button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3">
        {navGroups.map((group, index) => (
          <div key={group.title} className={index !== 0 ? "mt-6" : ""}>
            {/* Group Title */}
            <div className={`mb-2 px-3 text-xs font-semibold tracking-wider text-zinc-600 transition-all duration-300 ${
              isCollapsed ? "h-0 overflow-hidden opacity-0" : "opacity-100"
            }`}>
              {group.title}
            </div>
            
            {/* Divider for collapsed state instead of text title */}
            {isCollapsed && index !== 0 && (
              <div className="mx-auto mb-4 mt-2 h-px w-8 bg-white/10"></div>
            )}

            <nav className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href as any}
                    title={isCollapsed ? item.label : undefined}
                    className={`group flex h-10 items-center rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-zinc-800 text-white font-medium"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                    } ${isCollapsed ? "justify-center px-0" : "px-3 gap-3"}`}
                  >
                    <item.icon strokeWidth={1.5} className={`shrink-0 ${isCollapsed ? "h-5 w-5" : "h-[18px] w-[18px]"}`} />
                    
                    <span className={`truncate text-sm transition-all duration-300 ${
                      isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                    }`}>
                      {item.label}
                    </span>

                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Profile & Settings Footer */}
      <div className="mt-auto p-4 border-t border-white/10">
        {/* PROFILE GROUP */}
        <div className={`mb-2 px-3 text-[10px] font-bold tracking-widest text-zinc-600 transition-all duration-300 ${
          isCollapsed ? "h-0 overflow-hidden opacity-0" : "opacity-100"
        }`}>
          PROFILE
        </div>

        {/* Settings Button */}
        <Link
          href="/settings"
          className={`mb-1 flex h-10 w-full items-center rounded-xl bg-transparent transition-colors hover:bg-zinc-800/50 hover:text-white ${
            isCollapsed ? "justify-center px-0" : "px-3 gap-3 text-zinc-400"
          }`}
        >
          <Settings2 strokeWidth={1.5} className={`shrink-0 ${isCollapsed ? "h-5 w-5" : "h-[18px] w-[18px]"}`} />
          <span className={`text-sm font-medium transition-all duration-300 ${
            isCollapsed ? "hidden opacity-0" : "opacity-100"
          }`}>
            Settings
          </span>
        </Link>

        {/* Profile Page Link */}
        {userHandle && (
          <Link
            href={`/${userHandle}` as any}
            target="_blank"
            className={`mb-1 flex h-10 w-full items-center rounded-xl bg-transparent transition-colors hover:bg-zinc-800/50 hover:text-white ${
              isCollapsed ? "justify-center px-0" : "px-3 gap-3 text-zinc-400"
            }`}
          >
            <ExternalLink strokeWidth={1.5} className={`shrink-0 ${isCollapsed ? "h-5 w-5" : "h-[18px] w-[18px]"}`} />
            <span className={`text-sm font-medium transition-all duration-300 ${
              isCollapsed ? "hidden opacity-0" : "opacity-100"
            }`}>
              My Profile
            </span>
          </Link>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`mb-1 flex h-10 w-full items-center rounded-xl bg-transparent transition-colors hover:bg-zinc-800/50 ${
            isCollapsed ? "justify-center" : "justify-between px-3 text-zinc-400 hover:text-white"
          }`}
        >
          <div className={`flex items-center ${isCollapsed ? "" : "gap-3"}`}>
            {theme === "dark" ? (
              <Moon strokeWidth={1.5} className={`shrink-0 ${isCollapsed ? "h-5 w-5" : "h-[18px] w-[18px]"}`} />
            ) : (
              <Sun strokeWidth={1.5} className={`shrink-0 ${isCollapsed ? "h-5 w-5" : "h-[18px] w-[18px]"}`} />
            )}
            
            <span className={`text-sm font-medium transition-all duration-300 ${
              isCollapsed ? "hidden opacity-0" : "opacity-100"
            }`}>
              {theme === "dark" ? "Dark Mode" : "Light Mode"}
            </span>
          </div>
          
          {!isCollapsed && (
            <div className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
              theme === "dark" ? "bg-eclipse-medium" : "bg-white/20"
            }`}>
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition duration-200 ease-in-out ${
                  theme === "dark" ? "translate-x-4" : "translate-x-1"
                }`}
              />
            </div>
          )}
        </button>

        {/* Log Out Button */}
        <button
          onClick={handleLogout}
          className={`mb-6 flex h-10 w-full items-center rounded-xl bg-transparent transition-colors hover:bg-red-500/10 hover:text-red-500 ${
            isCollapsed ? "justify-center" : "px-3 gap-3 text-zinc-400"
          }`}
        >
          <LogOut strokeWidth={1.5} className={`shrink-0 ${isCollapsed ? "h-5 w-5" : "h-[18px] w-[18px]"}`} />
          <span className={`text-sm font-medium transition-all duration-300 ${
            isCollapsed ? "hidden opacity-0" : "opacity-100"
          }`}>
            Log out
          </span>
        </button>

        {/* User Identity Section - Moved to Bottom */}
        <div
          className={`flex w-full items-center rounded-xl p-1.5 transition-colors hover:bg-zinc-800/50 ${
            isCollapsed ? "justify-center" : "gap-3 text-left"
          }`}
        >
          <div className="relative shrink-0">
            {userPhoto ? (
              <Image
                src={userPhoto}
                alt={userName}
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-zinc-800"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 ring-2 ring-zinc-800">
                <UsersRound className="h-5 w-5" />
              </div>
            )}
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-eclipse-dark bg-emerald-500"></span>
          </div>
          
          <div className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${
            isCollapsed ? "hidden opacity-0" : "opacity-100"
          }`}>
            <span className="truncate text-sm font-semibold text-white">{userName}</span>
            <span className="truncate text-xs text-zinc-500">{userEmail}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
