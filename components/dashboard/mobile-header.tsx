"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useState } from "react";
import { MobileSidebar } from "./mobile-sidebar";

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b-2 border-[var(--dl-line)] bg-[var(--dl-paper)] px-4 lg:hidden">
        <Link href="/overview" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-acid)] text-[13px] font-black text-[var(--dl-ink)]">
            P
          </span>
          <span className="text-[17px] font-extrabold tracking-tight">Paylance</span>
        </Link>

        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open the menu"
          className="flex h-10 w-10 items-center justify-center rounded-[3px] text-[var(--dl-ink-soft)] transition-colors hover:bg-[rgba(20,16,24,0.06)] hover:text-[var(--dl-ink)]"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      <MobileSidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
