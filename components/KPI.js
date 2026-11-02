export default function KPI({ title, value, subtitle, icon, highlight = false }) {
  return (
    <div
      className={`rounded-xl border p-5 transition-shadow hover:shadow-xs ${
        highlight
          ? 'bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200'
          : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value ?? '—'}
        </p>
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

