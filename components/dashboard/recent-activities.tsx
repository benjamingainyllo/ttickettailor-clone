import { Filter, MoreVertical, User } from "lucide-react";

const activities = [
  {
    id: 1,
    customer: "Anonymous",
    email: "-",
    amount: "₦100",
    product: "Buy Me a Coffee",
    date: "4 days ago",
    status: "Paid",
  }
];

export function RecentActivities() {
  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-[#0F0F12] overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-[var(--hairline)]/50">
        <h3 className="text-sm font-semibold text-white">Recent Activities</h3>
        <button className="flex items-center gap-2 rounded-lg border border-[var(--hairline)] bg-[var(--ground-deep)]/50 px-3 py-1.5 text-xs text-[var(--on-ground-soft)] hover:bg-[var(--ground-raised)]">
          Filter <span className="text-[8px]">▼</span>
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[var(--on-ground-soft)]">
          <thead className="bg-[#0F0F12] uppercase tracking-wider">
            <tr>
              <th className="px-5 py-4 font-medium">Customer</th>
              <th className="px-5 py-4 font-medium">Email</th>
              <th className="px-5 py-4 font-medium">Amount</th>
              <th className="px-5 py-4 font-medium">Product</th>
              <th className="px-5 py-4 font-medium">Date</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {activities.map((activity) => (
              <tr key={activity.id} className="hover:bg-[var(--ground-raised)]/20 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ground-raised)]">
                      <User className="h-3 w-3 text-[var(--on-ground-soft)]" />
                    </div>
                    <span className="font-medium text-zinc-200">{activity.customer}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-[var(--on-ground-faint)]">{activity.email}</td>
                <td className="px-5 py-4 font-medium text-zinc-200">{activity.amount}</td>
                <td className="px-5 py-4">{activity.product}</td>
                <td className="px-5 py-4 text-[var(--on-ground-faint)]">{activity.date}</td>
                <td className="px-5 py-4">
                  <span className="inline-flex rounded-full bg-[#9BE3C01a] px-2 py-0.5 text-[10px] font-medium text-[var(--mint)] ring-1 ring-inset ring-[#9BE3C033]">
                    {activity.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button className="text-[var(--on-ground-faint)] hover:text-[var(--on-ground-soft)]">
                    <MoreVertical className="h-4 w-4 ml-auto" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
