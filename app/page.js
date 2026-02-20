'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { Search, Lock, MapPin, Phone, Instagram, Loader2, ShoppingCart, Clock, Zap } from 'lucide-react'

// --- COMPONENTES ---
import ProductModal from '../components/ProductModal'
import CartModal from '../components/CartModal'
import PromoCarousel from '../components/PromoCarousel'
import { useCart } from '../store/useCart'

export default function Home() {
  // --- ESTADOS DE DATOS ---
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // --- ESTADOS DE NEGOCIO ---
  const [isStoreOpen, setIsStoreOpen] = useState(true)
  const [checkingStore, setCheckingStore] = useState(true)

  // --- ESTADOS DE UI ---
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Estados para controlar los Modales
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isCartOpen, setIsCartOpen] = useState(false)

  // Hook del Carrito
  const { cart, addToCart } = useCart()
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)

  // --- CARGA INICIAL ---
  useEffect(() => {
    async function init() {
        await Promise.all([fetchStoreConfig(), fetchData()])
        setLoading(false)
    }
    init()
  }, [])

  // 1. Chequear si la tienda está abierta
  const fetchStoreConfig = async () => {
      const { data } = await supabase.from('store_config').select('is_open').eq('id', 1).single()
      if (data) setIsStoreOpen(data.is_open)
      setCheckingStore(false)
  }

  // 2. Cargar Productos y Categorías
  const fetchData = async () => {
    try {
      // Categorías
      const { data: cats } = await supabase.from('categories').select('*').order('id')
      if (cats) setCategories([{ id: 'all', name: 'Todos' }, ...cats])

      // Productos con sus Extras y la nueva columna promo_tag
      const { data: rawProducts } = await supabase
        .from('products')
        .select(`
            *,
            categories (name),
            product_modifiers (
                group_id,
                modifier_groups (
                    id, name, min_selection, max_selection,
                    modifier_options (id, name, price, is_available)
                )
            )
        `)
        .eq('is_active', true)
        .order('id')

      if (rawProducts) {
        // Formateamos los datos
        const formatted = rawProducts.map(p => ({
            ...p,
            modifiers: p.product_modifiers?.map(pm => pm.modifier_groups) || []
        }))
        setProducts(formatted)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // --- FILTROS ---
  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'Todos' || p.categories?.name === activeCategory
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // --- RENDER: PANTALLA "CERRADO" ---
  if (!checkingStore && !isStoreOpen) {
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-center p-6 text-white">
            <div className="absolute inset-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1200')] bg-cover bg-center"></div>
            <div className="relative z-10 bg-black/80 p-8 rounded-3xl border border-red-900/50 backdrop-blur-md shadow-2xl">
                <Clock size={48} className="text-red-500 mx-auto mb-4" />
                <h1 className="text-5xl font-black italic mb-2">CERRADO</h1>
                <p className="text-gray-300 mb-4">Estamos preparando las mejores burgers.</p>
                <div className="bg-gray-900 px-4 py-2 rounded-lg border border-gray-800 inline-block">
                    <span className="text-red-500 font-bold">ABRIMOS 20:00 HS</span>
                </div>
            </div>
        </div>
    )
  }

  // --- RENDER PRINCIPAL ---
  return (
    <div className="min-h-screen bg-black font-sans text-gray-200 pb-24">
      
      {/* HERO BANNER */}
      <div className="relative h-64 sm:h-80 bg-[url('https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1965&auto=format&fit=crop')] bg-cover bg-center">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
        
        {/* LOGO SUPERIOR */}
        <div className="absolute top-0 left-0 p-4 w-full z-10">
             <div className="bg-black/40 backdrop-blur-md rounded-lg p-1 inline-block border border-white/10">
                <img src="/logo.jpg" alt="Logo" className="h-12 w-auto rounded" />
             </div>
        </div>

        <div className="absolute bottom-0 left-0 p-6 w-full">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter text-white mb-2">
              AMERICAN <span className="text-red-600">BURGER</span>
            </h1>
            <p className="text-yellow-500 font-bold text-lg flex items-center gap-2">
              <MapPin size={18}/> Las mejores de Catamarca
            </p>
          </div>
        </div>
      </div>

      {/* BARRA DE NAVEGACIÓN STICKY */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-gray-800 shadow-xl">
        <div className="max-w-6xl mx-auto p-4 space-y-4">
          
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-500" size={20} />
            <input 
              type="text" placeholder="¿Qué se te antoja hoy?" 
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Categorías */}
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar hide-scrollbar">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.name)}
                className={`whitespace-nowrap px-5 py-2 rounded-full font-bold text-sm transition-all border ${activeCategory === cat.name ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-900/40' : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CARRUSEL DE PROMOS */}
      <PromoCarousel />

      {/* GRILLA DE PRODUCTOS */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-600" size={40} /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-600 transition-all cursor-pointer group shadow-lg relative">
                  
                  {/* 🔥 ETIQUETA DE OFERTA RELÁMPAGO (NUEVO) 🔥 */}
                  {product.promo_tag && (
                      <div className="absolute top-0 left-0 z-20 bg-yellow-500 text-black font-black text-[10px] uppercase tracking-wide px-3 py-1 rounded-br-lg shadow-lg flex items-center gap-1 animate-pulse">
                          <Zap size={12} fill="black" /> {product.promo_tag}
                      </div>
                  )}

                  <div className="h-48 overflow-hidden relative">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center text-4xl">🍔</div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur text-white px-3 py-1 rounded-lg font-black border border-gray-700">${product.price}</div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-xl font-bold text-white mb-1 leading-tight">{product.name}</h3>
                    <p className="text-sm text-gray-400 line-clamp-2">{product.description}</p>
                    <button className="mt-4 w-full bg-gray-800 hover:bg-red-600 text-white font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-2 group-hover:bg-red-600">Ver Detalles</button>
                  </div>
                </div>
              ))}
            </div>
            {filteredProducts.length === 0 && <div className="text-center py-20 text-gray-500"><p className="text-lg">No encontramos productos 😔</p></div>}
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-900 border-t border-gray-800 mt-12 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left"><h2 className="text-2xl font-black italic text-white">AMERICAN BURGER</h2><p className="text-gray-500 text-sm mt-1">Sabor auténtico, directo a tu casa.</p></div>
            <div className="flex gap-4"><a href="#" className="p-3 bg-black rounded-full text-gray-400 hover:text-white hover:bg-red-600 transition"><Instagram size={20}/></a><a href="#" className="p-3 bg-black rounded-full text-gray-400 hover:text-white hover:bg-green-600 transition"><Phone size={20}/></a></div>
        </div>
        <div className="text-center text-gray-700 text-xs mt-8">© 2026 American Burger. Todos los derechos reservados.</div>
      </footer>

      {/* BOTONES FLOTANTES */}
      <Link href="/admin" className="fixed bottom-6 left-6 z-40 bg-black/80 backdrop-blur-md border border-gray-700 p-3 rounded-full text-gray-400 hover:bg-red-900 hover:text-white hover:border-red-500 transition-all shadow-2xl group"><Lock size={20} className="group-hover:scale-110 transition-transform" /></Link>
      
      <button onClick={() => setIsCartOpen(true)} className="fixed bottom-6 right-6 z-40 bg-red-600 text-white p-4 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:bg-red-500 hover:scale-105 transition-all flex items-center justify-center group">
        <ShoppingCart size={24} className="group-hover:rotate-12 transition-transform" />
        {totalItems > 0 && <span className="absolute -top-2 -right-2 bg-yellow-400 text-black font-black text-xs w-6 h-6 flex items-center justify-center rounded-full border-2 border-black animate-in zoom-in">{totalItems}</span>}
      </button>

      {/* --- MODALES --- */}
      <ProductModal 
        product={selectedProduct} 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        onAddToCart={(item) => {
            addToCart(item)
            setIsCartOpen(true)
        }}
      />

      <CartModal 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />

    </div>
  )
}