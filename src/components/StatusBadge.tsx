import type { Status } from '../lib/supabase';

const config: Record<Status, { label: string; className: string }> = {
  pendiente: {
    label: 'Pendiente',
    className: 'bg-amber-100 text-amber-700 border border-amber-200',
  },
  en_produccion: {
    label: 'En Produccion',
    className: 'bg-sky-100 text-sky-700 border border-sky-200',
  },
  completado: {
    label: 'Completado',
    className: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { label, className } = config[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
