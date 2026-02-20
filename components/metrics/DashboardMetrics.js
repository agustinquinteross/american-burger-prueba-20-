'use client'
import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Loader2, TrendingUp, ShoppingBag, Clock,
  Award, Wallet, CreditCard, Printer, List, Zap,
  MapPin, Package, ChevronUp, ChevronDown, Minus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function getDateRange(filter) {
  const start = new Date();
  const end = new Date();
  if (filter === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (filter === 'yesterday') {
    start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - 1);     end.setHours(23, 59, 59, 999);
  } else if (filter === 'week') {
    start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0);
  } else if (filter === 'month') {
    start.setMonth(start.getMonth() - 1); start.setHours(0, 0, 0, 0);
  } else {
    start.setFullYear(2025, 0, 1); start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

function fmt(n) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)    return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString('es-AR')}`;
}

function fmtFull(n) {
  return `$${Math.round(n).toLocaleString('es-AR')}`;
}

// ─────────────────────────────────────────────
// SUBCOMPONENTS
// ─────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, accent, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 p-5 flex flex-col gap-3 transition-all duration-500"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)' }}
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20" style={{ background: accent }} />
      <div className="flex justify-between items-start relative z-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-white italic tracking-tighter leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, prefix = '$' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{label}</p>
      <p className="text-white font-black text-lg">{prefix}{Number(payload[0].value).toLocaleString('es-AR')}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const FILTERS = [
  { key: 'today',     label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'week',      label: 'Semana' },
  { key: 'month',     label: 'Mes' },
  { key: 'all',       label: 'Todo' },
];

const PAYMENT_COLORS = ['#10b981', '#38bdf8', '#f59e0b', '#a78bfa'];

export default function DashboardMetrics() {
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');

  const [stats, setStats] = useState({
    kpi: { totalRevenue: 0, totalOrders: 0, avgTicket: 0, deliveryCount: 0, pickupCount: 0, cashTotal: 0, mpTotal: 0 },
    hourlySales: [],
    topProducts: [],
    recentOrders: [],
    paymentBreakdown: [],
    deliveryBreakdown: [],
  });

  useEffect(() => { fetchMetrics(); }, [dateFilter]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange(dateFilter);

      // Intenta RPC primero, fallback a query directa
      try {
        const { data, error } = await supabase.rpc('get_dashboard_metrics', {
          p_start: start.toISOString(),
          p_end: end.toISOString()
        });
        if (!error && data) { processRpcData(data); return; }
      } catch (_) {}

      const { data: rawOrders, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .neq('status', 'cancelled')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      processRawOrders(rawOrders || []);

    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const processRpcData = (data) => {
    const kpi = {
      totalRevenue:  Number(data.total_revenue)  || 0,
      totalOrders:   Number(data.total_orders)   || 0,
      avgTicket:     Number(data.avg_ticket)      || 0,
      deliveryCount: Number(data.delivery_count)  || 0,
      pickupCount:   Number(data.pickup_count)    || 0,
      cashTotal:     Number(data.cash_total)      || 0,
      mpTotal:       Number(data.mp_total)        || 0,
    };
    buildStats(kpi, data.hourly_sales || [], data.top_products || [], data.recent_orders || []);
  };

  const processRawOrders = (orders) => {
    let totalRevenue = 0, deliveryCount = 0, pickupCount = 0, cashTotal = 0, mpTotal = 0;
    const hourMap = {}, productMap = {};
    orders.forEach(order => {
      const amount = Number(order.total) || 0;
      totalRevenue += amount;
      if (order.delivery_method === 'delivery') deliveryCount++; else pickupCount++;
      if (order.payment_method?.toLowerCase() === 'mercadopago') mpTotal += amount; else cashTotal += amount;
      const hour = new Date(order.created_at).getHours();
      hourMap[hour] = (hourMap[hour] || 0) + amount;
      order.order_items?.forEach(item => {
        const name = item.product_name || 'Desconocido';
        productMap[name] = (productMap[name] || 0) + (item.quantity || 1);
      });
    });
    const kpi = { totalRevenue, totalOrders: orders.length, avgTicket: orders.length > 0 ? totalRevenue / orders.length : 0, deliveryCount, pickupCount, cashTotal, mpTotal };
    const hourlySales = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, total: hourMap[i] || 0 }));
    const topProducts = Object.entries(productMap).map(([name, cantidad]) => ({ name, cantidad })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 6);
    const recentOrders = orders.slice(0, 20);
    buildStats(kpi, hourlySales, topProducts, recentOrders);
  };

  const buildStats = (kpi, hourlySales, topProducts, recentOrders) => {
    setStats({
      kpi,
      hourlySales,
      topProducts,
      recentOrders,
      paymentBreakdown: [
        { name: 'Efectivo', value: kpi.cashTotal },
        { name: 'MercadoPago', value: kpi.mpTotal },
      ].filter(p => p.value > 0),
      deliveryBreakdown: [
        { name: 'Delivery', value: kpi.deliveryCount },
        { name: 'Retiro', value: kpi.pickupCount },
      ].filter(p => p.value > 0),
    });
  };

  const peakHour = stats.hourlySales.reduce((best, h) => h.total > best.total ? h : best, { hour: '-', total: 0 });
  const deliveryRate = stats.kpi.totalOrders > 0 ? Math.round((stats.kpi.deliveryCount / stats.kpi.totalOrders) * 100) : 0;
  const cashPct = stats.kpi.totalRevenue > 0 ? Math.round(stats.kpi.cashTotal / stats.kpi.totalRevenue * 100) : 0;
  const mpPct   = stats.kpi.totalRevenue > 0 ? Math.round(stats.kpi.mpTotal   / stats.kpi.totalRevenue * 100) : 0;

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center p-20 gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-gray-800" />
        <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-t-red-600 animate-spin" />
      </div>
      <p className="text-gray-500 text-xs font-black uppercase tracking-widest animate-pulse">Cargando métricas...</p>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,700;1,9..40,400&display=swap');

        .dash { font-family: 'DM Sans', sans-serif; }
        .df   { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }
        .dash-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .dash-scroll::-webkit-scrollbar-track { background: transparent; }
        .dash-scroll::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }

        /* ── PDF: todo oculto excepto .pdf-doc ───────── */
        @media print {
          @page {
            size: A4 portrait;
            margin: 1.4cm 1.6cm;
          }

          /* Ocultamos TODO el sitio */
          body * { visibility: hidden !important; }

          /* Solo mostramos el documento PDF */
          .pdf-doc,
          .pdf-doc * { visibility: visible !important; }

          .pdf-doc {
            position: fixed;
            inset: 0;
            background: white;
            font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif;
            font-size: 11px;
            color: #1e293b;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Saltos de página controlados */
          .pdf-page-break { page-break-before: always; }
          .pdf-no-break   { break-inside: avoid; }
        }

        /* En pantalla el PDF está completamente invisible */
        @media screen {
          .pdf-doc { display: none; }
        }
      `}} />

      <div className="dash space-y-6 pb-24">

        {/* ── HEADER ───────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
          <div>
            <h1 className="df text-5xl text-white leading-none">MÉTRICAS</h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">Panel de Control · American Burger</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex bg-black border border-gray-800 rounded-xl p-1 gap-1">
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setDateFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg transition text-[10px] font-black uppercase tracking-widest ${dateFilter === f.key ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-500 hover:text-gray-300'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            <button onClick={() => window.print()}
              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition shadow-lg">
              <Printer size={14} /> Exportar PDF
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            DASHBOARD UI (visible en pantalla)
        ══════════════════════════════════════════════ */}
        <div className="space-y-6">

          {/* ── KPI GRID ──────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Ventas Totales"   value={fmt(stats.kpi.totalRevenue)}  sub={fmtFull(stats.kpi.totalRevenue)}                                icon={TrendingUp}  accent="#dc2626" delay={0}   />
            <KpiCard label="Pedidos"          value={stats.kpi.totalOrders}         sub={`${stats.kpi.deliveryCount} delivery · ${stats.kpi.pickupCount} retiro`} icon={ShoppingBag} accent="#f59e0b" delay={80}  />
            <KpiCard label="Ticket Promedio"  value={fmt(stats.kpi.avgTicket)}      sub="por pedido"                                                    icon={Zap}         accent="#10b981" delay={160} />
            <KpiCard label="Hora Pico"        value={peakHour.hour}                 sub={`${fmtFull(peakHour.total)} en ventas`}                        icon={Clock}       accent="#38bdf8" delay={240} />
            <KpiCard label="Efectivo"         value={fmt(stats.kpi.cashTotal)}      sub={`${cashPct}% del total`}                                       icon={Wallet}      accent="#10b981" delay={320} />
            <KpiCard label="Mercado Pago"     value={fmt(stats.kpi.mpTotal)}        sub={`${mpPct}% del total`}                                         icon={CreditCard}  accent="#38bdf8" delay={400} />
            <KpiCard label="Tasa Delivery"    value={`${deliveryRate}%`}            sub={`${stats.kpi.deliveryCount} de ${stats.kpi.totalOrders} pedidos`} icon={MapPin}    accent="#a78bfa" delay={480} />
            <KpiCard label="Productos Únicos" value={stats.topProducts.length}      sub="vendidos en el período"                                        icon={Package}     accent="#f97316" delay={560} />
          </div>

          {/* ── GRÁFICO VENTAS + PIE PAGOS ────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print-section">

            {/* Área ventas por hora */}
            <div className="lg:col-span-2 bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-5 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Curva de Ventas</p>
                  <h3 className="df text-2xl text-white leading-none">Por Hora del Día</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Hora pico</p>
                  <p className="text-red-500 font-black text-sm">{peakHour.hour}</p>
                </div>
              </div>
              <div className="h-56 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.hourlySales} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#dc2626" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="hour" fontSize={9} stroke="#4b5563" tick={{ fill: '#6b7280' }} tickLine={false} interval={3} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="total" stroke="#dc2626" strokeWidth={2} fill="url(#redGrad)" dot={false} activeDot={{ r: 5, fill: '#dc2626', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie medios de pago */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-5 border-b border-gray-800">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Distribución</p>
                <h3 className="df text-2xl text-white leading-none">Medios de Pago</h3>
              </div>
              <div className="flex flex-col items-center justify-center h-[calc(100%-73px)] px-5 py-3">
                {stats.paymentBreakdown.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={130}>
                      <PieChart>
                        <Pie data={stats.paymentBreakdown} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={4} dataKey="value" strokeWidth={0}>
                          {stats.paymentBreakdown.map((_, i) => <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-2 w-full">
                      {stats.paymentBreakdown.map((p, i) => (
                        <div key={p.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }} />
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{p.name}</span>
                          </div>
                          <span className="text-[10px] font-black text-white">{fmt(p.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p className="text-gray-600 text-xs text-center">Sin datos</p>}
              </div>
            </div>
          </div>

          {/* ── RANKING + DELIVERY ────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-section">

            {/* Ranking productos */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-5 border-b border-gray-800">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Top Sellers</p>
                <h3 className="df text-2xl text-white leading-none">Ranking Productos</h3>
              </div>
              <div className="p-5 space-y-4">
                {stats.topProducts.length > 0 ? stats.topProducts.map((p, i) => {
                  const max = stats.topProducts[0]?.cantidad || 1;
                  const pct = Math.round((p.cantidad / max) * 100);
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={p.name} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{medals[i] || `${i + 1}.`}</span>
                          <span className="text-sm font-bold text-white truncate max-w-[160px]">{p.name}</span>
                        </div>
                        <span className="text-xs font-black text-yellow-500">{p.cantidad} uds</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${pct}%`, background: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : '#374151' }} />
                      </div>
                    </div>
                  );
                }) : <p className="text-gray-600 text-xs text-center py-4">Sin datos de productos</p>}
              </div>
            </div>

            {/* Delivery vs Retiro */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-5 border-b border-gray-800">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Modalidad</p>
                <h3 className="df text-2xl text-white leading-none">Delivery vs Retiro</h3>
              </div>
              <div className="p-5">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.deliveryBreakdown} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                      <XAxis dataKey="name" fontSize={10} tick={{ fill: '#9ca3af', fontWeight: 'bold' }} tickLine={false} axisLine={false} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip prefix="" />} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={80}>
                        {stats.deliveryBreakdown.map((_, i) => <Cell key={i} fill={i === 0 ? '#a78bfa' : '#f97316'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                    <span className="text-purple-400">Delivery {deliveryRate}%</span>
                    <span className="text-orange-400">Retiro {100 - deliveryRate}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${deliveryRate}%` }} />
                    <div className="h-full bg-orange-500 flex-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── TABLA OPERACIONES ─────────────────────── */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden print-section">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Detalle</p>
                <h3 className="df text-2xl text-white leading-none">Últimas Operaciones</h3>
              </div>
              <span className="text-[10px] font-black text-gray-500 bg-gray-800 px-3 py-1.5 rounded-lg">
                {stats.recentOrders.length} pedidos
              </span>
            </div>
            <div className="overflow-x-auto dash-scroll">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['ID', 'Cliente', 'Tipo', 'Pago', 'Total'].map((h, i) => (
                      <th key={h} className={`px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest ${i === 4 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.length > 0 ? stats.recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5"><span className="font-black text-red-500 italic">#{order.id}</span></td>
                      <td className="px-5 py-3.5"><span className="font-bold text-white uppercase text-[11px]">{order.customer_name || '—'}</span></td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${order.delivery_method === 'delivery' ? 'bg-purple-900/40 text-purple-400' : 'bg-orange-900/40 text-orange-400'}`}>
                          {order.delivery_method === 'delivery' ? '🛵 Delivery' : '🏃 Retiro'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${order.payment_method?.toLowerCase() === 'mercadopago' ? 'bg-sky-900/40 text-sky-400' : 'bg-emerald-900/40 text-emerald-400'}`}>
                          {order.payment_method || 'Efectivo'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right"><span className="font-black text-white italic">{fmtFull(order.total)}</span></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-600 text-xs">No hay pedidos en este período</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── CAJA RESUMEN ──────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print-section">
            <div className="bg-black border border-gray-800 rounded-2xl p-6 flex flex-col justify-between">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Caja</p>
              <div>
                <p className="df text-5xl text-white leading-none mt-2">{fmt(stats.kpi.totalRevenue)}</p>
                <p className="text-gray-500 text-xs mt-1">{fmtFull(stats.kpi.totalRevenue)}</p>
              </div>
            </div>
            <div className="bg-emerald-950 border border-emerald-900/50 rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-900/50 rounded-xl flex items-center justify-center shrink-0">
                <Wallet size={22} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Efectivo</p>
                <p className="df text-3xl text-emerald-300">{fmt(stats.kpi.cashTotal)}</p>
                <p className="text-emerald-700 text-[10px]">{fmtFull(stats.kpi.cashTotal)}</p>
              </div>
            </div>
            <div className="bg-sky-950 border border-sky-900/50 rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-sky-900/50 rounded-xl flex items-center justify-center shrink-0">
                <CreditCard size={22} className="text-sky-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Mercado Pago</p>
                <p className="df text-3xl text-sky-300">{fmt(stats.kpi.mpTotal)}</p>
                <p className="text-sky-700 text-[10px]">{fmtFull(stats.kpi.mpTotal)}</p>
              </div>
            </div>
          </div>

        </div>{/* /space-y-6 dashboard */}
      </div>{/* /dash */}

      {/* ══════════════════════════════════════════════
          PDF DOCUMENT — invisible en pantalla.
          Diseñado desde cero para papel A4 blanco.
          Se activa solo al imprimir con window.print()
      ══════════════════════════════════════════════ */}
      <div className="pdf-doc">

        {/* CABECERA */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', borderBottom:'3px solid #dc2626', paddingBottom:'12px', marginBottom:'20px' }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',Arial", fontSize:'34px', letterSpacing:'2px', color:'#0f172a', lineHeight:1 }}>AMERICAN BURGER</div>
            <div style={{ fontSize:'9px', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'2px', marginTop:'3px' }}>Reporte Operativo de Ventas</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:'9px', color:'#94a3b8', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px' }}>
              Período: <span style={{ color:'#dc2626' }}>{FILTERS.find(f=>f.key===dateFilter)?.label.toUpperCase()}</span>
            </div>
            <div style={{ fontSize:'11px', fontWeight:'700', color:'#475569', marginTop:'2px' }}>{new Date().toLocaleString('es-AR')}</div>
          </div>
        </div>

        {/* KPI GRID — 4 columnas x 2 filas */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'18px' }}>
          {[
            { label:'Ventas Totales',  value:fmtFull(stats.kpi.totalRevenue), sub:`${stats.kpi.totalOrders} pedidos`,                  accent:'#dc2626' },
            { label:'Ticket Promedio', value:fmtFull(stats.kpi.avgTicket),    sub:'por pedido',                                         accent:'#059669' },
            { label:'Hora Pico',       value:peakHour.hour,                   sub:fmtFull(peakHour.total),                              accent:'#0284c7' },
            { label:'Tasa Delivery',   value:`${deliveryRate}%`,              sub:`${stats.kpi.deliveryCount} envíos`,                  accent:'#7c3aed' },
            { label:'Efectivo',        value:fmtFull(stats.kpi.cashTotal),    sub:`${cashPct}% del total`,                              accent:'#059669' },
            { label:'Mercado Pago',    value:fmtFull(stats.kpi.mpTotal),      sub:`${mpPct}% del total`,                               accent:'#0284c7' },
            { label:'Delivery',        value:stats.kpi.deliveryCount,         sub:'pedidos con envío',                                  accent:'#7c3aed' },
            { label:'Retiro en Local', value:stats.kpi.pickupCount,           sub:'pedidos con retiro',                                 accent:'#d97706' },
          ].map(card => (
            <div key={card.label} style={{ border:'1px solid #e2e8f0', borderRadius:'8px', padding:'10px 12px', borderLeft:`3px solid ${card.accent}`, background:'#f8fafc' }}>
              <div style={{ fontSize:'8px', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'4px' }}>{card.label}</div>
              <div style={{ fontSize:'18px', fontFamily:"'Bebas Neue',Arial", color:'#0f172a', letterSpacing:'1px', lineHeight:1 }}>{card.value}</div>
              <div style={{ fontSize:'9px', color:'#64748b', marginTop:'3px' }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* GRÁFICO DE BARRAS — ventas por hora */}
        <div style={{ marginBottom:'18px', border:'1px solid #e2e8f0', borderRadius:'8px', overflow:'hidden' }}>
          <div style={{ background:'#0f172a', padding:'8px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontFamily:"'Bebas Neue',Arial", fontSize:'14px', color:'white', letterSpacing:'1px' }}>VENTAS POR HORA DEL DÍA</div>
            <div style={{ fontSize:'9px', color:'#94a3b8', fontWeight:'700' }}>Hora pico: <span style={{ color:'#ef4444' }}>{peakHour.hour}</span></div>
          </div>
          <div style={{ padding:'14px', background:'white' }}>
            <div style={{ display:'flex', alignItems:'flex-end', gap:'3px', height:'64px' }}>
              {stats.hourlySales.map((h, i) => {
                const maxVal = Math.max(...stats.hourlySales.map(x => x.total), 1);
                const hPct   = Math.round((h.total / maxVal) * 100);
                const isPeak = h.total === peakHour.total && h.total > 0;
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
                    <div style={{ width:'100%', height:`${Math.max(hPct * 0.64, h.total > 0 ? 2 : 0)}px`, background: isPeak ? '#dc2626' : h.total > 0 ? '#3b82f6' : '#e2e8f0', borderRadius:'2px 2px 0 0' }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display:'flex', gap:'3px', marginTop:'3px', borderTop:'1px solid #f1f5f9', paddingTop:'3px' }}>
              {stats.hourlySales.map((h, i) => (
                <div key={i} style={{ flex:1, textAlign:'center', fontSize:'6px', color: i % 4 === 0 ? '#475569' : 'transparent', fontWeight:'700' }}>
                  {i % 4 === 0 ? `${i}h` : '.'}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* DOS COLUMNAS: Ranking + Distribución */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'18px' }}>

          {/* Ranking */}
          <div style={{ border:'1px solid #e2e8f0', borderRadius:'8px', overflow:'hidden' }}>
            <div style={{ background:'#0f172a', padding:'8px 14px' }}>
              <div style={{ fontFamily:"'Bebas Neue',Arial", fontSize:'14px', color:'white', letterSpacing:'1px' }}>RANKING DE PRODUCTOS</div>
            </div>
            <div style={{ padding:'10px 14px' }}>
              {stats.topProducts.length > 0 ? stats.topProducts.map((p, i) => {
                const max    = stats.topProducts[0]?.cantidad || 1;
                const pct    = Math.round((p.cantidad / max) * 100);
                const medals = ['🥇','🥈','🥉'];
                const bars   = ['#f59e0b','#94a3b8','#b45309','#475569','#475569','#475569'];
                return (
                  <div key={p.name} style={{ marginBottom:'8px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                      <div style={{ fontSize:'10px', fontWeight:'700', color:'#1e293b', display:'flex', alignItems:'center', gap:'5px' }}>
                        <span>{medals[i] || `${i+1}.`}</span>
                        <span style={{ maxWidth:'140px', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{p.name}</span>
                      </div>
                      <span style={{ fontSize:'10px', fontWeight:'900', color:'#d97706' }}>{p.cantidad} uds</span>
                    </div>
                    <div style={{ height:'4px', background:'#f1f5f9', borderRadius:'2px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background: bars[i] || '#475569', borderRadius:'2px' }} />
                    </div>
                  </div>
                );
              }) : <div style={{ fontSize:'10px', color:'#94a3b8', textAlign:'center', padding:'12px' }}>Sin datos</div>}
            </div>
          </div>

          {/* Distribución caja */}
          <div style={{ border:'1px solid #e2e8f0', borderRadius:'8px', overflow:'hidden' }}>
            <div style={{ background:'#0f172a', padding:'8px 14px' }}>
              <div style={{ fontFamily:"'Bebas Neue',Arial", fontSize:'14px', color:'white', letterSpacing:'1px' }}>DISTRIBUCIÓN DE CAJA</div>
            </div>
            <div style={{ padding:'14px' }}>
              {/* Pago */}
              <div style={{ marginBottom:'14px' }}>
                <div style={{ fontSize:'9px', fontWeight:'700', color:'#64748b', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'6px' }}>Medios de Pago</div>
                <div style={{ display:'flex', height:'18px', borderRadius:'4px', overflow:'hidden', border:'1px solid #e2e8f0' }}>
                  <div style={{ width:`${cashPct}%`, background:'#059669', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {cashPct > 10 && <span style={{ fontSize:'8px', color:'white', fontWeight:'900' }}>{cashPct}%</span>}
                  </div>
                  <div style={{ flex:1, background:'#0284c7', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {mpPct > 10 && <span style={{ fontSize:'8px', color:'white', fontWeight:'900' }}>{mpPct}%</span>}
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:'5px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:'#059669' }} />
                    <span style={{ fontSize:'9px', fontWeight:'700', color:'#475569' }}>Efectivo: {fmtFull(stats.kpi.cashTotal)}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:'#0284c7' }} />
                    <span style={{ fontSize:'9px', fontWeight:'700', color:'#475569' }}>MP: {fmtFull(stats.kpi.mpTotal)}</span>
                  </div>
                </div>
              </div>
              {/* Modalidad */}
              <div>
                <div style={{ fontSize:'9px', fontWeight:'700', color:'#64748b', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'6px' }}>Modalidad de Entrega</div>
                <div style={{ display:'flex', height:'18px', borderRadius:'4px', overflow:'hidden', border:'1px solid #e2e8f0' }}>
                  <div style={{ width:`${deliveryRate}%`, background:'#7c3aed', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {deliveryRate > 10 && <span style={{ fontSize:'8px', color:'white', fontWeight:'900' }}>{deliveryRate}%</span>}
                  </div>
                  <div style={{ flex:1, background:'#d97706', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {(100-deliveryRate) > 10 && <span style={{ fontSize:'8px', color:'white', fontWeight:'900' }}>{100-deliveryRate}%</span>}
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:'5px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:'#7c3aed' }} />
                    <span style={{ fontSize:'9px', fontWeight:'700', color:'#475569' }}>Delivery: {stats.kpi.deliveryCount}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:'#d97706' }} />
                    <span style={{ fontSize:'9px', fontWeight:'700', color:'#475569' }}>Retiro: {stats.kpi.pickupCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABLA DE OPERACIONES */}
        <div style={{ border:'1px solid #e2e8f0', borderRadius:'8px', overflow:'hidden' }}>
          <div style={{ background:'#0f172a', padding:'8px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontFamily:"'Bebas Neue',Arial", fontSize:'14px', color:'white', letterSpacing:'1px' }}>DETALLE DE OPERACIONES</div>
            <div style={{ fontSize:'9px', color:'#94a3b8', fontWeight:'700' }}>{stats.recentOrders.length} pedidos</div>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'10px' }}>
            <thead>
              <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                {[['#','left'],['Cliente','left'],['Modalidad','left'],['Pago','left'],['Total','right']].map(([h, align]) => (
                  <th key={h} style={{ padding:'7px 10px', textAlign:align, fontSize:'8px', fontWeight:'900', color:'#64748b', textTransform:'uppercase', letterSpacing:'1px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.length > 0 ? stats.recentOrders.map((order, i) => (
                <tr key={order.id} style={{ borderBottom:'1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding:'6px 10px', fontWeight:'900', color:'#dc2626', fontStyle:'italic' }}>#{order.id}</td>
                  <td style={{ padding:'6px 10px', fontWeight:'700', color:'#1e293b', textTransform:'uppercase', fontSize:'9px' }}>{order.customer_name || '—'}</td>
                  <td style={{ padding:'6px 10px' }}>
                    <span style={{ fontSize:'8px', fontWeight:'900', padding:'2px 7px', borderRadius:'10px', background: order.delivery_method==='delivery' ? '#ede9fe' : '#fff7ed', color: order.delivery_method==='delivery' ? '#7c3aed' : '#c2410c', textTransform:'uppercase' }}>
                      {order.delivery_method === 'delivery' ? 'Delivery' : 'Retiro'}
                    </span>
                  </td>
                  <td style={{ padding:'6px 10px' }}>
                    <span style={{ fontSize:'8px', fontWeight:'900', padding:'2px 7px', borderRadius:'10px', background: order.payment_method?.toLowerCase()==='mercadopago' ? '#e0f2fe' : '#dcfce7', color: order.payment_method?.toLowerCase()==='mercadopago' ? '#0369a1' : '#15803d', textTransform:'uppercase' }}>
                      {order.payment_method || 'Efectivo'}
                    </span>
                  </td>
                  <td style={{ padding:'6px 10px', textAlign:'right', fontWeight:'900', color:'#0f172a', fontStyle:'italic' }}>{fmtFull(order.total)}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} style={{ padding:'20px', textAlign:'center', color:'#94a3b8', fontSize:'10px' }}>Sin pedidos en este período</td></tr>
              )}
            </tbody>
          </table>

          {/* Totales al pie */}
          <div style={{ background:'#0f172a', padding:'10px 14px', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
            {[
              { label:'Total Caja',   value:fmtFull(stats.kpi.totalRevenue), color:'#f1f5f9' },
              { label:'Efectivo',     value:fmtFull(stats.kpi.cashTotal),    color:'#4ade80' },
              { label:'Mercado Pago', value:fmtFull(stats.kpi.mpTotal),      color:'#38bdf8' },
            ].map(t => (
              <div key={t.label} style={{ textAlign:'center' }}>
                <div style={{ fontSize:'8px', color:'#64748b', textTransform:'uppercase', letterSpacing:'1px', fontWeight:'700' }}>{t.label}</div>
                <div style={{ fontFamily:"'Bebas Neue',Arial", fontSize:'22px', color:t.color, letterSpacing:'1px' }}>{t.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PIE DE PÁGINA */}
        <div style={{ marginTop:'16px', paddingTop:'10px', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:'8px', color:'#94a3b8', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px' }}>
            American Burger · Catamarca · Reporte generado automáticamente
          </div>
          <div style={{ fontSize:'8px', color:'#94a3b8', fontWeight:'700' }}>
            {new Date().toLocaleDateString('es-AR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </div>
        </div>

      </div>{/* /pdf-doc */}

    </>
  );
}