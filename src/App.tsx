import { useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import NewOrder from './pages/NewOrder';

type Page = 'dashboard' | 'orders' | 'new-order';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar current={page} onChange={setPage} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {page === 'dashboard' && <Dashboard />}
        {page === 'orders' && <Orders />}
        {page === 'new-order' && <NewOrder onSuccess={() => setPage('orders')} />}
      </main>
    </div>
  );
}
