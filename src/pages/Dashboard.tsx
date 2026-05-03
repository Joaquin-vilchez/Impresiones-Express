import { useEffect, useState } from 'react';
import { Clock, PackageCheck, Loader2, TrendingUp, BarChart3, Zap, AlertCircle } from 'lucide-react';
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
    const avgPredicted =
      completed.length > 0
        ? completed.reduce((s, o) => s + (o.predicted_hours ?? 0), 0) / completed.length
        : 0;
    const avgActual =
      completed.length > 0
        ? completed.reduce((s, o) => s + (o.actual_hours ?? 0), 0) / completed.length
        : 0;
    const accuracy =
      avgActual > 0 ? Math.max(0, 100 - (Math.abs(avgPredicted - avgActual) / avgActual) * 100) : 0;

    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pendiente').length,
      inProduction: orders.filter((o) => o.status === 'en_produccion').length,
      completed: completed.length,
      avgPredicted: Math.round(avgPredicted * 10) / 10,
      avgActual: Math.round(avgActual * 10) / 10,
      accuracy: Math.round(accuracy),
    };
  })();

  const completedOrders = orders.filter((o) => o.status === 'completado' && o.actual_hours);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-sky-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Produccion</h1>
        <p className="text-gray-500 mt-1">
          Monitoreo en tiempo real con predicciones de Machine Learning
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Pedidos',
            value: stats.total,
            icon: <BarChart3 size={20} />,
            color: 'sky',
          },
          {
            label: 'Pendientes',
            value: stats.pending,
            icon: <AlertCircle size={20} />,
            color: 'amber',
          },
          {
            label: 'En Produccion',
            value: stats.inProduction,
            icon: <Loader2 size={20} />,
            color: 'blue',
          },
          {
            label: 'Completados',
            value: stats.completed,
            icon: <PackageCheck size={20} />,
            color: 'emerald',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div
              className={`inline-flex p-2 rounded-lg bg-${kpi.color}-50 text-${kpi.color}-600 mb-3`}
            >
              {kpi.icon}
            </div>
            <div className="text-3xl font-bold text-gray-900">{kpi.value}</div>
            <div className="text-sm text-gray-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ML Model Metrics */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
                <div key={m.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <div
                    className={`text-xl font-bold ${m.good ? 'text-emerald-600' : 'text-sky-600'}`}
                  >
                    {m.value}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Precision en datos reales</span>
                <span className="text-sm font-bold text-emerald-600">{stats.accuracy}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${stats.accuracy}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="text-center">
                <div className="text-sm text-gray-500">Prom. Predicho</div>
                <div className="text-lg font-bold text-sky-600">{stats.avgPredicted}h</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Prom. Real</div>
                <div className="text-lg font-bold text-gray-700">{stats.avgActual}h</div>
              </div>
            </div>

            <div className="bg-sky-50 rounded-lg p-3 text-xs text-sky-700">
              Entrenado con {metrics.trainingSamples} muestras historicas
            </div>
          </div>
        </div>

        {/* Feature Importance */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <TrendingUp size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Importancia de Variables</h2>
              <p className="text-xs text-gray-500">Contribucion al modelo predictivo</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {featureImportance.map((f) => (
              <div key={f.feature}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700">{f.feature}</span>
                  <span className="text-sm font-bold text-gray-900">{f.importance}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-700"
                    style={{ width: `${f.importance}%`, backgroundColor: f.color }}
                  />
                </div>
              </div>
            ))}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 leading-relaxed">
                La cantidad de copias es el factor mas determinante del tiempo de produccion,
                seguido por el tipo de impresion utilizado.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Prediction vs Actual scatter */}
      {completedOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-lg">
              <Clock size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Prediccion vs Tiempo Real</h2>
              <p className="text-xs text-gray-500">Comparacion por pedido completado</p>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Cliente</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Tipo</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">Predicho (h)</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">Real (h)</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">Error</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">Precision</th>
                  </tr>
                </thead>
                <tbody>
                  {completedOrders.map((order) => {
                    const err = Math.abs((order.predicted_hours ?? 0) - (order.actual_hours ?? 0));
                    const pct =
                      order.actual_hours
                        ? Math.max(0, 100 - (err / order.actual_hours) * 100)
                        : 0;
                    return (
                      <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-medium text-gray-800">{order.client_name}</td>
                        <td className="py-2.5 px-3 text-gray-600 capitalize">{order.print_type}</td>
                        <td className="py-2.5 px-3 text-center text-sky-600 font-medium">
                          {order.predicted_hours}h
                        </td>
                        <td className="py-2.5 px-3 text-center text-gray-700 font-medium">
                          {order.actual_hours}h
                        </td>
                        <td className="py-2.5 px-3 text-center text-gray-500">
                          {Math.round(err * 10) / 10}h
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`font-semibold ${
                              pct >= 90
                                ? 'text-emerald-600'
                                : pct >= 75
                                ? 'text-amber-600'
                                : 'text-red-500'
                            }`}
                          >
                            {Math.round(pct)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
