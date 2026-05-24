import { useEffect, useState } from 'react';
// Se eliminaron FileText y Filter porque no se estaban utilizando
import { Download, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { supabase, type Order } from '../lib/supabase';

export default function Reports() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data as Order[]) || []);
        setLoading(false);
      });
  }, []);

  const filterByDate = (orders: Order[], range: string) => {
    const now = new Date();
    // ✨ Corrección: Cambiamos 'let' por 'const'
    const startDate = new Date();

    if (range === 'week') startDate.setDate(now.getDate() - 7);
    else if (range === 'month') startDate.setMonth(now.getMonth() - 1);
    else startDate.setFullYear(now.getFullYear() - 1);

    return orders.filter((o) => new Date(o.created_at) >= startDate);
  };

  const filteredOrders = filterByDate(orders, dateRange);
  const completedOrders = filteredOrders.filter((o) => o.status === 'completado' && o.actual_hours);

  const stats = {
    totalOrders: filteredOrders.length,
    completedOrders: completedOrders.length,
    avgPredicted:
      completedOrders.length > 0
        ? Math.round(
            (completedOrders.reduce((s, o) => s + (o.predicted_hours ?? 0), 0) /
              completedOrders.length) *
              10
          ) / 10
        : 0,
    avgActual:
      completedOrders.length > 0
        ? Math.round(
            (completedOrders.reduce((s, o) => s + (o.actual_hours ?? 0), 0) /
              completedOrders.length) *
              10
          ) / 10
        : 0,
    avgError:
      completedOrders.length > 0
        ? Math.round(
            (completedOrders.reduce(
              (s, o) => s + Math.abs((o.predicted_hours ?? 0) - (o.actual_hours ?? 0)),
              0
            ) /
              completedOrders.length) *
              10
          ) / 10
        : 0,
    totalQuantity: filteredOrders.reduce((s, o) => s + o.quantity, 0),
  };

  const printTypeStats = Object.entries(
    filteredOrders.reduce(
      (acc, o) => {
        acc[o.print_type] = (acc[o.print_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    )
  ).map(([type, count]) => ({ type, count }));

  const materialStats = Object.entries(
    filteredOrders.reduce(
      (acc, o) => {
        acc[o.material] = (acc[o.material] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    )
  ).map(([material, count]) => ({ material, count }));

  function downloadPDF() {
    const csvContent = [
      // CORRECCIÓN: Se le quitó el .join(',') que estaba al final de esta línea
      ['Cliente', 'Tipo', 'Tamanio', 'Cantidad', 'Material', 'Predicho', 'Real', 'Error', 'Estado'],
      ...completedOrders.map((o) => [
        o.client_name,
        o.print_type,
        o.size,
        o.quantity,
        o.material,
        o.predicted_hours,
        o.actual_hours,
        Math.abs((o.predicted_hours ?? 0) - (o.actual_hours ?? 0)),
        o.status,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    link.download = `reporte-impresiones-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-sky-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reportes y Análisis</h1>
        <p className="text-gray-500 mt-2">Estadísticas detalladas de tu producción</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {['week', 'month', 'year'].map((range) => (
          <button
            key={range}
            onClick={() => setDateRange(range as 'week' | 'month' | 'year')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              dateRange === range
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <Calendar size={16} />
            {range === 'week' ? 'Esta Semana' : range === 'month' ? 'Este Mes' : 'Este Año'}
          </button>
        ))}
        <button
          onClick={downloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-all shadow-sm"
        >
          <Download size={16} />
          Descargar CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-5 gap-4">
        {[
          { label: 'Total Pedidos', value: stats.totalOrders, unit: '', color: 'sky' },
          { label: 'Completados', value: stats.completedOrders, unit: '', color: 'emerald' },
          { label: 'Prom. Predicho', value: stats.avgPredicted, unit: 'h', color: 'blue' },
          { label: 'Prom. Real', value: stats.avgActual, unit: 'h', color: 'amber' },
          { label: 'Error Promedio', value: stats.avgError, unit: 'h', color: 'red' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={`bg-gradient-to-br from-${kpi.color}-50 to-${kpi.color}-100 border border-${kpi.color}-200 rounded-xl p-4`}
          >
            <div className={`text-2xl font-bold text-${kpi.color}-700 mb-1`}>
              {kpi.value}
              {kpi.unit}
            </div>
            <div className={`text-xs text-${kpi.color}-600 font-medium`}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Print Type Distribution */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Distribución por Tipo de Impresión</h3>
          </div>
          <div className="p-6 space-y-4">
            {printTypeStats.map((stat) => (
              <div key={stat.type}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 capitalize">{stat.type}</span>
                  <span className="text-sm font-bold text-gray-900">{stat.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-sky-500 h-2 rounded-full"
                    style={{
                      width: `${(stat.count / filteredOrders.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Material Distribution */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Distribución por Material</h3>
          </div>
          <div className="p-6 space-y-4">
            {materialStats.map((stat) => (
              <div key={stat.material}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 capitalize">{stat.material}</span>
                  <span className="text-sm font-bold text-gray-900">{stat.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{
                      width: `${(stat.count / filteredOrders.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accuracy Table */}
      {completedOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <TrendingUp className="text-sky-600" size={20} />
            <h3 className="font-bold text-gray-900">Análisis de Precisión</h3>
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-semibold">Cliente</th>
                  <th className="text-center py-2 px-3 text-gray-500 font-semibold">Predicho (h)</th>
                  <th className="text-center py-2 px-3 text-gray-500 font-semibold">Real (h)</th>
                  <th className="text-center py-2 px-3 text-gray-500 font-semibold">Error</th>
                  <th className="text-center py-2 px-3 text-gray-500 font-semibold">Precisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {completedOrders.slice(0, 10).map((o) => {
                  const err = Math.abs((o.predicted_hours ?? 0) - (o.actual_hours ?? 0));
                  const acc = o.actual_hours
                    ? Math.max(0, 100 - (err / o.actual_hours) * 100)
                    : 0;
                  return (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-800">{o.client_name}</td>
                      <td className="py-3 px-3 text-center text-sky-600 font-semibold">
                        {o.predicted_hours}h
                      </td>
                      <td className="py-3 px-3 text-center text-gray-700 font-semibold">
                        {o.actual_hours}h
                      </td>
                      <td className="py-3 px-3 text-center text-gray-500">{Math.round(err * 10) / 10}h</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5 mr-2">
                            <div
                              className={`h-1.5 rounded-full ${
                                acc >= 90
                                  ? 'bg-emerald-500'
                                  : acc >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${acc}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-700 w-8 text-right">
                            {Math.round(acc)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="bg-gradient-to-br from-sky-50 to-emerald-50 border border-sky-200 rounded-2xl p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Insights y Recomendaciones</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>
            ✓ Tu error promedio es de <span className="font-bold">{stats.avgError}h</span> - excelente
            precisión
          </li>
          <li>
            ✓ El tipo más utilizado es{' '}
            <span className="font-bold">
              {printTypeStats[0]?.type || 'N/A'}
            </span>
            ({printTypeStats[0]?.count || 0} pedidos)
          </li>
          <li>
            ✓ Total de impresiones producidas:{' '}
            <span className="font-bold">{stats.totalQuantity.toLocaleString()}</span> unidades
          </li>
          <li>✓ Considera usar predictores más agresivos para {dateRange === 'week' ? 'esta semana' : dateRange === 'month' ? 'este mes' : 'este año'}</li>
        </ul>
      </div>
    </div>
  );
}