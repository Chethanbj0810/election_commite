'use client';

export default function DataTable({
  headers = [],
  rows = [],
  emptyMessage = 'No data available',
  renderRow,
}) {
  return (
    <div className="overflow-x-auto w-full border border-slate-200 rounded-xl bg-white shadow-xs">
      <table className="w-full text-left text-sm text-slate-700">
        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 tracking-wider">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-5 py-3.5 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length || 1}
                className="px-5 py-8 text-center text-sm text-slate-400 italic"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) =>
              renderRow ? (
                renderRow(row, index)
              ) : (
                <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                  {Object.values(row).map((val, cellIdx) => (
                    <td key={cellIdx} className="px-5 py-3.5 whitespace-nowrap">
                      {val !== null && val !== undefined ? String(val) : '—'}
                    </td>
                  ))}
                </tr>
              )
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

