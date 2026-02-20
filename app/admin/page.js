'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// --- COMPONENTES / MODALES ---
import AdminProductForm from '../../components/AdminProductForm'
import AdminGroupForm from '../../components/AdminGroupForm'
import AdminCouponForm from '../../components/AdminCouponForm' 
import AdminBannerForm from '../../components/AdminBannerForm'
import AdminOfferForm from '../../components/AdminOfferForm'
import DashboardMetrics from '@/components/metrics/DashboardMetrics'; 
import AdminCategoryForm from '../../components/AdminCategoryForm' // <-- IMPORTANTE: NUEVO MODAL

// --- ICONOS ---
import { 
  Loader2, Power, LogOut, RefreshCw, ShoppingBag, Utensils, 
  Plus, Trash2, Layers, Ticket, MapPin, Edit, X, Calendar, 
  Hash, Megaphone, Lock, Unlock, CheckCircle, Clock, Truck, 
  MessageCircle, CreditCard, Wallet, AlertCircle, GripVertical, Printer, Zap,
  TrendingUp, Search, FolderPlus // <-- NUEVOS ICONOS
} from 'lucide-react'

export default function AdminPage() {
  // --- ESTADOS GLOBALES ---
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('menu') // Lo pongo en menu para que veas los cambios rápido
  
  // --- LOGIN ---
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // --- ESTADO DE LA TIENDA ---
  const [storeOpen, setStoreOpen] = useState(true)
  const [updatingStore, setUpdatingStore] = useState(false)

  // --- DATOS ---
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [categories, setCategories] = useState([])
  const [modifierGroups, setModifierGroups] = useState([])
  const [coupons, setCoupons] = useState([])
  const [banners, setBanners] = useState([])
  const [offers, setOffers] = useState([])

  // --- ESTADOS NUEVOS PARA BÚSQUEDA Y FILTROS ---
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todas')

  // --- MODALES ---
  const [showProductModal, setShowProductModal] = useState(false)
  const [productToEdit, setProductToEdit] = useState(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false) // <-- NUEVO ESTADO PARA MODAL
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groupToEdit, setGroupToEdit] = useState(null)
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [couponToEdit, setCouponToEdit] = useState(null)
  const [showBannerModal, setShowBannerModal] = useState(false)
  const [showOfferModal, setShowOfferModal] = useState(false)

  // --- EXTRAS ---
  const [selectedGroupId, setSelectedGroupId] = useState(null) 
  const [groupOptions, setGroupOptions] = useState([])

  // --- DRAG & DROP ---
  const [draggedOrder, setDraggedOrder] = useState(null)
  const [isDraggingOver, setIsDraggingOver] = useState(null)

  // =========================================
  // 1. INICIALIZACIÓN
  // =========================================
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadAllData()
      else setLoading(false)
    })

    const channel = supabase
      .channel('realtime-orders') 
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, 
        (payload) => {
          try {
             const audio = new Audio('https://cdn.freesound.org/previews/336/336848_4938433-lq.mp3'); 
             audio.play().catch(e => console.log('Audio error', e));
          } catch(e) {}
          alert('🔔 ¡NUEVO PEDIDO! ' + payload.new.customer_name)
          fetchOrders()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
        await Promise.all([
            fetchStoreConfig(), fetchCategories(), fetchModifiers(),
            fetchProducts(), fetchOrders(), fetchCoupons(), fetchBanners(), fetchOffers()
        ])
    } catch (error) { console.error("Error cargando datos:", error) }
    setLoading(false)
  }

  const fetchStoreConfig = async () => { const { data } = await supabase.from('store_config').select('is_open').eq('id', 1).single(); if (data) setStoreOpen(data.is_open) }
  const toggleStoreStatus = async () => { if(updatingStore) return; setUpdatingStore(true); const newState = !storeOpen; const { error } = await supabase.from('store_config').update({ is_open: newState }).eq('id', 1); if (!error) setStoreOpen(newState); else alert('Error al cambiar estado'); setUpdatingStore(false) }

  // --- FETCHS ---
  const fetchProducts = async () => { const { data } = await supabase.from('products').select('*, categories(name), special_offers(id, title, type, discount_value, is_active)').order('id'); setProducts(data || []) }
  const fetchOrders = async () => { const { data } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }); setOrders(data || []) }
  const fetchCategories = async () => { const { data } = await supabase.from('categories').select('*').order('id'); setCategories(data || []) }
  const fetchModifiers = async () => { const { data } = await supabase.from('modifier_groups').select('*').order('id'); setModifierGroups(data || []) }
  const fetchCoupons = async () => { const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false }); setCoupons(data || []) }
  const fetchBanners = async () => { const { data } = await supabase.from('banners').select('*').order('id', { ascending: false }); setBanners(data || []) }
  const fetchOffers = async () => { const { data } = await supabase.from('special_offers').select('*').order('id', { ascending: false }); setOffers(data || []) }
  const fetchGroupOptions = async (groupId) => { const { data } = await supabase.from('modifier_options').select('*').eq('group_id', groupId).order('id'); setGroupOptions(data || []); setSelectedGroupId(groupId) }

  // =========================================
  // 🖨️ IMPRESIÓN OPTIMIZADA PARA 80MM
  // =========================================
  const printOrder = (order) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute'; iframe.style.width = '0px'; iframe.style.height = '0px'; iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const date = new Date(order.created_at).toLocaleString('es-AR');
    const doc = iframe.contentWindow.document;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Ticket #${order.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
            @page { size: 80mm auto; margin: 0; }
            body { width: 72mm; margin: 0 auto; padding: 5px; font-family: 'Roboto Mono', 'Courier New', monospace; font-size: 12px; line-height: 1.2; color: #000; background: #fff; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            h1 { margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
            h2 { margin: 5px 0; font-size: 16px; }
            .big-type { font-size: 16px; font-weight: 900; text-align: center; border: 2px solid #000; padding: 5px; margin: 10px 0; border-radius: 0; text-transform: uppercase; }
            .info { margin-bottom: 10px; font-size: 12px; }
            .info p { margin: 3px 0; }
            .bold { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th { text-align: left; border-bottom: 2px solid #000; font-size: 12px; padding-bottom: 2px; }
            td { padding: 5px 0; vertical-align: top; border-bottom: 1px dotted #ccc; }
            .col-qty { width: 10%; font-weight: bold; font-size: 13px; }
            .col-prod { width: 65%; }
            .col-price { width: 25%; text-align: right; font-weight: bold; }
            .extras { font-size: 10px; color: #333; display: block; margin-top: 2px; }
            .note { display: block; font-size: 11px; font-weight: bold; background: #000; color: #fff; padding: 2px 4px; margin-top: 3px; border-radius: 2px; }
            .totals { border-top: 2px dashed #000; padding-top: 5px; margin-top: 5px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 12px; }
            .total-final { font-size: 22px; font-weight: 900; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px solid #000; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header"><h1>AMERICAN BURGER</h1><p>Catamarca, Argentina</p><p>${date}</p><h2>PEDIDO #${order.id}</h2></div>
          <div class="big-type">${order.delivery_method === 'delivery' ? '🛵 DELIVERY' : '🏪 RETIRO'}</div>
          <div class="info">
            <p><span class="bold">Cliente:</span> ${order.customer_name}</p>
            <p><span class="bold">Tel:</span> ${order.customer_phone}</p>
            ${order.delivery_method === 'delivery' ? `<p><span class="bold">Dirección:</span> ${order.customer_address}</p>` : ''}
            <p><span class="bold">Pago:</span> ${order.payment_method ? order.payment_method.toUpperCase() : 'EFECTIVO'}</p>
          </div>
          <table><thead><tr><th class="col-qty">Cnt</th><th class="col-prod">Producto</th><th class="col-price">Total</th></tr></thead><tbody>
            ${order.order_items.map(item => `<tr><td class="col-qty">${item.quantity}</td><td class="col-prod"><div class="bold">${item.product_name}</div>${item.options ? `<span class="extras">+ ${item.options}</span>` : ''}${item.note ? `<span class="note">NOTA: ${item.note}</span>` : ''}</td><td class="col-price">$${item.price * item.quantity}</td></tr>`).join('')}
          </tbody></table>
          <div class="totals">
            <div class="row"><span>Subtotal:</span><span>$${order.total - (order.delivery_method === 'delivery' ? 0 : 0) + (Number(order.discount) || 0)}</span></div>
            ${order.discount > 0 ? `<div class="row"><span>Descuento:</span><span>-$${order.discount}</span></div>` : ''}
            <div class="row total-final"><span>TOTAL:</span><span>$${order.total}</span></div>
          </div>
          <div class="footer"><p>¡Gracias por tu compra!</p><p>www.americanburger.com</p></div>
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    
    setTimeout(() => { if(iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 1000);
  }

  // =========================================
  // DRAG & DROP NATIVO
  // =========================================
  const handleDragStart = (e, order) => { setDraggedOrder(order); e.dataTransfer.effectAllowed = "move"; setTimeout(() => { if(e.target) e.target.classList.add('opacity-50', 'scale-95') }, 0) }
  const handleDragEnd = (e) => { if(e.target) e.target.classList.remove('opacity-50', 'scale-95'); setDraggedOrder(null); setIsDraggingOver(null) }
  const handleDragOver = (e, colId) => { e.preventDefault(); if (isDraggingOver !== colId) setIsDraggingOver(colId) }
  const handleDrop = async (e, newStatus) => { e.preventDefault(); setIsDraggingOver(null); if (!draggedOrder || draggedOrder.status === newStatus) return; setOrders(prev => prev.map(o => o.id === draggedOrder.id ? { ...o, status: newStatus } : o)); const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', draggedOrder.id); if (error) { alert('Error al mover pedido'); fetchOrders() } }

  // =========================================
  // ACTIONS
  // =========================================
  const handleLogin = async (e) => { e.preventDefault(); setLoading(true); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) alert("Error: " + error.message); else loadAllData(); setLoading(false) }
  
  // CRUD
  const handleCreateProduct = () => { setProductToEdit(null); setShowProductModal(true) }
  const handleEditProduct = (p) => { setProductToEdit(p); setShowProductModal(true) }
  const deleteProduct = async (id) => { if (!confirm('¿Eliminar producto?')) return; await supabase.from('product_modifiers').delete().eq('product_id', id); await supabase.from('products').delete().eq('id', id); fetchProducts() }
  const toggleActive = async (id, current) => { await supabase.from('products').update({ is_active: !current }).eq('id', id); fetchProducts() }
  const handleCreateGroup = () => { setGroupToEdit(null); setShowGroupModal(true) }
  const handleEditGroup = (g) => { setGroupToEdit(g); setShowGroupModal(true) }
  const deleteGroup = async (id, e) => { e.stopPropagation(); if(!confirm('¿Borrar grupo?')) return; await supabase.from('modifier_options').delete().eq('group_id', id); await supabase.from('modifier_groups').delete().eq('id', id); fetchModifiers(); if(selectedGroupId === id) { setSelectedGroupId(null); setGroupOptions([]) } }
  const addOption = async () => { if(!selectedGroupId) return; const { error } = await supabase.from('modifier_options').insert([{ group_id: selectedGroupId, name: 'Nueva Opción', price: 0, is_available: true }]); if(!error) fetchGroupOptions(selectedGroupId) }
  const updateOption = async (id, field, value) => { setGroupOptions(prev => prev.map(opt => opt.id === id ? { ...opt, [field]: value } : opt)); await supabase.from('modifier_options').update({ [field]: value }).eq('id', id); }
  const deleteOption = async (id) => { if(!confirm('¿Borrar opción?')) return; await supabase.from('modifier_options').delete().eq('id', id); fetchGroupOptions(selectedGroupId) }
  const handleCreateCoupon = () => { setCouponToEdit(null); setShowCouponModal(true) }
  const handleEditCoupon = (c) => { setCouponToEdit(c); setShowCouponModal(true) }
  const deleteCoupon = async (code) => { if(!confirm('¿Eliminar cupón?')) return; await supabase.from('coupons').delete().eq('code', code); fetchCoupons() }
  
  // ACTIONS PROMOS (BANNERS & OFERTAS)
  const deleteBanner = async (id) => { if(!confirm('¿Eliminar banner?')) return; await supabase.from('banners').delete().eq('id', id); fetchBanners() }
  const toggleBannerActive = async (id, current) => { await supabase.from('banners').update({ is_active: !current }).eq('id', id); fetchBanners() }
  const deleteOffer = async (id) => { if(!confirm('¿Eliminar oferta?')) return; await supabase.from('special_offers').delete().eq('id', id); fetchOffers() }
  const toggleOfferActive = async (id, current) => { await supabase.from('special_offers').update({ is_active: !current }).eq('id', id); fetchOffers() }

  if (!session) return <LoginScreen email={email} setEmail={setEmail} password={password} setPassword={setPassword} handleLogin={handleLogin} loading={loading} />

  // --- LÓGICA DE FILTRADO PARA PRODUCTOS ---
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || p.categories?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // --- TARJETA PEDIDO ---
  const OrderCard = ({ order }) => (
      <div 
        draggable="true"
        onDragStart={(e) => handleDragStart(e, order)}
        onDragEnd={handleDragEnd}
        className="bg-black border border-gray-700 rounded-xl p-3 shadow-sm hover:border-gray-500 transition-all mb-3 flex flex-col gap-2 group cursor-grab active:cursor-grabbing hover:shadow-md hover:translate-y-[-2px] select-none relative"
      >
          <div className="flex justify-between items-start border-b border-gray-800 pb-2 pointer-events-none">
             <div className="flex items-center gap-2"><GripVertical size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors"/><div><span className="font-black text-white text-lg">#{order.id}</span><p className="text-xs text-gray-400 font-bold uppercase truncate max-w-[120px]">{order.customer_name}</p></div></div>
             <div className="flex flex-col items-end gap-1 pointer-events-auto"><button onClick={() => printOrder(order)} className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded transition mb-1" title="Imprimir"><Printer size={14} /></button><span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide ${order.delivery_method === 'delivery' ? 'bg-blue-900/40 text-blue-400 border border-blue-900/50' : 'bg-purple-900/40 text-purple-400 border border-purple-900/50'}`}>{order.delivery_method === 'delivery' ? 'Delivery' : 'Retiro'}</span></div>
          </div>
          <div className="space-y-2 py-1 pointer-events-none">{order.order_items.map(item => (<div key={item.id} className="text-sm leading-tight"><div className="flex gap-2"><span className="text-red-500 font-bold">{item.quantity}x</span> <span className="text-gray-200">{item.product_name}</span></div>{item.options && <p className="text-[10px] text-gray-500 ml-6 line-clamp-1">+ {item.options}</p>}{item.note && <p className="text-[10px] text-yellow-500 ml-6 italic bg-yellow-900/10 px-1.5 py-0.5 rounded inline-block mt-0.5 border border-yellow-900/20">📝 {item.note}</p>}</div>))}</div>
          <div className="pt-2 mt-auto border-t border-gray-800 pointer-events-none"><div className="flex justify-between items-center mb-2"><span className="text-xs text-gray-400 font-medium flex items-center gap-1 uppercase">{order.payment_method === 'mercadopago' ? <CreditCard size={12} className="text-sky-400"/> : <Wallet size={12} className="text-green-500"/>}{order.payment_method || 'Efectivo'}</span><span className="text-lg font-black text-white">${order.total}</span></div>{order.delivery_method === 'delivery' && (<div className="text-[10px] text-gray-400 mb-2 flex items-start gap-1 bg-gray-900 p-1.5 rounded"><MapPin size={10} className="mt-0.5 text-red-500"/> <span className="line-clamp-2">{order.customer_address}</span></div>)}</div>
      </div>
  )

  // --- RENDER PRINCIPAL ---
  return (
    <div className="min-h-screen bg-black font-sans text-gray-200 flex flex-col h-screen overflow-hidden">
      
      {/* NAVBAR */}
      <nav className="bg-gray-900 border-b border-gray-800 p-3 shrink-0 flex justify-between items-center z-40">
        <div className="flex items-center gap-2"><span className="font-black text-lg italic text-red-600 tracking-tighter hidden sm:inline">AMERICAN <span className="text-yellow-500">ADMIN</span></span><span className="font-black text-lg italic text-red-600 tracking-tighter sm:hidden">AA</span></div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={toggleStoreStatus} disabled={updatingStore} className={`flex items-center gap-1 sm:gap-2 px-3 py-1.5 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${storeOpen ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{storeOpen ? <Unlock size={12}/> : <Lock size={12}/>} <span className="hidden sm:inline">{storeOpen ? 'ABIERTO' : 'CERRADO'}</span></button>
          <div className="h-6 w-px bg-gray-700 mx-1"></div>
          <div className="flex bg-gray-800 rounded-lg p-1">
             {[
               {id:'orders',icon:ShoppingBag},
               {id:'menu',icon:Utensils},
               {id:'extras',icon:Layers},
               {id:'coupons',icon:Ticket},
               {id:'promos',icon:Megaphone},
               {id:'metrics',icon:TrendingUp}
             ].map(t => (<button key={t.id} onClick={() => setActiveTab(t.id)} className={`p-2 rounded transition ${activeTab === t.id ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}><t.icon size={18}/></button>))}
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-gray-500 hover:text-red-500"><LogOut size={18}/></button>
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-hidden relative">
        
        {/* KANBAN PEDIDOS */}
        {activeTab === 'orders' && (
          <div className="h-full p-4 overflow-x-auto">
             <div className="flex gap-4 h-full min-w-[1000px] md:min-w-0">
                 {[{id:'pending',label:'PENDIENTES',color:'yellow',icon:Clock},{id:'cooking',label:'COCINA',color:'red',icon:Utensils},{id:'delivery',label:'EN CAMINO',color:'blue',icon:Truck},{id:'completed',label:'LISTOS',color:'green',icon:CheckCircle}].map(col => (
                     <div key={col.id} onDragOver={(e) => handleDragOver(e, col.id)} onDrop={(e) => handleDrop(e, col.id)} className={`flex-1 flex flex-col rounded-xl border h-full transition-colors duration-200 ${isDraggingOver === col.id ? 'bg-gray-800/80 border-gray-500 ring-2 ring-inset ring-gray-600' : 'bg-gray-900/50 border-gray-800'}`}>
                         <div className={`p-3 border-b rounded-t-xl flex justify-between items-center ${col.color==='yellow'?'border-yellow-900/30 bg-yellow-900/10 text-yellow-500':col.color==='red'?'border-red-900/30 bg-red-900/10 text-red-500':col.color==='blue'?'border-blue-900/30 bg-blue-900/10 text-blue-400':'border-green-900/30 bg-green-900/10 text-green-600'}`}>
                             <h3 className="font-black flex items-center gap-2"><col.icon size={16}/> {col.label}</h3><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/50 border border-white/10 text-white">{orders.filter(o => o.status === col.id).length}</span>
                         </div>
                         <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                             {orders.filter(o => o.status === col.id).map(order => <OrderCard key={order.id} order={order} />)}
                             {orders.filter(o => o.status === col.id).length === 0 && !isDraggingOver && (<div className="h-full flex items-center justify-center text-gray-700 text-sm opacity-50 font-bold tracking-widest uppercase select-none">Vacío</div>)}
                         </div>
                     </div>
                 ))}
             </div>
          </div>
        )}

        {/* --- PESTAÑA: REPORTES (METRICS) --- */}
        {activeTab === 'metrics' && (
          <div className="h-full overflow-y-auto p-4 custom-scrollbar">
              <DashboardMetrics />
          </div>
        )}

        {/* --- 🚀 PESTAÑA: MENU (GRILLA + BUSCADOR + CATEGORÍAS) 🚀 --- */}
        {activeTab === 'menu' && (
           <div className="h-full overflow-y-auto p-4 custom-scrollbar pb-20">
               <div className="space-y-6 max-w-7xl mx-auto">
                   
                   {/* BARRA SUPERIOR: BUSCADOR Y BOTONES */}
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900 p-4 rounded-xl border border-gray-800">
                       
                       {/* Buscador y Filtro Rápido */}
                       <div className="flex flex-1 w-full md:w-auto gap-3">
                           <div className="relative flex-1 max-w-sm">
                               <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                               <input 
                                   type="text" 
                                   placeholder="Buscar producto..." 
                                   value={searchTerm}
                                   onChange={(e) => setSearchTerm(e.target.value)}
                                   className="w-full bg-black border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white text-sm outline-none focus:border-red-600 transition-colors placeholder:text-gray-600"
                               />
                           </div>
                           
                           {/* Select de Categorías Dinámico */}
                           <select 
                               value={selectedCategory}
                               onChange={(e) => setSelectedCategory(e.target.value)}
                               className="bg-black border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-red-600"
                           >
                               <option value="Todas">Todas las Categorías</option>
                               {categories.map(cat => (
                                   <option key={cat.id} value={cat.name}>{cat.name}</option>
                               ))}
                           </select>
                       </div>

                       {/* Botones de Acción */}
                       <div className="flex w-full md:w-auto gap-3">
                           <button onClick={() => setShowCategoryModal(true)} className="flex-1 md:flex-none bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 border border-gray-700 transition text-sm">
                               <FolderPlus size={16}/> CATEGORÍAS
                           </button>
                           <button onClick={handleCreateProduct} className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 transition text-sm">
                               <Plus size={18}/> NUEVO PRODUCTO
                           </button>
                       </div>
                   </div>

                   {/* LISTA DE PRODUCTOS (MODO GRILLA DE TARJETAS) */}
                   {filteredProducts.length === 0 ? (
                       <div className="flex flex-col items-center justify-center py-20 text-gray-500 border-2 border-dashed border-gray-800 rounded-2xl">
                           <Utensils size={48} className="opacity-20 mb-4"/>
                           <p className="font-bold uppercase tracking-widest text-sm">No se encontraron productos</p>
                           {searchTerm && <p className="text-xs mt-2">Prueba con otra búsqueda o limpia los filtros.</p>}
                       </div>
                   ) : (
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                           {filteredProducts.map(p => (
                               <div key={p.id} className={`bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col transition hover:border-gray-600 ${!p.is_active ? 'opacity-60 grayscale' : ''}`}>
                                   
                                   {/* FOTO E INFO RÁPIDA (Arriba) */}
                                   <div className="flex p-4 gap-3">
                                       <div className="w-20 h-20 bg-black rounded-lg overflow-hidden shrink-0 border border-gray-800">
                                           {p.image_url ? 
                                               <img src={p.image_url} alt={p.name} className="w-full h-full object-cover"/> 
                                               : 
                                               <div className="flex items-center justify-center h-full text-2xl">🍔</div>
                                           }
                                       </div>
                                       <div className="flex flex-col justify-between overflow-hidden">
                                           <div>
                                               <h3 className="font-bold text-white text-base leading-tight truncate" title={p.name}>{p.name}</h3>
                                               <p className="text-xs text-red-500 font-black mt-0.5">{p.categories?.name}</p>
                                           </div>
                                           <p className="text-lg font-black text-white">${p.price}</p>
                                       </div>
                                   </div>
                                   
                                   {/* BOTONERA (Abajo) */}
                                   <div className="bg-black border-t border-gray-800 p-2 flex justify-between items-center mt-auto">
                                       <button 
                                           onClick={() => toggleActive(p.id, p.is_active)} 
                                           className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${p.is_active ? 'bg-green-900/20 text-green-500 hover:bg-green-900/40' : 'bg-gray-800 text-gray-500 hover:text-white'}`}
                                       >
                                           <Power size={14} /> {p.is_active ? 'Activo' : 'Oculto'}
                                       </button>
                                       
                                       <div className="flex gap-1">
                                           <button 
                                               onClick={() => handleEditProduct(p)} 
                                               className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition"
                                               title="Editar"
                                           >
                                               <Edit size={16}/>
                                           </button>
                                           <button 
                                               onClick={() => deleteProduct(p.id)} 
                                               className="p-2 text-red-500 hover:bg-red-900/30 rounded-lg transition"
                                               title="Eliminar"
                                           >
                                               <Trash2 size={16}/>
                                           </button>
                                       </div>
                                   </div>
                               </div>
                           ))}
                       </div>
                   )}
               </div>
           </div>
        )}

        {/* --- PESTAÑA: EXTRAS --- */}
        {activeTab === 'extras' && (
           <div className="h-full overflow-y-auto p-4 custom-scrollbar pb-20"><div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto"><div className="bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden h-[600px]"><div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50"><h3 className="font-bold text-white flex items-center gap-2"><Layers size={18}/> GRUPOS</h3><button onClick={handleCreateGroup} className="text-xs bg-red-600 text-white px-3 py-2 rounded font-bold flex gap-1 hover:bg-red-500 transition"><Plus size={14}/> NUEVO</button></div><div className="p-4 overflow-y-auto flex-1 space-y-2 custom-scrollbar">{modifierGroups.map(g => (<div key={g.id} onClick={() => fetchGroupOptions(g.id)} className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center transition group ${selectedGroupId === g.id ? 'bg-red-900/20 border-red-600 ring-1 ring-red-600' : 'bg-black border-gray-800 hover:border-gray-600'}`}><div><span className={`font-bold text-sm block ${selectedGroupId === g.id ? 'text-white' : 'text-gray-300'}`}>{g.name}</span><div className="flex gap-2 mt-1"><span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400 border border-gray-700">{g.min_selection === 1 && g.max_selection === 1 ? 'Radio (1)' : `Multi (Máx ${g.max_selection})`}</span>{g.min_selection > 0 && <span className="text-[10px] bg-red-900/30 text-red-400 px-2 py-0.5 rounded font-bold">Obligatorio</span>}</div></div><div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); handleEditGroup(g) }} className="p-2 text-blue-400 hover:bg-blue-900/30 rounded"><Edit size={14}/></button><button onClick={(e) => deleteGroup(g.id, e)} className="p-2 text-red-500 hover:bg-red-900/30 rounded"><Trash2 size={14}/></button></div></div>))}</div></div><div className="bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden h-[600px]"><div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50"><h3 className="font-bold text-white flex items-center gap-2"><Utensils size={18}/> OPCIONES</h3>{selectedGroupId && <button onClick={addOption} className="text-xs bg-green-600 text-white px-3 py-2 rounded font-bold flex gap-1 hover:bg-green-500 transition"><Plus size={14}/> AGREGAR</button>}</div><div className="p-4 overflow-y-auto flex-1 custom-scrollbar">{!selectedGroupId ? <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2"><Layers size={40} className="opacity-20"/><p className="text-sm">Selecciona un grupo para ver opciones</p></div> : <div className="space-y-2">{groupOptions.map(opt => (<div key={opt.id} className="flex gap-3 items-center bg-black p-3 rounded-xl border border-gray-800 hover:border-gray-600 transition group"><div className="flex-1"><input className="bg-transparent text-white text-sm font-medium w-full outline-none placeholder-gray-600 focus:text-red-500 transition-colors" defaultValue={opt.name} onBlur={(e) => updateOption(opt.id, 'name', e.target.value)} /></div><div className="flex items-center bg-gray-900 rounded-lg px-3 py-1.5 border border-gray-700 focus-within:border-yellow-500"><span className="text-xs text-gray-500 mr-1">$</span><input className="bg-transparent text-yellow-500 text-sm font-bold w-14 text-right outline-none" type="number" defaultValue={opt.price} onBlur={(e) => updateOption(opt.id, 'price', e.target.value)} /></div><button onClick={() => updateOption(opt.id, 'is_available', !opt.is_available)} className={`px-2 py-1.5 rounded text-[10px] font-bold uppercase w-20 text-center border transition-all ${opt.is_available ? 'border-green-600 text-green-500 bg-green-900/20 hover:bg-green-900/30' : 'border-red-800 text-red-500 bg-red-900/20 hover:bg-red-900/30 line-through decoration-red-500'}`}>{opt.is_available ? 'EN STOCK' : 'AGOTADO'}</button><button onClick={() => deleteOption(opt.id)} className="text-gray-600 hover:text-red-500 p-1.5 hover:bg-red-900/20 rounded transition"><Trash2 size={16}/></button></div>))}</div>}</div></div></div></div>
        )}

        {/* --- PESTAÑA: CUPONES --- */}
        {activeTab === 'coupons' && (
           <div className="h-full overflow-y-auto p-4 custom-scrollbar pb-20"><div className="bg-gray-900 rounded-xl border border-gray-800 p-4 max-w-4xl mx-auto"><div className="flex justify-end mb-4"><button onClick={handleCreateCoupon} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-xs font-bold flex gap-2 transition shadow-lg shadow-red-900/20"><Plus size={14}/> NUEVO CUPÓN</button></div><div className="grid gap-3">{coupons.map(c => { const isExpired = c.expires_at && new Date(c.expires_at) < new Date(); const isSoldOut = c.usage_limit && c.times_used >= c.usage_limit; const isActive = !isExpired && !isSoldOut; const statusColor = isActive ? 'text-green-500' : 'text-red-500'; return (<div key={c.code} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black border ${isActive ? 'border-gray-800' : 'border-red-900/30 bg-red-900/5'} p-4 rounded-xl transition`}><div><div className="flex items-center gap-3"><span className={`font-black tracking-widest text-lg ${statusColor}`}>{c.code}</span>{!isActive && (<span className="text-[10px] bg-red-900/30 text-red-500 px-2 py-0.5 rounded border border-red-900/50 font-bold">{isExpired ? 'VENCIDO' : 'AGOTADO'}</span>)}</div><div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-4 font-medium"><span className="flex items-center gap-1"><Ticket size={12}/> {c.discount_type === 'percent' ? `${c.value}% OFF` : `$${c.value} OFF`}</span>{c.usage_limit && <span className="flex items-center gap-1"><Hash size={12}/> {c.times_used} / {c.usage_limit} Usos</span>}{c.expires_at && <span className="flex items-center gap-1"><Calendar size={12}/> Vence: {new Date(c.expires_at).toLocaleDateString()}</span>}</div></div><div className="flex gap-2 mt-4 sm:mt-0"><button onClick={() => handleEditCoupon(c)} className="p-2 text-blue-500 hover:bg-blue-900/20 rounded border border-transparent hover:border-blue-900/30 transition"><Edit size={16}/></button><button onClick={() => deleteCoupon(c.code)} className="p-2 text-red-500 hover:bg-red-900/20 rounded border border-transparent hover:border-red-900/30 transition"><Trash2 size={16}/></button></div></div>) })}</div></div></div>
        )}

        {/* --- PESTAÑA: PROMOS --- */}
        {activeTab === 'promos' && (
           <div className="h-full overflow-y-auto p-4 custom-scrollbar pb-20">
               <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                   
                   {/* BANNERS (IZQUIERDA) */}
                   <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                       <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-white flex items-center gap-2"><Megaphone size={18}/> BANNERS PRINCIPALES</h3><button onClick={() => setShowBannerModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold flex gap-2"><Plus size={14}/> SUBIR</button></div>
                       <div className="grid gap-4">
                           {banners.map(b => (<div key={b.id} className={`group relative bg-black border rounded-xl overflow-hidden transition ${b.is_active ? 'border-gray-800' : 'border-red-900/50 opacity-70 grayscale'}`}><div className="aspect-video w-full relative"><img src={b.image_url} alt="Banner" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 gap-4"><button onClick={() => deleteBanner(b.id)} className="bg-red-600 text-white p-3 rounded-full hover:scale-110 transition"><Trash2 size={20}/></button></div></div><div className="p-3 flex justify-between items-center border-t border-gray-800"><span className="font-bold text-sm text-gray-300 truncate pr-4">{b.title || 'Sin Título'}</span><button onClick={() => toggleBannerActive(b.id, b.is_active)} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${b.is_active ? 'border-green-800 bg-green-900/20 text-green-500' : 'border-gray-700 bg-gray-800 text-gray-500'}`}>{b.is_active ? 'VISIBLE' : 'OCULTO'}</button></div></div>))}
                           {banners.length === 0 && <p className="text-center text-gray-600 py-10">Sin banners.</p>}
                       </div>
                   </div>

                   {/* OFERTAS RELÁMPAGO (DERECHA) */}
                   <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                       <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-white flex items-center gap-2"><Zap size={18} className="text-yellow-500"/> OFERTAS RELÁMPAGO</h3><button onClick={() => setShowOfferModal(true)} className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded text-xs font-bold flex gap-2"><Plus size={14}/> CREAR</button></div>
                       <div className="space-y-3">
                           {offers.map(offer => (
                               <div key={offer.id} className={`flex justify-between items-center bg-black border p-3 rounded-xl transition ${offer.is_active ? 'border-gray-700' : 'border-red-900/30 bg-red-900/5'}`}>
                                   <div className="flex items-center gap-3">
                                       <div className={`w-12 h-12 flex items-center justify-center rounded-lg font-black text-xs text-center leading-none p-1 ${offer.type==='2x1'?'bg-red-600 text-white':offer.type==='50off'?'bg-blue-600 text-white':'bg-purple-600 text-white'}`}>{offer.discount_value}</div>
                                       <div><h4 className={`font-bold text-sm ${offer.is_active?'text-white':'text-gray-500'}`}>{offer.title}</h4><p className="text-xs text-gray-500">{offer.description}</p></div>
                                   </div>
                                   <div className="flex gap-2">
                                       <button onClick={() => toggleOfferActive(offer.id, offer.is_active)} className={`p-1.5 rounded border ${offer.is_active ? 'border-green-900 bg-green-900/20 text-green-500' : 'border-gray-700 bg-gray-800 text-gray-500'}`}><Power size={14}/></button>
                                       <button onClick={() => deleteOffer(offer.id)} className="p-1.5 text-red-500 hover:bg-red-900/20 rounded border border-transparent hover:border-red-900/30"><Trash2 size={14}/></button>
                                   </div>
                               </div>
                           ))}
                           {offers.length === 0 && <p className="text-center text-gray-600 py-10">Sin ofertas activas.</p>}
                       </div>
                   </div>

               </div>
           </div>
        )}

      </main>

      {/* MODALES */}
      {showCategoryModal && <AdminCategoryForm onCancel={() => setShowCategoryModal(false)} onSaved={() => { fetchCategories(); fetchProducts(); }} />}
      {showProductModal && <AdminProductForm productToEdit={productToEdit} onCancel={() => setShowProductModal(false)} onSaved={() => { setShowProductModal(false); fetchProducts() }} />}
      {showGroupModal && <AdminGroupForm groupToEdit={groupToEdit} onCancel={() => setShowGroupModal(false)} onSaved={() => { setShowGroupModal(false); fetchModifiers() }} />}
      {showCouponModal && <AdminCouponForm couponToEdit={couponToEdit} onCancel={() => setShowCouponModal(false)} onSaved={() => { setShowCouponModal(false); fetchCoupons() }} />}
      {showBannerModal && <AdminBannerForm onCancel={() => setShowBannerModal(false)} onSaved={() => { setShowBannerModal(false); fetchBanners() }} />}
      {showOfferModal && <AdminOfferForm onCancel={() => setShowOfferModal(false)} onSaved={() => { setShowOfferModal(false); fetchOffers() }} />}

    </div>
  )
}

function LoginScreen({ email, setEmail, password, setPassword, handleLogin, loading }) {
  return <div className="min-h-screen bg-black flex items-center justify-center p-4"><div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl w-full max-w-sm shadow-2xl"><h1 className="text-3xl font-black text-center mb-6 text-white italic">AMERICAN <span className="text-red-600">LOGIN</span></h1><form onSubmit={handleLogin} className="space-y-4"><input type="email" placeholder="Email" className="w-full p-3 bg-black border border-gray-700 rounded-xl text-white outline-none focus:border-red-600 transition" value={email} onChange={e => setEmail(e.target.value)} /><input type="password" placeholder="Pass" className="w-full p-3 bg-black border border-gray-700 rounded-xl text-white outline-none focus:border-red-600 transition" value={password} onChange={e => setPassword(e.target.value)} /><button disabled={loading} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-900/20">{loading ? '...' : 'ENTRAR'}</button></form></div></div>
}