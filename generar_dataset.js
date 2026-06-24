// generar_dataset.js
import * as XLSX from 'xlsx';

// AHORA USAMOS EXACTAMENTE LOS NOMBRES TÉCNICOS QUE PIDE SUPABASE
const tipos = ['digital', 'offset', 'gran_formato', 'serigrafia'];
const tamanos = ['A4', 'A3', 'A2', 'A1', 'A0', 'personalizado'];
const materiales = ['papel_bond', 'papel_couche', 'cartulina', 'vinilo', 'lona'];

const nombres = [
  'Joselin', 'Noemi', 'Jesus', 'Alejandro', 'Sofia', 'Kristel',
  'Clínica Rene', 'ModoDía', 'Smart Fit', 'Tottus', 'UTP'
];

const data = [];

// Generamos 100 registros con el formato estricto
for (let i = 0; i < 100; i++) {
  const clienteAleatorio = nombres[Math.floor(Math.random() * nombres.length)];
  data.push({
    Cliente: `${clienteAleatorio} ${Math.floor(Math.random() * 100) + 1}`,
    Tipo: tipos[Math.floor(Math.random() * tipos.length)],
    Tamaño: tamanos[Math.floor(Math.random() * tamanos.length)],
    Cantidad: Math.floor(Math.random() * 5000) + 10,
    Material: materiales[Math.floor(Math.random() * materiales.length)]
  });
}

// Creamos el Excel
const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos');

// Guardamos el archivo con un nuevo nombre
XLSX.writeFile(workbook, 'dataset_impresiones_100_estricto.xlsx');
console.log('✅ Archivo dataset_impresiones_100_estricto.xlsx generado con éxito!');