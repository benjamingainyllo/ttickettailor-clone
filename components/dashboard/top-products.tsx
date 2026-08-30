import { PackageOpen } from "lucide-react";

export function TopProducts() {
  return (
    <div className="flex h-[140px] flex-col rounded-[3px] border-2 border-[var(--dl-line)] bg-surface p-5">
      <h3 className="text-sm font-semibold text-text">Top Products</h3>
      
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <PackageOpen className="mb-2 h-6 w-6 text-subtle" />
        <p className="text-[11px] text-subtle">
          No products yet.<br />
          Create your first product to start selling!
        </p>
      </div>
    </div>
  );
}
