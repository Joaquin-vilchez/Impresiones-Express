import { Printer, LayoutDashboard, ClipboardList, PlusCircle } from 'lucide-react';

type Page = 'dashboard' | 'orders' | 'new-order';

interface NavbarProps {
  current: Page;
  onChange: (page: Page) => void;
}

export default function Navbar({ current, onChange }: NavbarProps) {
  const links: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'orders', label: 'Pedidos', icon: <ClipboardList size={18} /> },
    { id: 'new-order', label: 'Nuevo Pedido', icon: <PlusCircle size={18} /> },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-sky-600 p-2 rounded-lg">
              <Printer size={20} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-900 text-lg leading-tight block">
                Impresiones Express
              </span>
              <span className="text-xs text-sky-600 font-medium">Sistema Inteligente ML</span>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {links.map((link) => (
              <button
                key={link.id}
                onClick={() => onChange(link.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  current === link.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {link.icon}
                <span className="hidden sm:inline">{link.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
