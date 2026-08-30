import { ChevronDown, Share2, Bell } from "lucide-react";

export function TopFilters() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center overflow-x-auto rounded-lg border border-border bg-muted/50 p-1 scrollbar-hide">
        <button className="whitespace-nowrap rounded-md px-2 py-1.5 md:px-3 text-xs text-subtle hover:text-text transition-colors">Last 90 Days</button>
        <button className="whitespace-nowrap rounded-md bg-[var(--coral)] px-2 py-1.5 md:px-3 text-xs font-medium text-white shadow-sm">Last 30 Days</button>
        <button className="whitespace-nowrap rounded-md px-2 py-1.5 md:px-3 text-xs text-subtle hover:text-text transition-colors">Last 7 Days</button>
        <button className="flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 md:px-3 text-xs text-subtle hover:text-text transition-colors">
          Custom range <ChevronDown className="h-3 w-3" />
        </button>
      </div>
      
      <div className="flex items-center gap-2 md:border-l md:border-border md:pl-3">
        <button className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/50 text-subtle hover:text-text">
          <Bell className="h-3.5 w-3.5" />
        </button>
        <button className="flex items-center gap-2 rounded-full border border-[#FF6A4533] bg-[#FF6A451a] px-3 py-1.5 text-xs text-[var(--coral)] dark:text-[var(--coral)] hover:bg-[#FF6A4533]">
          <span className="hidden sm:inline">Share your page</span>
          <span className="sm:hidden">Share</span>
          <Share2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
