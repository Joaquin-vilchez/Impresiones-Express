import { useEffect, useState } from 'react';
import { Loader2, Search, ArrowUpDown, Clock, CheckCircle2 } from 'lucide-react';
import { supabase, type Order, type Status } from '../lib/supabase';
import StatusBadge from '../components/StatusBadge';

const printTypeLabel: Record<string, string> = {
  digital: 'Digital',
  offset: 'Offset',
  gran_formato: 'Gran Formato',
  serigrafia: 'Serigrafía',
};

const materialLabel: Record<string, string> = {
  papel_bond: 'Papel Bond',
  papel_couche: 'Papel Couche',
  cartulina: 'Cartulina',
  vinilo: 'Vinilo',
  lona: 'Lona',
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  const [selected, setSelected] = useState<Order | null>(null);
  const [actualHours, setActualHours] = useState('');
  const [updating, setUpdating] = useState(false);

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = orders.filter((o) => {
    const matchSearch = o.client_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  async function updateStatus(order: Order, newStatus: Status) {
    await supabase
      .from('orders')
      .update({
        status: newStatus,
        ...(newStatus === 'completado' ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq('id', order.id);
    load();
    setSelected(null);
  }

  async function saveActualHours() {
    if (!selected) return;
    const hours = parseFloat(actualHours);
    if (isNaN(hours) || hours <= 0) return;
    setUpdating(true);
    await supabase
      .from('orders')
      .update({ actual_hours: hours, status: 'completado', completed_at: new Date().toISOString() })
      .eq('id', selected.id);
    setUpdating(false);
    setSelected(null);
    setActualHours('');
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-sky-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 mt-1">{orders.length} pedidos registrados</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 w-52"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as Status | 'all')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_produccion">En Produccion</option>
            <option value="completado">Completado</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Cliente', 'Tipo', 'Tamanio', 'Cant.', 'Material', 'Predicho', 'Real', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    No se encontraron pedidos
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-800">{order.client_name}</td>
                    <td className="py-3 px-4 text-gray-600">{printTypeLabel[order.print_type] ?? order.print_type}</td>
                    <td className="py-3 px-4 text-gray-600">{order.size}</td>
                    <td className="py-3 px-4 text-gray-600">{order.quantity.toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-600">{materialLabel[order.material] ?? order.material}</td>
                    <td className="py-3 px-4">
                      <span className="text-sky-600 font-medium">
                        {order.predicted_hours != null ? `${order.predicted_hours}h` : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-700 font-medium">
                        {order.actual_hours != null ? `${order.actual_hours}h` : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {order.status === 'pendiente' && (
                          <button
                            onClick={() => updateStatus(order, 'en_produccion')}
                            className="text-xs px-2.5 py-1 bg-sky-100 text-sky-700 rounded-md hover:bg-sky-200 transition-colors font-medium"
                          >
                            Iniciar
                          </button>
                        )}
                        {order.status === 'en_produccion' && (
                          <button
                            onClick={() => { setSelected(order); setActualHours(''); }}
                            className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors font-medium flex items-center gap-1"
                          >
                            <CheckCircle2 size={12} />
                            Completar
                          </button>
                        )}
                        {order.status === 'completado' && order.actual_hours == null && (
                          <button
                            onClick={() => { setSelected(order); setActualHours(''); }}
                            className="text-xs px-2.5 py-1 bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 transition-colors font-medium"
                          >
                            Registrar horas
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="bg-emerald-600 p-2 rounded-lg">
                <Clock size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Completar Pedido</h3>
                <p className="text-xs text-gray-500">{selected.client_name}</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-sky-50 rounded-lg p-4 flex items-center justify-between">
                <span className="text-sm text-sky-700">Tiempo predicho por ML</span>
                <div className="flex items-center gap-1">
                  <ArrowUpDown size={14} className="text-sky-600" />
                  <span className="font-bold text-sky-700">{selected.predicted_hours}h</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tiempo real de produccion (horas)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={actualHours}
                  onChange={(e) => setActualHours(e.target.value)}
                  placeholder="Ej: 5.5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Este dato se usara para mejorar la precision del modelo
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveActualHours}
                disabled={updating || !actualHours}
                className="px-5 py-2 bg-emerald-600 text-white text-sm rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {updating ? 'Guardando...' : 'Guardar y Completar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}