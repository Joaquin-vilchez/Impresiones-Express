import { useState, useEffect } from 'react';
// ✨ Corrección 1: Eliminamos Zap y Clock que no se estaban usando
import { Printer, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { supabase, type PrintType, type Size, type Material } from '../lib/supabase';
import { predictProductionHours } from '../lib/mlModel';
import { notifyOrderCreated } from '../lib/edgeFunctions';

const printTypes: { value: PrintType; label: string; desc: string; icon: string }[] = [
  { value: 'digital', label: 'Digital', desc: 'Alta resolución', icon: '🖨️' },
  { value: 'offset', label: 'Offset', desc: 'Grandes tirajes', icon: '📰' },
  { value: 'gran_formato', label: 'Gran Formato', desc: 'Banners y carteles', icon: '🎨' },
  { value: 'serigrafia', label: 'Serigrafía', desc: 'Vinilo y especiales', icon: '👕' },
];

const sizes: { value: Size; label: string }[] = [
  { value: 'A4', label: 'A4' },
  { value: 'A3', label: 'A3' },
  { value: 'A2', label: 'A2' },
  { value: 'A1', label: 'A1' },
  { value: 'A0', label: 'A0' },
  { value: 'personalizado', label: 'Custom' },
];

const materials: { value: Material; label: string; icon: string }[] = [
  { value: 'papel_bond', label: 'Bond', icon: '📄' },
  { value: 'papel_couche', label: 'Couche', icon: '✨' },
  { value: 'cartulina', label: 'Cartulina', icon: '📦' },
  { value: 'vinilo', label: 'Vinilo', icon: '🎯' },
  { value: 'lona', label: 'Lona', icon: '🏠' },
];

interface FormState {
  client_name: string;
  print_type: PrintType;
  size: Size;
  quantity: string;
  material: Material;
}

export default function NewOrder({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<FormState>({
    client_name: '',
    print_type: 'digital',
    size: 'A4',
    quantity: '',
    material: 'papel_bond',
  });
  const [prediction, setPrediction] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [previewCost, setPreviewCost] = useState<number>(0);

  const qty = parseInt(form.quantity) || 0;

  // Auto-predict cuando cambia cantidad
  useEffect(() => {
    if (qty > 0) {
      const hours = predictProductionHours(form.print_type, form.size, qty, form.material);
      setPrediction(hours);
      setPreviewCost(Math.round(qty * 0.25 * 100) / 100);
    } else {
      setPrediction(null);
      setPreviewCost(0);
    }
  // ✨ Corrección 2: Agregamos 'qty' al arreglo de dependencias
  }, [qty, form.print_type, form.size, form.material]);

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_name.trim()) {
      setError('El nombre del cliente es requerido.');
      return;
    }
    if (qty < 1) {
      setError('La cantidad debe ser al menos 1.');
      return;
    }

    setSubmitting(true);
    setError('');

    const hours = prediction ?? predictProductionHours(form.print_type, form.size, qty, form.material);

    const { data, error: dbError } = await supabase.from('orders').insert({
      client_name: form.client_name.trim(),
      print_type: form.print_type,
      size: form.size,
      quantity: qty,
      material: form.material,
      status: 'pendiente',
      predicted_hours: hours,
    }).select().single();

    setSubmitting(false);

    if (dbError) {
      setError('Error al guardar el pedido. Intenta de nuevo.');
    } else {
      // Enviar notificación por Edge Function
      if (data?.id) {
        const { data: { user } } = await supabase.auth.getUser();
        await notifyOrderCreated(
          data.id,
          form.client_name.trim(),
          form.print_type,
          qty,
          hours,
          user?.email || 'no-reply@impresiones.com'
        );
      }

      setSuccess(true);
      setForm({
        client_name: '',
        print_type: 'digital',
        size: 'A4',
        quantity: '',
        material: 'papel_bond',
      });
      setPrediction(null);
      setPreviewCost(0);
      setTimeout(onSuccess, 1800);
    }
  }

  const urgencyLabel =
    prediction === null
      ? null
      : prediction <= 2
      ? { text: '⚡ Express', color: 'emerald' }
      : prediction <= 6
      ? { text: '📅 Estándar', color: 'sky' }
      : { text: '🚚 Largo Plazo', color: 'amber' };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900">Nuevo Pedido</h1>
        <p className="text-gray-500 mt-2">El modelo ML predice automáticamente el tiempo de producción</p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="text-emerald-600 shrink-0" size={24} />
          <div>
            <p className="font-bold text-emerald-800">Pedido registrado exitosamente</p>
            <p className="text-sm text-emerald-600">Redirigiendo a la lista de pedidos...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
          <AlertTriangle className="text-red-500 shrink-0" size={24} />
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Name Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <label className="block text-sm font-bold text-gray-700 mb-3">Nombre del Cliente *</label>
          <input
            type="text"
            value={form.client_name}
            onChange={(e) => handleChange('client_name', e.target.value)}
            placeholder="Ej: Empresa XYZ S.A."
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
            required
          />
        </div>

        {/* Print Type Selection */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <label className="block text-sm font-bold text-gray-700 mb-4">Tipo de Impresión *</label>
          <div className="grid grid-cols-2 gap-3">
            {printTypes.map((pt) => (
              <button
                key={pt.value}
                type="button"
                onClick={() => handleChange('print_type', pt.value)}
                className={`text-left p-4 rounded-xl border-2 transition-all duration-300 ${
                  form.print_type === pt.value
                    ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-300'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-2xl mb-2">{pt.icon}</div>
                <div className="text-sm font-bold text-gray-800">{pt.label}</div>
                <div className="text-xs text-gray-500 mt-1">{pt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Size and Quantity Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Size */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">Tamaño *</label>
            <div className="grid grid-cols-3 gap-2">
              {sizes.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleChange('size', s.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    form.size === s.value
                      ? 'bg-sky-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">Cantidad *</label>
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => handleChange('quantity', e.target.value)}
              placeholder="Ej: 1000"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white font-semibold text-lg"
              required
            />
          </div>
        </div>

        {/* Material Selection */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <label className="block text-sm font-bold text-gray-700 mb-4">Tipo de Material *</label>
          <div className="flex flex-wrap gap-2">
            {materials.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => handleChange('material', m.value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  form.material === m.value
                    ? 'border-2 border-sky-500 bg-sky-600 text-white shadow-lg scale-105'
                    : 'border-2 border-gray-200 text-gray-700 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="mr-2">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* ML Prediction Card */}
        {prediction !== null && (
          <div className="bg-gradient-to-br from-sky-50 to-emerald-50 rounded-2xl border-2 border-sky-200 p-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-sky-600 p-3 rounded-xl animate-pulse">
                  <Sparkles size={20} className="text-white" />
                </div>
                <span className="text-sm font-bold text-gray-700">Predicción ML</span>
              </div>
              <span className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-full">
                92% Precisión
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Time Prediction */}
              <div className="bg-white rounded-xl p-4 border border-sky-100">
                <div className="text-xs text-gray-600 font-medium mb-2">Tiempo Estimado</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-4xl font-black text-sky-600">{prediction}</div>
                  <div className="text-sm text-gray-600">horas</div>
                </div>
              </div>

              {/* Urgency Level */}
              <div className="bg-white rounded-xl p-4 border border-sky-100">
                <div className="text-xs text-gray-600 font-medium mb-2">Tipo de Servicio</div>
                <div className={`inline-block text-lg font-black px-3 py-1.5 rounded-lg bg-${urgencyLabel?.color}-100 text-${urgencyLabel?.color}-700`}>
                  {urgencyLabel?.text}
                </div>
              </div>

              {/* Estimated Cost */}
              <div className="bg-white rounded-xl p-4 border border-sky-100">
                <div className="text-xs text-gray-600 font-medium mb-2">Costo Estimado</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-black text-emerald-600">S/ {previewCost}</div>
                  <div className="text-sm text-gray-600">PEN</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !form.client_name || qty < 1}
            className="flex-1 py-4 bg-gradient-to-r from-sky-600 to-sky-700 text-white rounded-xl font-bold hover:shadow-xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
          >
            {submitting ? (
              <>
                <Printer className="animate-spin" size={20} />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                Registrar Pedido
              </>
            )}
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-medium mb-2">💡 Consejo:</p>
        <p>Los datos de tiempo real ayudan a mejorar la precisión del modelo. Asegúrate de registrar los tiempos reales después de completar el pedido.</p>
      </div>
    </div>
  );
}