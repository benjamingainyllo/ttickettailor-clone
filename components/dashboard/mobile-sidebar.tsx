"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import {
  Search,
  X,
  LayoutGrid,
  CreditCard,
  UsersRound,
  Gem,
  Workflow,
  Compass,
  Link2,
  Settings2,
  LogOut,
  Layers3,
  Calendar,
  Sun,
  Moon,
  UserCircle,
  ExternalLink,
  Wallet
} from "lucide-react";

/** Kept in step with the desktop sidebar — see the note there. */
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

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
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

  const handleLogout = async () => {
    await signOut();
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Close sidebar when clicking a link
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!mounted) return null;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-zinc-700 bg-black shadow-2xl transition-transform">
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
              <Layers3 className="h-5 w-5 fill-current" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Paylance</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search" 
              className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 pl-9 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6">
          {navGroups.map((group, index) => (
            <div key={group.title} className={index !== 0 ? "mt-6" : ""}>
              <div className="mb-2 px-3 text-xs font-semibold tracking-wider text-zinc-600">
                {group.title}
              </div>
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.label}
                      href={item.href as any}
                      className={`flex h-11 items-center gap-3 rounded-xl px-3 transition-all ${
                        isActive
                          ? "bg-zinc-800 text-white font-medium"
                          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                      }`}
                    >
                      <item.icon strokeWidth={1.5} className="h-5 w-5 shrink-0" />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="mt-auto p-4 border-t border-zinc-800">
          <div className="mb-2 px-3 text-[10px] font-bold tracking-widest text-zinc-600">
            PROFILE
          </div>

          {/* Settings Button */}
          <Link
            href="/settings"
            className="mb-1 flex h-11 w-full items-center gap-3 rounded-xl bg-transparent px-3 text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
          >
            <Settings2 strokeWidth={1.5} className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">Settings</span>
          </Link>

          {/* Profile Page Link */}
          {userHandle && (
            <Link
              href={`/${userHandle}` as any}
              target="_blank"
              className="mb-1 flex h-11 w-full items-center gap-3 rounded-xl bg-transparent px-3 text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
            >
              <ExternalLink strokeWidth={1.5} className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">My Profile</span>
            </Link>
          )}

          <button
            onClick={toggleTheme}
            className="mb-1 flex h-11 w-full items-center justify-between rounded-xl bg-transparent px-3 text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
          >
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon strokeWidth={1.5} className="h-5 w-5" />
              ) : (
                <Sun strokeWidth={1.5} className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">
                {theme === "dark" ? "Dark Mode" : "Light Mode"}
              </span>
            </div>
            
            <div className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
              theme === "dark" ? "bg-eclipse-medium" : "bg-white/20"
            }`}>
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition duration-200 ease-in-out ${
                  theme === "dark" ? "translate-x-4" : "translate-x-1"
                }`}
              />
            </div>
          </button>

          {/* Log Out Button */}
          <button
            onClick={handleLogout}
            className="mb-6 flex h-11 w-full items-center gap-3 rounded-xl bg-transparent px-3 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
          >
            <LogOut strokeWidth={1.5} className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">Log out</span>
          </button>

          {/* User Identity Section */}
          <div className="flex items-center gap-3 px-1">
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
                  <UserCircle className="h-5 w-5" />
                </div>
              )}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-black bg-emerald-500"></span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold text-white">{userName}</span>
              <span className="truncate text-xs text-zinc-500">{userEmail}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
