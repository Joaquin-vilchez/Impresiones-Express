import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js'; // 1. Agregamos esta importación
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import NewOrder from './pages/NewOrder';
import Reports from './pages/Reports';
import Auth from './pages/Auth';

// 2. Exportamos el tipo para que lo puedas usar en Navbar.tsx y otros
export type Page = 'landing' | 'dashboard' | 'orders' | 'new-order' | 'reports' | 'auth';

export default function App() {
  const [page, setPage] = useState<Page>('landing');
  // 3. Le indicamos a TypeScript que el usuario puede ser tipo User o null
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setPage(session?.user ? 'dashboard' : 'landing');
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setPage(session?.user ? 'dashboard' : 'landing');
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 to-gray-50">
        <div className="animate-pulse text-sky-600 font-semibold">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {user && <Navbar current={page} onChange={setPage} user={user} />}
      <main className={user ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8' : ''}>
        {/* 4. Le asignamos un tipo (string o Page) al parámetro 'p' */}
        {page === 'landing' && <Landing onNavigate={(p: string) => setPage(p as Page)} user={user} />}
        {page === 'auth' && <Auth onSuccess={() => setPage('dashboard')} />}
        {user && page === 'dashboard' && <Dashboard />}
        {user && page === 'orders' && <Orders />}
        {user && page === 'new-order' && <NewOrder onSuccess={() => setPage('orders')} />}
        {user && page === 'reports' && <Reports />}
      </main>
    </div>
  );
}