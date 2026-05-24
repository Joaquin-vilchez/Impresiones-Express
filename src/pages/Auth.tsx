import { useState } from 'react';
// ✨ Corrección 1: Quitamos 'ArrowLeft' de la lista porque no se estaba usando
import { Mail, Lock, Printer, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onSuccess: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden');
          setLoading(false);
          return;
        }

        const { error: signupError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signupError) {
          setError(signupError.message);
        } else {
          setSuccess('Cuenta creada exitosamente. Iniciando sesión...');
          setTimeout(() => {
            setMode('login');
            setPassword('');
            setConfirmPassword('');
          }, 2000);
        }
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) {
          setError(loginError.message);
        } else {
          setSuccess('Iniciando sesión...');
          setTimeout(onSuccess, 1500);
        }
      }
    } catch (err: unknown) {
      // ✨ Corrección 2: Cambiamos 'any' por 'unknown' y validamos si es un Error real
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al procesar la solicitud');
      }
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-sky-600 to-sky-700 p-3 rounded-2xl shadow-lg">
              <Printer size={24} className="text-white" />
            </div>
            <div className="text-left">
              <h1 className="font-bold text-gray-900 text-xl leading-tight">
                Impresiones Express
              </h1>
              <p className="text-xs text-sky-600 font-semibold">Sistema Inteligente ML</p>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            {mode === 'login' ? 'Inicia Sesión' : 'Crear Cuenta'}
          </h2>
          <p className="text-center text-gray-600 text-sm mb-8">
            {mode === 'login'
              ? 'Accede a tu dashboard y comienza a optimizar'
              : 'Únete a Impresiones Express en 30 segundos'}
          </p>

          {/* Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom">
              <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
              <p className="text-emerald-700 text-sm">{success}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Confirm Password (Signup) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-sky-600 to-sky-700 text-white rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="text-center text-sm text-gray-600 mt-6">
            {mode === 'login' ? (
              <>
                ¿No tienes cuenta?{' '}
                <button
                  onClick={() => {
                    setMode('signup');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-sky-600 font-bold hover:text-sky-700 transition-colors"
                >
                  Crear una
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{' '}
                <button
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-sky-600 font-bold hover:text-sky-700 transition-colors"
                >
                  Inicia sesión
                </button>
              </>
            )}
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-center text-sm text-sky-700">
          <p className="font-semibold mb-2">Prueba con credenciales demo:</p>
          <p className="text-xs text-sky-600 font-mono">demo@impresiones.com / Demo123!</p>
        </div>
      </div>
    </div>
  );
}