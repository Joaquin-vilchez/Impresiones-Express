import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Loader2, Search, ArrowUpDown, Clock, CheckCircle2, Filter, X, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase, type Order, type Status, type PrintType, type Size, type Material } from '../lib/supabase';
import { predictProductionHours } from '../lib/mlModel'; // ¡Agregamos tu modelo!
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

const VALID_PRINT_TYPES: PrintType[] = ['digital', 'offset', 'gran_formato', 'serigrafia'];
const VALID_SIZES: Size[] = ['A4', 'A3', 'A2', 'A1', 'A0', 'personalizado'];
const VALID_MATERIALS: Material[] = ['papel_bond', 'papel_couche', 'cartulina', 'vinilo', 'lona'];
const VALID_STATUSES: Status[] = ['pendiente', 'en_produccion', 'completado'];

interface ImportRow {
  client_name: string;
  print_type: PrintType;
  size: Size;
  quantity: number;
  material: Material;
  status: Status;
  errors: string[];
}

// Normaliza el valor de una celda al key interno esperado
function normalizeKey(raw: string): string {
  return String(raw)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

function mapColumnName(header: string): string {
  const key = normalizeKey(header);
  const map: Record<string, string> = {
    cliente: 'client_name',
    client_name: 'client_name',
    nombre: 'client_name',
    tipo: 'print_type',
    print_type: 'print_type',
    tipo_de_impresion: 'print_type',
    impresion: 'print_type',
    tamano: 'size',
    tamanio: 'size',
    size: 'size',
    cantidad: 'quantity',
    quantity: 'quantity',
    cant: 'quantity',
    material: 'material',
    estado: 'status',
    status: 'status',
  };
  return map[key] ?? key;
}

function mapPrintType(raw: string): PrintType | null {
  const v = normalizeKey(raw);
  const map: Record<string, PrintType> = {
    digital: 'digital',
    offset: 'offset',
    gran_formato: 'gran_formato',
    gran_format: 'gran_formato',
    serigrafia: 'serigrafia',
    serigrafía: 'serigrafia',
  };
  return map[v] ?? null;
}

function mapMaterial(raw: string): Material | null {
  const v = normalizeKey(raw);
  const map: Record<string, Material> = {
    papel_bond: 'papel_bond',
    bond: 'papel_bond',
    papel_couche: 'papel_couche',
    couche: 'papel_couche',
    cartulina: 'cartulina',
    vinilo: 'vinilo',
    lona: 'lona',
  };
  return map[v] ?? null;
}

function mapStatus(raw: string): Status {
  const v = normalizeKey(raw);
  const map: Record<string, Status> = {
    pendiente: 'pendiente',
    en_produccion: 'en_produccion',
    en_producción: 'en_produccion',
    produccion: 'en_produccion',
    completado: 'completado',
    completada: 'completado',
    done: 'completado',
  };
  return map[v] ?? 'pendiente';
}

function parseRows(rawRows: Record<string, unknown>[]): ImportRow[] {
  return rawRows.map((raw) => {
    // Remap headers
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      row[mapColumnName(k)] = v;
    }

    const errors: string[] = [];

    const clientName = String(row['client_name'] ?? '').trim();
    if (!clientName) errors.push('Falta el nombre del cliente');

    const printTypeRaw = String(row['print_type'] ?? '').trim();
    const printType = mapPrintType(printTypeRaw);
    if (!printType) errors.push(`Tipo de impresión inválido: "${printTypeRaw}". Válidos: ${VALID_PRINT_TYPES.join(', ')}`);

    const sizeRaw = String(row['size'] ?? '').trim();
    const matchedSize = VALID_SIZES.find((s) => s.toLowerCase() === sizeRaw.toLowerCase());
    if (!matchedSize) errors.push(`Tamaño inválido: "${sizeRaw}". Válidos: ${VALID_SIZES.join(', ')}`);

    const quantityRaw = row['quantity'];
    const quantity = typeof quantityRaw === 'number' ? Math.round(quantityRaw) : parseInt(String(quantityRaw ?? ''), 10);
    if (isNaN(quantity) || quantity < 1) errors.push('Cantidad debe ser un número mayor a 0');

    const materialRaw = String(row['material'] ?? '').trim();
    const material = mapMaterial(materialRaw);
    if (!material) errors.push(`Material inválido: "${materialRaw}". Válidos: ${VALID_MATERIALS.join(', ')}`);

    const status = row['status'] ? mapStatus(String(row['status'])) : 'pendiente';

    return {
      client_name: clientName,
      print_type: printType ?? 'digital',
      size: (matchedSize as Size) ?? 'A4',
      quantity: isNaN(quantity) ? 0 : quantity,
      material: material ?? 'papel_bond',
      status,
      errors,
    };
  });
}

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

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState<{ success: number; failed: number } | null>(null);

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      if (rawRows.length === 0) return;
      const rows = parseRows(rawRows);
      setImportRows(rows);
      setImportDone(null);
      setShowImportModal(true);
    };
    reader.readAsArrayBuffer(file);
  }

  async function confirmImport() {
    setImporting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const validRows = importRows.filter((r) => r.errors.length === 0);
    let success = 0;
    let failed = 0;

    // Insert in batches of 50
    for (let i = 0; i < validRows.length; i += 50) {
      // AQUÍ CALCULAMOS predicted_hours ANTES DE INSERTAR
      const batch = validRows.slice(i, i + 50).map(({ errors: _e, ...r }) => {
        const predicted_hours = predictProductionHours(r.print_type, r.size, r.quantity, r.material);
        return {
          ...r,
          predicted_hours, // Ahora mandamos el cálculo a la BD
          user_id: user?.id ?? null,
        };
      });

      const { error } = await supabase.from('orders').insert(batch);
      if (error) {
        console.error('Error insertando lote:', error);
        failed += batch.length;
      } else {
        success += batch.length;
      }
    }

    failed += importRows.filter((r) => r.errors.length > 0).length;

    setImporting(false);
    setImportDone({ success, failed });
    load();
  }

  function closeImportModal() {
    setShowImportModal(false);
    setImportRows([]);
    setImportDone(null);
  }

  const validCount = importRows.filter((r) => r.errors.length === 0).length;
  const errorCount = importRows.filter((r) => r.errors.length > 0).length;

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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Gestión de Pedidos</h1>
          <p className="text-gray-500 mt-1">{orders.length} pedidos en el sistema</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-200"
        >
          <Upload size={18} />
          Importar Excel
        </button>
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

      {/* Modal: Completar pedido */}
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
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
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

      {/* Modal: Importar Excel */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom-4">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-600 p-2 rounded-lg">
                  <Upload size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Importar desde Excel</h3>
                  <p className="text-xs text-gray-500">{importRows.length} filas detectadas</p>
                </div>
              </div>
              {!importing && (
                <button onClick={closeImportModal} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Result after import */}
            {importDone ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle size={32} className="text-emerald-600" />
                </div>
                <h4 className="text-xl font-bold text-gray-900">Importación Completada</h4>
                <div className="flex justify-center gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-black text-emerald-600">{importDone.success}</div>
                    <div className="text-sm text-gray-500">importados</div>
                  </div>
                  {importDone.failed > 0 && (
                    <div className="text-center">
                      <div className="text-3xl font-black text-red-500">{importDone.failed}</div>
                      <div className="text-sm text-gray-500">fallidos</div>
                    </div>
                  )}
                </div>
                <button
                  onClick={closeImportModal}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                {/* Summary bar */}
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <CheckCircle size={15} />
                    {validCount} válidas
                  </span>
                  {errorCount > 0 && (
                    <span className="flex items-center gap-1.5 text-red-600 font-semibold">
                      <AlertTriangle size={15} />
                      {errorCount} con errores (no se importarán)
                    </span>
                  )}
                  <span className="ml-auto text-gray-400 text-xs">
                    Columnas: cliente, tipo, tamaño, cantidad, material, estado (opcional)
                  </span>
                </div>

                {/* Preview table */}
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-2.5 px-3 font-bold text-gray-600 uppercase tracking-wider">#</th>
                        <th className="text-left py-2.5 px-3 font-bold text-gray-600 uppercase tracking-wider">Cliente</th>
                        <th className="text-left py-2.5 px-3 font-bold text-gray-600 uppercase tracking-wider">Tipo</th>
                        <th className="text-left py-2.5 px-3 font-bold text-gray-600 uppercase tracking-wider">Tamaño</th>
                        <th className="text-left py-2.5 px-3 font-bold text-gray-600 uppercase tracking-wider">Cant.</th>
                        <th className="text-left py-2.5 px-3 font-bold text-gray-600 uppercase tracking-wider">Material</th>
                        <th className="text-left py-2.5 px-3 font-bold text-gray-600 uppercase tracking-wider">Estado</th>
                        <th className="text-left py-2.5 px-3 font-bold text-gray-600 uppercase tracking-wider">OK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {importRows.map((row, i) => (
                        <tr key={i} className={row.errors.length > 0 ? 'bg-red-50' : 'hover:bg-gray-50'}>
                          <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                          <td className="py-2 px-3 font-medium text-gray-800 max-w-[120px] truncate">{row.client_name || '—'}</td>
                          <td className="py-2 px-3 text-gray-600">{printTypeLabel[row.print_type] ?? row.print_type}</td>
                          <td className="py-2 px-3 text-gray-600">{row.size}</td>
                          <td className="py-2 px-3 text-gray-700 font-semibold">{row.quantity || '—'}</td>
                          <td className="py-2 px-3 text-gray-600">{materialLabel[row.material] ?? row.material}</td>
                          <td className="py-2 px-3 text-gray-600 capitalize">{row.status}</td>
                          <td className="py-2 px-3">
                            {row.errors.length === 0 ? (
                              <CheckCircle size={14} className="text-emerald-500" />
                            ) : (
                              <div className="group relative">
                                <AlertTriangle size={14} className="text-red-500 cursor-help" />
                                <div className="hidden group-hover:block absolute right-0 bottom-5 bg-gray-900 text-white text-xs rounded-lg p-2 w-56 z-10 shadow-lg">
                                  {row.errors.map((e, ei) => <div key={ei}>• {e}</div>)}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center gap-3">
                  <p className="text-xs text-gray-500">
                    Solo se importarán las <strong>{validCount}</strong> filas válidas.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={closeImportModal}
                      className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmImport}
                      disabled={importing || validCount === 0}
                      className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white text-sm rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-md"
                    >
                      {importing ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Upload size={14} />
                          Importar {validCount} pedido{validCount !== 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}