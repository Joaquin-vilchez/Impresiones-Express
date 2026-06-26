import { Printer, LayoutDashboard, ClipboardList, PlusCircle, BarChart3, Brain, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

// 1. Agregamos 'landing' y 'auth' para que coincida exactamente con App.tsx
type Page = 'landing' | 'dashboard' | 'orders' | 'new-order' | 'reports' | 'ml-models' | 'auth';

interface NavbarProps {
  current: Page;
  onChange: (page: Page) => void;
  // 2. Cambiamos 'any' por el tipo correcto de Supabase
  user: User | null; 
}

export default function Navbar({ current, onChange, user }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'orders', label: 'Pedidos', icon: <ClipboardList size={18} /> },
    { id: 'new-order', label: 'Nuevo Pedido', icon: <PlusCircle size={18} /> },
    { id: 'reports', label: 'Reportes', icon: <BarChart3 size={18} /> },
    { id: 'ml-models', label: 'Modelos ML', icon: <Brain size={18} /> },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="bg-gradient-to-br from-sky-600 to-sky-700 p-2 rounded-xl shadow-lg">
              <Printer size={20} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-900 text-lg leading-tight block">
                Impresiones Express
              </span>
              <span className="text-xs text-sky-600 font-semibold">Sistema Inteligente ML</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <button
                key={link.id}
                onClick={() => onChange(link.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  current === link.id
                    ? 'bg-sky-600 text-white shadow-md scale-105'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {link.icon}
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white text-sm font-bold">
                {user?.email?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-gray-600 hidden lg:inline">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Salir</span>
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-2 animate-in fade-in slide-in-from-top-2">
            {links.map((link) => (
              <button
                key={link.id}
                onClick={() => {
                  onChange(link.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  current === link.id
                    ? 'bg-sky-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {link.icon}
                {link.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}