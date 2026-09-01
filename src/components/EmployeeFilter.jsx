// Admin-only "All / [employee]" dropdown shown on Entries, Customers, Summary.
export default function EmployeeFilter({ employees, value, onChange }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
    >
      <option value="">All</option>
      {employees.map((e) => (
        <option key={e.id} value={e.id}>{e.name}</option>
      ))}
    </select>
  )
}
