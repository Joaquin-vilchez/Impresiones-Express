import { useEffect, useState, useMemo } from 'react';
import { Brain, Loader2, TrendingUp, GitBranch, Trees, Zap, AlertCircle, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase, type Order, type PrintType, type Size, type Material } from '../lib/supabase';
import {
  trainModels,
  getAllMetrics,
  predictWithModel,
  FEATURE_NAMES,
  FEATURE_COLORS,
  type TrainedModels,
  type ModelType,
} from '../lib/mlModel';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SimInput {
  print_type: PrintType;
  size: Size;
  quantity: string;
  material: Material;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MODEL_ICONS: Record<ModelType, React.ReactNode> = {
  linear_regression: <TrendingUp size={20} />,
  decision_tree: <GitBranch size={20} />,
  random_forest: <Trees size={20} />,
};

const PRINT_TYPE_OPTIONS: { value: PrintType; label: string }[] = [
  { value: 'digital', label: 'Digital' },
  { value: 'offset', label: 'Offset' },
  { value: 'gran_formato', label: 'Gran Formato' },
  { value: 'serigrafia', label: 'Serigrafía' },
];

const SIZE_OPTIONS: { value: Size; label: string }[] = [
  { value: 'A4', label: 'A4' },
  { value: 'A3', label: 'A3' },
  { value: 'A2', label: 'A2' },
  { value: 'A1', label: 'A1' },
  { value: 'A0', label: 'A0' },
  { value: 'personalizado', label: 'Personalizado' },
];

const MATERIAL_OPTIONS: { value: Material; label: string }[] = [
  { value: 'papel_bond', label: 'Papel Bond' },
  { value: 'papel_couche', label: 'Papel Couché' },
  { value: 'cartulina', label: 'Cartulina' },
  { value: 'vinilo', label: 'Vinilo' },
  { value: 'lona', label: 'Lona' },
];

const ALGO_DETAILS: Record<ModelType, { formula: string; pros: string[]; cons: string[] }> = {
  linear_regression: {
    formula: 'ŷ = w₀·tipo + w₁·tamaño + w₂·cantidad + w₃·material + b',
    pros: ['Muy interpretable', 'Entrena muy rápido', 'No sobreajusta fácilmente'],
    cons: ['Asume relaciones lineales', 'No captura interacciones entre variables'],
  },
  decision_tree: {
    formula: 'IF cantidad > X AND tipo = Y THEN horas = Z',
    pros: ['Captura no linealidades', 'Reglas interpretables', 'Sin necesidad de normalización'],
    cons: ['Propenso a sobreajuste', 'Alta varianza con datos escasos'],
  },
  random_forest: {
    formula: 'ŷ = (1/15) · Σ Árbolᵢ(x)  [15 árboles con bootstrap]',
    pros: ['Reduce sobreajuste por bagging', 'Importancia de variables robusta', 'Alta precisión general'],
    cons: ['Menos interpretable', 'Más costoso computacionalmente'],
  },
};

// ── Metric quality helpers ────────────────────────────────────────────────────

function r2Color(r2: number) {
  if (r2 >= 0.9) return 'text-emerald-600';
  if (r2 >= 0.7) return 'text-amber-600';
  return 'text-red-600';
}

function r2Label(r2: number) {
  if (r2 >= 0.9) return 'Excelente';
  if (r2 >= 0.7) return 'Bueno';
  if (r2 > 0) return 'Regular';
  return 'Sin datos';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MLModels() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [models, setModels] = useState<TrainedModels>({ lr: null, dt: null, rf: null, trainedOn: 0 });
  const [activeTab, setActiveTab] = useState<ModelType>('random_forest');
  const [simInput, setSimInput] = useState<SimInput>({
    print_type: 'digital',
    size: 'A4',
    quantity: '1000',
    material: 'papel_bond',
  });

  async function fetchAndTrain() {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    const loaded = (data as Order[]) || [];
    setOrders(loaded);
    setLoading(false);

    setTraining(true);
    // Yield to browser before heavy computation
    await new Promise(r => setTimeout(r, 30));
    const trained = trainModels(loaded);
    setModels(trained);
    setTraining(false);
  }

  useEffect(() => { fetchAndTrain(); }, []);

  const metrics = useMemo(() => getAllMetrics(models, orders), [models, orders]);
  const bestModel = useMemo(() => metrics.reduce((best, m) => m.r2 > best.r2 ? m : best, metrics[0]), [metrics]);

  const completedCount = orders.filter(o => o.status === 'completado' && o.actual_hours).length;
  const qty = parseInt(simInput.quantity) || 0;
  const simPredictions = useMemo(() => {
    if (qty < 1) return null;
    return {
      linear_regression: predictWithModel(models, 'linear_regression', simInput.print_type, simInput.size, qty, simInput.material),
      decision_tree: predictWithModel(models, 'decision_tree', simInput.print_type, simInput.size, qty, simInput.material),
      random_forest: predictWithModel(models, 'random_forest', simInput.print_type, simInput.size, qty, simInput.material),
    };
  }, [models, simInput, qty]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin text-sky-600 mx-auto mb-4" size={40} />
          <p className="text-gray-600 font-medium">Cargando datos de entrenamiento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
            <div className="bg-gradient-to-br from-sky-600 to-sky-700 p-2.5 rounded-xl shadow-lg">
              <Brain size={28} className="text-white" />
            </div>
            Modelos de ML
          </h1>
          <p className="text-gray-500 mt-2">
            Regresión Lineal · Árbol de Decisión · Random Forest entrenados con tus datos reales
          </p>
        </div>
        <button
          onClick={fetchAndTrain}
          disabled={training}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all"
        >
          <RefreshCw size={15} className={training ? 'animate-spin' : ''} />
          Re-entrenar
        </button>
      </div>

      {/* Training status banner */}
      {completedCount < 5 ? (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Datos insuficientes para entrenar</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Necesitas al menos <strong>5 pedidos completados con horas reales</strong>. Actualmente tienes{' '}
              <strong>{completedCount}</strong>. El simulador usa el modelo de respaldo por defecto.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          {training ? (
            <Loader2 size={18} className="text-emerald-600 animate-spin shrink-0" />
          ) : (
            <Zap size={18} className="text-emerald-600 shrink-0" />
          )}
          <p className="text-sm font-semibold text-emerald-800">
            {training
              ? 'Entrenando modelos...'
              : `Modelos entrenados con ${models.trainedOn} pedidos completados — mejor modelo: ${bestModel.name} (R² = ${bestModel.r2})`}
          </p>
        </div>
      )}

      {/* Model Cards — Comparison */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Comparación de Métricas</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {metrics.map(m => {
            const isBest = m.type === bestModel.type && completedCount >= 5;
            return (
              <div
                key={m.type}
                onClick={() => setActiveTab(m.type)}
                className={`relative bg-white rounded-2xl border-2 shadow-sm cursor-pointer transition-all hover:shadow-lg ${
                  activeTab === m.type ? 'border-sky-500 shadow-sky-100' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {isBest && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-600 text-white text-xs font-bold rounded-full shadow">
                    Mejor Modelo
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl text-white" style={{ backgroundColor: m.color }}>
                      {MODEL_ICONS[m.type]}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{m.name}</h3>
                      <p className="text-xs text-gray-500">
                        {m.type === 'linear_regression' ? 'Gradiente Descendiente' :
                         m.type === 'decision_tree' ? 'CART · Prof. máx. 5' : '15 árboles · Bootstrap'}
                      </p>
                    </div>
                  </div>

                  {/* Metric grid */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'R²', value: m.r2, good: true },
                      { label: 'MAE (h)', value: m.mae, good: false },
                      { label: 'RMSE (h)', value: m.rmse, good: false },
                    ].map(metric => (
                      <div key={metric.label} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                        <div className={`text-lg font-black ${metric.good ? r2Color(m.r2) : 'text-gray-700'}`}>
                          {metric.value || '—'}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">{metric.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* R² progress bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500 font-medium">Precisión (R²)</span>
                      <span className={`text-xs font-bold ${r2Color(m.r2)}`}>{r2Label(m.r2)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-700"
                        style={{ width: `${m.r2 * 100}%`, backgroundColor: m.color }}
                      />
                    </div>
                  </div>

                  {activeTab === m.type && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <ChevronRight size={12} />
                        Ver importancia de variables abajo
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Importance — for selected model */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl text-white" style={{ backgroundColor: metrics.find(m => m.type === activeTab)?.color }}>
              {MODEL_ICONS[activeTab]}
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Importancia de Variables</h2>
              <p className="text-xs text-gray-500">{metrics.find(m => m.type === activeTab)?.name}</p>
            </div>
          </div>
          {/* Model tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {metrics.map(m => (
              <button
                key={m.type}
                onClick={() => setActiveTab(m.type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === m.type ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {m.type === 'linear_regression' ? 'Reg. Lineal' : m.type === 'decision_tree' ? 'Árbol' : 'Random Forest'}
              </button>
            ))}
          </div>
        </div>
        <div className="p-6 space-y-5">
          {FEATURE_NAMES.map((name, i) => {
            const activeMetrics = metrics.find(m => m.type === activeTab)!;
            const imp = activeMetrics?.featureImportance?.[i] ?? 0;
            return (
              <div key={name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: FEATURE_COLORS[i] }} />
                    <span className="text-sm font-semibold text-gray-700">{name}</span>
                  </div>
                  <span className="text-sm font-black text-gray-900">{imp}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all duration-700"
                    style={{ width: `${imp}%`, backgroundColor: FEATURE_COLORS[i] }}
                  />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
            {activeTab === 'linear_regression'
              ? 'Basado en el valor absoluto de los coeficientes del modelo (normalizados).'
              : activeTab === 'decision_tree'
              ? 'Basado en la reducción de MSE ponderada por número de muestras en cada nodo de división.'
              : 'Promedio de la reducción de MSE ponderada a través de los 15 árboles del ensemble.'}
          </p>
        </div>
      </div>

      {/* Prediction Simulator */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="bg-sky-600 p-2 rounded-xl">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Simulador de Predicción</h2>
            <p className="text-xs text-gray-500">Compara los 3 modelos con los mismos parámetros de entrada</p>
          </div>
        </div>
        <div className="p-6 grid lg:grid-cols-2 gap-8">
          {/* Inputs */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Tipo de impresión
                </label>
                <select
                  value={simInput.print_type}
                  onChange={e => setSimInput(s => ({ ...s, print_type: e.target.value as PrintType }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                >
                  {PRINT_TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Tamaño
                </label>
                <select
                  value={simInput.size}
                  onChange={e => setSimInput(s => ({ ...s, size: e.target.value as Size }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                >
                  {SIZE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Material
                </label>
                <select
                  value={simInput.material}
                  onChange={e => setSimInput(s => ({ ...s, material: e.target.value as Material }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                >
                  {MATERIAL_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  value={simInput.quantity}
                  onChange={e => setSimInput(s => ({ ...s, quantity: e.target.value }))}
                  placeholder="Ej: 5000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                />
              </div>
            </div>
            {completedCount < 5 && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                Usando modelo de respaldo (pre-entrenado). Con {5 - completedCount} pedido{5 - completedCount !== 1 ? 's' : ''} completado{5 - completedCount !== 1 ? 's' : ''} más se activarán los modelos reales.
              </p>
            )}
          </div>

          {/* Predictions */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Predicciones (horas de producción)</p>
            {simPredictions ? (
              <>
                {metrics.map(m => {
                  const pred = simPredictions[m.type];
                  const maxPred = Math.max(...Object.values(simPredictions));
                  return (
                    <div key={m.type} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg text-white" style={{ backgroundColor: m.color }}>
                            {MODEL_ICONS[m.type]}
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{m.name}</span>
                          {completedCount >= 5 && m.type === bestModel.type && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">mejor</span>
                          )}
                        </div>
                        <span className="text-2xl font-black" style={{ color: m.color }}>
                          {pred}h
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700"
                          style={{ width: `${(pred / (maxPred || 1)) * 100}%`, backgroundColor: m.color }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-gray-400 text-center">
                  Variación entre modelos:{' '}
                  <span className="font-semibold text-gray-600">
                    {(Math.max(...Object.values(simPredictions)) - Math.min(...Object.values(simPredictions))).toFixed(1)}h
                  </span>
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                Ingresa una cantidad válida para simular
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Algorithm Details */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Detalles de los Algoritmos</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {metrics.map(m => {
            const details = ALGO_DETAILS[m.type];
            return (
              <div key={m.type} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3" style={{ borderTopWidth: 4, borderTopColor: m.color }}>
                  <div className="p-2 rounded-xl text-white" style={{ backgroundColor: m.color }}>
                    {MODEL_ICONS[m.type]}
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">{m.name}</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                    <p className="text-xs text-gray-500 font-mono leading-relaxed">{details.formula}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-700 uppercase mb-1.5">Ventajas</p>
                    <ul className="space-y-1">
                      {details.pros.map((pro, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-600 uppercase mb-1.5">Limitaciones</p>
                    <ul className="space-y-1">
                      {details.cons.map((con, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className={`text-lg font-black ${r2Color(m.r2)}`}>{m.r2 || '—'}</div>
                      <div className="text-xs text-gray-500">R²</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-gray-700">{m.mae || '—'}</div>
                      <div className="text-xs text-gray-500">MAE (h)</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Technical note */}
      <div className="bg-gradient-to-br from-sky-50 to-emerald-50 border border-sky-200 rounded-2xl p-6">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Brain size={18} className="text-sky-600" />
          Notas técnicas
        </h3>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-700">
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2"><span className="text-sky-600 shrink-0">▸</span> Los modelos se entrenan <strong>en el navegador</strong> usando los pedidos completados con horas reales.</li>
            <li className="flex items-start gap-2"><span className="text-sky-600 shrink-0">▸</span> Las métricas (R², MAE, RMSE) se calculan <strong>sobre los mismos datos de entrenamiento</strong> (in-sample).</li>
          </ul>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2"><span className="text-sky-600 shrink-0">▸</span> Regresión Lineal usa <strong>gradiente descendiente</strong> (3000 epochs, lr=0.05) con normalización min-max.</li>
            <li className="flex items-start gap-2"><span className="text-sky-600 shrink-0">▸</span> Random Forest usa <strong>15 árboles CART</strong> con profundidad máxima 5 y bootstrap determinista por semilla.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}