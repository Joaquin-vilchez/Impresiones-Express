import { useEffect, useState } from 'react';
// ✨ Corrección: Quitamos los íconos sin usar y movimos 'Printer' aquí arriba
import { Clock, PackageCheck, Loader2, TrendingUp, BarChart3, Zap, DollarSign, Activity, Printer } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase, type Order } from '../lib/supabase';
import { getModelMetrics, getFeatureImportance } from '../lib/mlModel';

interface Stats {
  total: number;
  pending: number;
  inProduction: number;
  completed: number;
  avgPredicted: number;
  avgActual: number;
  accuracy: number;
  totalRevenue: number;
  estimatedNextMonth: number;
}

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const metrics = getModelMetrics();
  const featureImportance = getFeatureImportance();

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

  const stats: Stats = (() => {
    const completed = orders.filter((o) => o.status === 'completado' && o.actual_hours);
    const avgPredicted = completed.length > 0
      ? completed.reduce((s, o) => s + (o.predicted_hours ?? 0), 0) / completed.length
      : 0;
    const avgActual = completed.length > 0
      ? completed.reduce((s, o) => s + (o.actual_hours ?? 0), 0) / completed.length
      : 0;
    const accuracy = avgActual > 0
      ? Math.max(0, 100 - (Math.abs(avgPredicted - avgActual) / avgActual) * 100)
      : 0;

    const totalRevenue = completed.length * 1250; // Estimado S/ 1250 por pedido
    const estimatedNextMonth = Math.round((orders.length / 30) * 1250 * 30);

    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pendiente').length,
      inProduction: orders.filter((o) => o.status === 'en_produccion').length,
      completed: completed.length,
      avgPredicted: Math.round(avgPredicted * 10) / 10,
      avgActual: Math.round(avgActual * 10) / 10,
      accuracy: Math.round(accuracy),
      totalRevenue,
      estimatedNextMonth,
    };
  })();

  // Datos para gráfico de tendencia
  const trendData = orders
    .filter((o) => o.status === 'completado')
    .slice(-7)
    .reverse()
    .map((o, i) => ({
      day: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i],
      predicted: o.predicted_hours,
      actual: o.actual_hours,
    }));

  // Datos para gráfico de distribución
  const distributionData = [
    { name: 'Pendiente', value: stats.pending, fill: '#f59e0b' },
    { name: 'En Producción', value: stats.inProduction, fill: '#3b82f6' },
    { name: 'Completado', value: stats.completed, fill: '#10b981' },
  ].filter((d) => d.value > 0);

  // Datos por tipo de impresión
  const printTypeData = Object.entries(
    orders.reduce((acc, o) => {
      acc[o.print_type] = (acc[o.print_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([type, count]) => ({ name: type.charAt(0).toUpperCase() + type.slice(1), value: count }))
    .sort((a, b) => b.value - a.value);

  const completedOrders = orders.filter((o) => o.status === 'completado' && o.actual_hours);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin text-sky-600 mx-auto mb-4" size={40} />
          <p className="text-gray-600 font-medium">Cargando datos en tiempo real...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-2">Analítica en tiempo real de tu producción</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-semibold text-sm">
          <Activity size={16} className="animate-pulse" />
          En Vivo
        </div>
      </div>

      {/* KPI Cards - Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Pedidos Totales',
            value: stats.total,
            icon: <BarChart3 size={24} />,
            color: 'bg-sky-600',
            trend: '+12%',
          },
          {
            label: 'En Producción',
            value: stats.inProduction,
            icon: <Loader2 size={24} />,
            color: 'bg-blue-600',
            trend: '+3',
          },
          {
            label: 'Completados',
            value: stats.completed,
            icon: <PackageCheck size={24} />,
            color: 'bg-emerald-600',
            trend: '+8',
          },
          {
            label: 'Precisión ML',
            value: `${stats.accuracy}%`,
            icon: <Zap size={24} />,
            color: 'bg-amber-600',
            trend: '+2%',
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6 group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`${kpi.color} text-white p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}
              >
                {kpi.icon}
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">
                {kpi.trend}
              </span>
            </div>
            <div className="text-4xl font-black text-gray-900 mb-1">{kpi.value}</div>
            <div className="text-sm text-gray-600 font-medium">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Revenue Cards */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-sky-600 to-sky-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <DollarSign size={24} />
            <span className="text-xs font-bold bg-sky-500/50 px-3 py-1 rounded-full backdrop-blur-sm">
              Histórico
            </span>
          </div>
          <div className="text-4xl font-black mb-1">S/ {stats.totalRevenue.toLocaleString()}</div>
          <p className="text-sky-100">Ingresos estimados acumulados</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp size={24} />
            <span className="text-xs font-bold bg-emerald-500/50 px-3 py-1 rounded-full backdrop-blur-sm">
              Proyección
            </span>
          </div>
          <div className="text-4xl font-black mb-1">S/ {stats.estimatedNextMonth.toLocaleString()}</div>
          <p className="text-emerald-100">Estimado próximo mes</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <TrendingUp className="text-sky-600" size={20} />
            <h3 className="font-bold text-gray-900">Predicción vs Realidad (últimos 7)</h3>
          </div>
          <div className="p-6">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" stroke="#999" />
                  <YAxis stroke="#999" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={{ fill: '#0ea5e9' }}
                    name="Predicho (h)"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                    name="Real (h)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                Datos insuficientes
              </div>
            )}
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Estado de Pedidos</h3>
          </div>
          <div className="p-6">
            {distributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                Sin datos
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Type Distribution */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Printer size={20} className="text-emerald-600" />
          <h3 className="font-bold text-gray-900">Tipos de Impresión Más Solicitados</h3>
        </div>
        <div className="p-6">
          {printTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={printTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} name="Cantidad" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Sin datos
            </div>
          )}
        </div>
      </div>

      {/* ML Model Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="bg-sky-600 p-2 rounded-lg">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Modelo ML</h2>
              <p className="text-xs text-gray-500">{metrics.algorithm}</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'R² Score', value: metrics.r2Score, good: true },
                { label: 'MAE (hrs)', value: metrics.mae },
                { label: 'RMSE (hrs)', value: metrics.rmse },
              ].map((m) => (
                <div key={m.label} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                  <div className={`text-xl font-black ${m.good ? 'text-emerald-600' : 'text-sky-600'}`}>
                    {m.value}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 font-medium">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Precisión en Datos Reales</span>
                <span className="text-sm font-black text-emerald-600">{stats.accuracy}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-3 rounded-full transition-all duration-1000 shadow-lg"
                  style={{ width: `${stats.accuracy}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-sky-50 rounded-lg p-3 text-center border border-sky-100">
                <div className="text-xs text-sky-600 font-medium mb-1">Prom. Predicho</div>
                <div className="text-2xl font-black text-sky-600">{stats.avgPredicted}h</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-100">
                <div className="text-xs text-emerald-600 font-medium mb-1">Prom. Real</div>
                <div className="text-2xl font-black text-emerald-600">{stats.avgActual}h</div>
              </div>
            </div>

            <div className="bg-sky-50 rounded-lg p-3 text-xs text-sky-700 border border-sky-100 font-medium">
              Entrenado con {metrics.trainingSamples} muestras históricas
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <TrendingUp size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Importancia de Variables</h2>
              <p className="text-xs text-gray-500">Contribución al modelo</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            {featureImportance.map((f) => (
              <div key={f.feature}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">{f.feature}</span>
                  <span className="text-sm font-black text-gray-900">{f.importance}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full transition-all duration-1000 shadow-md"
                    style={{ width: `${f.importance}%`, backgroundColor: f.color }}
                  />
                </div>
              </div>
            ))}

            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-600 leading-relaxed text-justify">
                La cantidad de copias es el factor más determinante (42%), seguido por el tipo de
                impresión (28%). El tamaño y material tienen contribuciones menores pero significativas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Precision Table */}
      {completedOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Clock className="text-amber-500" size={20} />
            <h3 className="font-bold text-gray-900">Análisis Detallado de Precisión</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Cliente', 'Tipo', 'Tamaño', 'Cant.', 'Predicho', 'Real', 'Error', 'Precisión'].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {completedOrders.slice(0, 8).map((order) => {
                  const err = Math.abs((order.predicted_hours ?? 0) - (order.actual_hours ?? 0));
                  const pct =
                    order.actual_hours ? Math.max(0, 100 - (err / order.actual_hours) * 100) : 0;
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-800">{order.client_name}</td>
                      <td className="py-3 px-4 text-gray-600 capitalize">{order.print_type}</td>
                      <td className="py-3 px-4 text-gray-600 font-medium">{order.size}</td>
                      <td className="py-3 px-4 text-gray-600">{order.quantity.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className="text-sky-600 font-bold">{order.predicted_hours}h</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-600 font-bold">{order.actual_hours}h</span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 font-medium">{Math.round(err * 10) / 10}h</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                pct >= 90
                                  ? 'bg-emerald-500'
                                  : pct >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-bold ${
                              pct >= 90
                                ? 'text-emerald-600'
                                : pct >= 75
                                ? 'text-amber-600'
                                : 'text-red-600'
                            }`}
                          >
                            {Math.round(pct)}%
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
    </div>
  );
}