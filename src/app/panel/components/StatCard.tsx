import { ReactNode } from "react";


export default function StatCard({ title, value, tone = "slate", icon }: { title: string; value: ReactNode; tone?: "slate"|"green"|"red"; icon?: ReactNode; }) {
const toneCls = {
slate: "bg-white/10",
green: "bg-emerald-500/20",
red: "bg-red-500/20",
}[tone];
return (
<div className={`rounded-2xl ${toneCls} border border-white/10 p-4 min-w-[160px]`}>
<div className="text-white/80 text-xs mb-2">{title}</div>
<div className="text-2xl font-semibold text-white flex items-center gap-2">{icon}{value}</div>
</div>
);
}