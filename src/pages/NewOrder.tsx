import { useState } from 'react';
import { Printer, Zap, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase, type PrintType, type Size, type Material } from '../lib/supabase';
import { predictProductionHours } from '../lib/mlModel';

const printTypes: { value: PrintType; label: string; desc: string }[] = [
  { value: 'digital', label: 'Digital', desc: 'Impresion digital de alta resolucion' },
  { value: 'offset', label: 'Offset', desc: 'Para grandes tirajes con maxima calidad' },
  { value: 'gran_formato', label: 'Gran Formato', desc: 'Banners, lonas y carteles grandes' },
  { value: 'serigrafia', label: 'Serigrafía', desc: 'Impresion en vinilo y superficies especiales' },
];

const sizes: { value: Size; label: string }[] = [
  { value: 'A4', label: 'A4 (21 x 29.7 cm)' },
  { value: 'A3', label: 'A3 (29.7 x 42 cm)' },
  { value: 'A2', label: 'A2 (42 x 59.4 cm)' },
  { value: 'A1', label: 'A1 (59.4 x 84.1 cm)' },
  { value: 'A0', label: 'A0 (84.1 x 118.9 cm)' },
  { value: 'personalizado', label: 'Personalizado' },
];

const materials: { value: Material; label: string }[] = [
  { value: 'papel_bond', label: 'Papel Bond' },
  { value: 'papel_couche', label: 'Papel Couche' },
  { value: 'cartulina', label: 'Cartulina' },
  { value: 'vinilo', label: 'Vinilo' },
  { value: 'lona', label: 'Lona' },
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

  const qty = parseInt(form.quantity) || 0;

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setPrediction(null);
    setSuccess(false);
    setError('');
  }

  function handlePredict() {
    if (qty < 1) {
      setError('Ingresa una cantidad valida para predecir.');
      return;
    }
    const hours = predictProductionHours(form.print_type, form.size, qty, form.material);
    setPrediction(hours);
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

    const { error: dbError } = await supabase.from('orders').insert({
      client_name: form.client_name.trim(),
      print_type: form.print_type,
      size: form.size,
      quantity: qty,
      material: form.material,
      status: 'pendiente',
      predicted_hours: hours,
    });

    setSubmitting(false);

    if (dbError) {
      setError('Error al guardar el pedido. Intenta de nuevo.');
    } else {
      setSuccess(true);
      setForm({
        client_name: '',
        print_type: 'digital',
        size: 'A4',
        quantity: '',
        material: 'papel_bond',
      });
      setPrediction(null);
      setTimeout(onSuccess, 1800);
    }
  }

  const urgencyLabel =
    prediction === null
      ? null
      : prediction <= 2
      ? { text: 'Rapido', color: 'emerald' }
      : prediction <= 6
      ? { text: 'Normal', color: 'sky' }
      : { text: 'Largo plazo', color: 'amber' };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Pedido</h1>
        <p className="text-gray-500 mt-1">
          El modelo ML predecira automaticamente el tiempo de produccion
        </p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
          <div>
            <p className="font-medium text-emerald-800">Pedido registrado exitosamente</p>
            <p className="text-sm text-emerald-600">Redirigiendo a la lista de pedidos...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="text-red-500 shrink-0" size={20} />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="bg-sky-600 p-2 rounded-lg">
            <Printer size={16} className="text-white" />
          </div>
          <h2 className="font-semibold text-gray-900">Datos del Pedido</h2>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre del Cliente
            </label>
            <input
              type="text"
              value={form.client_name}
              onChange={(e) => handleChange('client_name', e.target.value)}
              placeholder="Ej: Empresa XYZ S.A."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-shadow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Impresion
            </label>
            <div className="grid grid-cols-2 gap-2">
              {printTypes.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => handleChange('print_type', pt.value)}
                  className={`text-left p-3 rounded-lg border transition-all duration-150 ${
                    form.print_type === pt.value
                      ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-500'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-800">{pt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{pt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tamanio</label>
              <select
                value={form.size}
                onChange={(e) => handleChange('size', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                {sizes.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cantidad</label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
                placeholder="Ej: 1000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tipo de Material
            </label>
            <div className="flex flex-wrap gap-2">
              {materials.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => handleChange('material', m.value)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all duration-150 ${
                    form.material === m.value
                      ? 'border-sky-500 bg-sky-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-sky-600" />
                <span className="text-sm font-medium text-gray-700">Prediccion ML</span>
              </div>
              <button
                type="button"
                onClick={handlePredict}
                disabled={qty < 1}
                className="text-xs px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Predecir tiempo
              </button>
            </div>

            {prediction !== null ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock size={20} className="text-sky-600" />
                  <span className="text-2xl font-bold text-gray-900">{prediction}h</span>
                  <span className="text-sm text-gray-500">estimadas</span>
                </div>
                {urgencyLabel && (
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full bg-${urgencyLabel.color}-100 text-${urgencyLabel.color}-700 font-medium border border-${urgencyLabel.color}-200`}
                  >
                    {urgencyLabel.text}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                Completa los campos y presiona "Predecir tiempo" para obtener una estimacion
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {submitting ? 'Guardando...' : 'Registrar Pedido'}
          </button>
        </div>
      </form>
    </div>
  );
}