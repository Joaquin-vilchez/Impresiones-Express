import { useEffect, useState } from 'react';
import { Loader2, Search, ArrowUpDown, Clock, CheckCircle2, Filter, X } from 'lucide-react';
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
  const [sortBy, setSortBy] = useState<'date' | 'quantity' | 'time'>('date');
  const [selected, setSelected] = useState<Order | null>(null);
  const [actualHours, setActualHours] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  let filtered = orders.filter((o) => {
    const matchSearch = o.client_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (sortBy === 'quantity') {
    filtered = [...filtered].sort((a, b) => b.quantity - a.quantity);
  } else if (sortBy === 'time') {
    filtered = [...filtered].sort((a, b) => (b.predicted_hours ?? 0) - (a.predicted_hours ?? 0));
  }

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
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin text-sky-600 mx-auto mb-4" size={40} />
          <p className="text-gray-600 font-medium">Cargando pedidos...</p>
        </div>
      </div>
    );
  }

  const statusCounts = {
    all: orders.length,
    pendiente: orders.filter((o) => o.status === 'pendiente').length,
    en_produccion: orders.filter((o) => o.status === 'en_produccion').length,
    completado: orders.filter((o) => o.status === 'completado').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Gestión de Pedidos</h1>
          <p className="text-gray-500 mt-1">{orders.length} pedidos en el sistema</p>
        </div>
      </div>

      {/* Status Pills */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pendiente', 'en_produccion', 'completado'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              filterStatus === status
                ? 'bg-sky-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {status === 'all'
              ? `Todos (${statusCounts.all})`
              : status === 'pendiente'
              ? `Pendiente (${statusCounts.pendiente})`
              : status === 'en_produccion'
              ? `En Prod. (${statusCounts.en_produccion})`
              : `Completado (${statusCounts.completado})`}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente, tamaño, material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all"
        >
          <Filter size={18} />
          Ordenar
        </button>
      </div>

      {/* Sort Options */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top">
          {[
            { id: 'date', label: '📅 Más Reciente' },
            { id: 'quantity', label: '📦 Mayor Cantidad' },
            { id: 'time', label: '⏱️ Mayor Tiempo' },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setSortBy(opt.id as typeof sortBy);
                setShowFilters(false);
              }}
              className={`p-2 rounded-lg text-sm font-medium transition-all ${
                sortBy === opt.id
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                {['Cliente', 'Tipo', 'Tamaño', 'Cant.', 'Material', 'Predicho', 'Real', 'Estado', 'Acciones'].map((h) => (
                  <th
                    key={h}
                    className="text-left py-4 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400 font-medium">
                    <p className="text-lg mb-2">📋 No se encontraron pedidos</p>
                    <p className="text-sm">Intenta con otros criterios de búsqueda</p>
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-sky-50/50 transition-colors group">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-800">{order.client_name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-700 font-medium capitalize">
                        {printTypeLabel[order.print_type] ?? order.print_type}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600 font-medium">{order.size}</td>
                    <td className="py-4 px-4">
                      <span className="text-gray-800 font-bold">{order.quantity.toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      <span className="inline-block bg-gray-100 px-2.5 py-1 rounded-lg text-xs font-medium">
                        {materialLabel[order.material] ?? order.material}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sky-600 font-bold bg-sky-50 px-2.5 py-1 rounded-lg">
                        {order.predicted_hours != null ? `${order.predicted_hours}h` : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg">
                        {order.actual_hours != null ? `${order.actual_hours}h` : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {order.status === 'pendiente' && (
                          <button
                            onClick={() => updateStatus(order, 'en_produccion')}
                            className="text-xs px-2.5 py-1.5 bg-sky-100 text-sky-700 rounded-lg hover:bg-sky-200 transition-colors font-semibold"
                          >
                            Iniciar
                          </button>
                        )}
                        {order.status === 'en_produccion' && (
                          <button
                            onClick={() => {
                              setSelected(order);
                              setActualHours('');
                            }}
                            className="text-xs px-2.5 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-semibold flex items-center gap-1"
                          >
                            <CheckCircle2 size={12} />
                            Completar
                          </button>
                        )}
                        {order.status === 'completado' && order.actual_hours == null && (
                          <button
                            onClick={() => {
                              setSelected(order);
                              setActualHours('');
                            }}
                            className="text-xs px-2.5 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-semibold"
                          >
                            Log Horas
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

      {/* Modal to log actual hours */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-600 p-2 rounded-lg">
                  <Clock size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Completar Pedido</h3>
                  <p className="text-xs text-gray-500">{selected.client_name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-sky-50 rounded-lg p-4 flex items-center justify-between border border-sky-100">
                <span className="text-sm text-sky-700 font-medium">Tiempo predicho por ML</span>
                <div className="flex items-center gap-2">
                  <ArrowUpDown size={14} className="text-sky-600" />
                  <span className="font-black text-sky-700 text-lg">{selected.predicted_hours}h</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Tiempo real de producción (horas)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={actualHours}
                  onChange={(e) => setActualHours(e.target.value)}
                  placeholder="Ej: 5.5"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  Este dato mejora la precisión del modelo para futuras predicciones
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveActualHours}
                disabled={updating || !actualHours}
                className="px-5 py-2 bg-emerald-600 text-white text-sm rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-lg"
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