import { MapPin } from "lucide-react";

export function TopLocations() {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="mb-6 text-sm font-semibold text-text">Top Locations</h3>
      
      <div className="flex items-center gap-4">
        <div className="flex w-[120px] shrink-0 items-center gap-2 text-sm text-subtle">
          <MapPin className="h-4 w-4 text-subtle" />
          Unknown
        </div>
        
        <div className="flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[80%] bg-[var(--coral)]"></div>
          </div>
        </div>
        
        <div className="text-sm text-subtle">6</div>
      </div>
    </div>
  );
}
