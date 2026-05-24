import { ArrowRight, Zap, TrendingUp, BarChart3, Clock, Printer, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface LandingProps {
  onNavigate: (page: string) => void;
  // ✨ Corrección: Cambiamos 'any' por 'unknown' para tipado seguro
  user: unknown;
}

export default function Landing({ onNavigate, user }: LandingProps) {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const features = [
    {
      icon: <Zap size={24} />,
      title: 'Predicción en Tiempo Real',
      desc: 'IA que predice tiempos de producción con 92% de precisión',
      color: 'sky',
    },
    {
      icon: <TrendingUp size={24} />,
      title: 'Optimización Automática',
      desc: 'Mejora continua con Machine Learning a partir de tus datos',
      color: 'emerald',
    },
    {
      icon: <BarChart3 size={24} />,
      title: 'Análisis Profundo',
      desc: 'Reportes y dashboards con métricas clave del negocio',
      color: 'amber',
    },
    {
      icon: <Clock size={24} />,
      title: 'Gestión de Tiempos',
      desc: 'Controla cada etapa del proceso de producción',
      color: 'violet',
    },
  ];

  const benefits = [
    { number: '35%', label: 'Reducción de retrasos', icon: '📉' },
    { number: '50h/mes', label: 'Tiempo ahorrado', icon: '⏱️' },
    { number: '92%', label: 'Precisión del ML', icon: '🎯' },
    { number: '10x', label: 'ROI en 6 meses', icon: '💰' },
  ];

  const testimonials = [
    {
      name: 'Carlos Mendez',
      role: 'Gerente de Producción',
      company: 'PrintFlow Solutions',
      text: 'La clínica redujo nuestros retrasos en 40%. El ML predice con increíble precisión.',
      avatar: '👤',
    },
    {
      name: 'Maria Garcia',
      role: 'CEO',
      company: 'Gráficos Premium',
      text: 'Es como tener un experto en planificación 24/7. Ha transformado nuestra operación.',
      avatar: '👩‍💼',
    },
    {
      name: 'Roberto Silva',
      role: 'Director Operativo',
      company: 'Industrial Print Co',
      text: 'La mejor inversión que hicimos. Ya no tenemos sorpresas con los tiempos.',
      avatar: '👨‍💼',
    },
  ];

  const faqItems = [
    {
      q: '¿Cómo funciona la predicción de ML?',
      a: 'Nuestro modelo Random Forest analiza 4 variables clave: tipo de impresión, tamaño, cantidad y material. Con tus datos históricos mejora constantemente.',
    },
    {
      q: '¿Qué nivel de precisión tiene?',
      a: 'Con datos de entrenamiento típicos alcanzamos 85-95% de precisión. Mejora más con datos históricos de tu empresa.',
    },
    {
      q: '¿Se integra con mi sistema actual?',
      a: 'Sí, ofrecemos APIs REST y webhooks para integración con cualquier sistema. También exporta reportes en PDF y Excel.',
    },
    {
      q: '¿Qué soporte ofrecen?',
      a: 'Soporte 24/7, documentación completa, webinars de capacitación y consultoría gratuita para planes Enterprise.',
    },
  ];

  const plans = [
    {
      name: 'Starter',
      price: 'Gratis',
      desc: 'Perfecto para probar',
      features: ['Hasta 100 pedidos/mes', 'Dashboard básico', 'Email support', 'Modelo ML estándar'],
      cta: 'Comenzar gratis',
      highlight: false,
    },
    {
      name: 'Professional',
      price: 'S/ 99', // <-- ¡AQUÍ SE CAMBIÓ LA MONEDA A SOLES!
      desc: '/mes - Lo más popular',
      features: [
        'Pedidos ilimitados',
        'Reportes avanzados',
        'API access',
        'ML personalizado',
        'Soporte prioritario',
        'Webhooks',
      ],
      cta: 'Comenzar ahora',
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      desc: 'Solución personalizada',
      features: [
        'Todo en Professional',
        'Consultoría dedicada',
        'Integración custom',
        'SLA garantizado',
        'Single sign-on',
        'Capacitación ilimitada',
      ],
      cta: 'Contactar ventas',
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header Hero */}
      <header className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-transparent to-emerald-50 -z-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl -z-10 animate-pulse" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100/80 backdrop-blur-sm rounded-full mb-8 border border-sky-200/50 animate-in fade-in slide-in-from-top">
            <Zap size={16} className="text-sky-600" />
            <span className="text-sm font-semibold text-sky-700">Nuevo: Integraciones con Zapier 🚀</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 mb-6 leading-tight animate-in fade-in slide-in-from-bottom-4">
            Predice Tiempos de{' '}
            <span className="bg-gradient-to-r from-sky-600 to-emerald-600 bg-clip-text text-transparent">
              Producción con IA
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 delay-100">
            Sistema inteligente basado en Machine Learning para optimizar tu clínica. Reduce retrasos, mejora la planificación y aumenta la rentabilidad.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-in fade-in slide-in-from-bottom-4 delay-200">
            {user ? (
              <button
                onClick={() => onNavigate('dashboard')}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-sky-600 to-sky-700 text-white rounded-xl font-bold hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Ir al Dashboard <ArrowRight size={20} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('auth')}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-sky-600 to-sky-700 text-white rounded-xl font-bold hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  Comenzar Gratis <ArrowRight size={20} />
                </button>
                <button className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:border-gray-400 hover:bg-gray-50 transition-all duration-300">
                  Ver Demo
                </button>
              </>
            )}
          </div>

          <div className="text-sm text-gray-500">
            Sin tarjeta de crédito. Acceso instantáneo.
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
            Características Principales
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="p-8 rounded-2xl border border-gray-200/50 hover:border-gray-300 bg-white/80 hover:shadow-xl transition-all duration-300 hover:translate-y-[-4px] group"
              >
                <div
                  className={`inline-flex p-3 rounded-xl bg-${feature.color}-100 text-${feature.color}-600 mb-4 group-hover:scale-110 transition-transform`}
                >
                  {feature.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
            Resultados Probados
          </h2>

          <div className="grid md:grid-cols-4 gap-6">
            {benefits.map((b, i) => (
              <div
                key={i}
                className="text-center p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 hover:shadow-lg transition-all"
              >
                <div className="text-5xl mb-3">{b.icon}</div>
                <div className="text-4xl font-black text-sky-600 mb-2">{b.number}</div>
                <div className="text-gray-600 font-medium">{b.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-sky-50 to-emerald-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
            Lo que dicen nuestros clientes
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="p-8 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-2xl">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">
                      {t.role} @ {t.company}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 italic">"{t.text}"</p>
                <div className="flex gap-1 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-400">
                      ⭐
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
            Planes para Todos los Tamaños
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`rounded-2xl p-8 transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-gradient-to-br from-sky-600 to-sky-700 text-white shadow-2xl scale-105 border-0'
                    : 'bg-white border border-gray-200 text-gray-900 hover:shadow-xl'
                }`}
              >
                <h3 className={`text-2xl font-bold mb-1 ${plan.highlight ? 'text-white' : ''}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-6 ${plan.highlight ? 'text-sky-100' : 'text-gray-500'}`}>
                  {plan.desc}
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-black">{plan.price}</span>
                </div>
                <button
                  className={`w-full py-3 rounded-xl font-bold mb-6 transition-all ${
                    plan.highlight
                      ? 'bg-white text-sky-600 hover:bg-sky-50'
                      : 'bg-sky-600 text-white hover:bg-sky-700'
                  }`}
                >
                  {plan.cta}
                </button>
                <ul className="space-y-3">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <span className={`${plan.highlight ? 'text-sky-200' : 'text-emerald-500'}`}>
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
            Preguntas Frecuentes
          </h2>

          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden transition-all hover:shadow-md"
              >
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-bold text-gray-900 text-left">{item.q}</span>
                  <ChevronDown
                    size={20}
                    className={`text-gray-600 transition-transform ${
                      faqOpen === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {faqOpen === i && (
                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 animate-in fade-in slide-in-from-top">
                    <p className="text-gray-600">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-sky-600 to-emerald-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            ¿Listo para transformar tu producción?
          </h2>
          <p className="text-xl mb-8 text-sky-100">
            Únete a 500+ empresas que ya optimizan con Impresiones Express
          </p>
          <button
            onClick={() => onNavigate('auth')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-sky-600 rounded-xl font-bold hover:scale-105 transition-transform shadow-xl"
          >
            Comenzar Gratis Hoy <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Printer size={20} className="text-sky-400" />
                <span className="font-bold text-white">Impresiones Express</span>
              </div>
              <p className="text-sm text-gray-400">Optimización de producción con IA</p>
            </div>
            {['Producto', 'Empresa', 'Legal'].map((col, i) => (
              <div key={i}>
                <h4 className="font-bold text-white mb-4">{col}</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="#" className="hover:text-sky-400 transition-colors">
                      Características
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-sky-400 transition-colors">
                      Precios
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-sky-400 transition-colors">
                      Blog
                    </a>
                  </li>
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2026 Impresiones Express. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}