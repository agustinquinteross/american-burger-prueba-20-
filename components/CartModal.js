'use client'
import { useState, useEffect } from 'react'
import { useCart } from '../store/useCart'
import { supabase } from '../lib/supabase'
import { X, Loader2, MapPin, Store, Search, Trash2, Ticket, CreditCard, ChevronDown, MessageCircle, Wallet, Gift } from 'lucide-react'
import dynamic from 'next/dynamic'

// Configuración de Zonas - TAL CUAL LAS TENÍAS
const DELIVERY_ZONES = [
  { id: 1, name: 'Casco Céntrico / 4 Avenidas', price: 1500 },
  { id: 2, name: 'Barrio La Chacarita / Villa Cubas', price: 2000 },
  { id: 3, name: 'Banda de Varela', price: 2500 },
  { id: 4, name: 'Valle Viejo / San Isidro', price: 3000 },
  { id: 5, name: 'Fray Mamerto Esquiú', price: 3500 },
]

const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false, loading: () => <div className="h-40 bg-gray-800 animate-pulse rounded-xl"/> })

export default function CartModal({ isOpen, onClose }) {
  const { cart, getTotal, clearCart, removeFromCart } = useCart()
  
  // Estados originales
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [deliveryType, setDeliveryType] = useState('delivery')
  const [address, setAddress] = useState('')
  const [selectedZone, setSelectedZone] = useState(DELIVERY_ZONES[0]) 
  const [paymentMethod, setPaymentMethod] = useState('efectivo')

  const [couponCode, setCouponCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [couponMsg, setCouponMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMP, setLoadingMP] = useState(false)
  
  const [coords, setCoords] = useState(null)
  const [forcedCoords, setForcedCoords] = useState(null)
  const [searchingMap, setSearchingMap] = useState(false)

  useEffect(() => {
      if(isOpen && !selectedZone) setSelectedZone(DELIVERY_ZONES[0]);
  }, [isOpen, selectedZone]);

  if (!isOpen) return null

  // ─────────────────────────────────────────────────────────
  // LÓGICA DE PROMOCIONES — corregida
  //
  // PROBLEMA ORIGINAL: item.special_offers nunca tenía datos porque
  // fetchProducts() no hacía el join a special_offers en Supabase.
  // → Fix aplicado en page.js: select('*, special_offers(...)')
  //
  // REGLAS POR TIPO:
  //   2x1       → cada 2 unidades, la 2da es gratis (precio completo)
  //   50off     → 50% de descuento sobre todas las unidades
  //   70off_2nd → la 2da unidad de cada par tiene 70% de descuento
  //
  // Si la oferta está desactivada (is_active: false), no se aplica.
  // ─────────────────────────────────────────────────────────
  const getItemPromoSavings = (item) => {
    const offer = item.special_offers
    if (!offer || offer.is_active === false) return 0

    const qty   = Math.max(0, Number(item.quantity) || 0)
    const price = Math.max(0, Number(item.price)    || 0)

    switch (offer.type) {
      case '2x1':
        return Math.floor(qty / 2) * price
      case '50off':
        return Math.round(qty * price * 0.5 * 100) / 100
      case '70off_2nd':
        return Math.round(Math.floor(qty / 2) * price * 0.7 * 100) / 100
      default:
        return 0
    }
  }

  const promoSavings = Math.round(
    cart.reduce((total, item) => total + getItemPromoSavings(item), 0) * 100
  ) / 100
  const subtotal = Number(getTotal()) || 0
  const deliveryCost = (deliveryType === 'delivery' && selectedZone) ? Number(selectedZone.price) : 0
  const discountAmount = Number(discount) || 0
  // Total seguro: Subtotal - Cupones - Promos + Envío
  const total = Math.max(0, subtotal - discountAmount - promoSavings + deliveryCost)

  // --- FUNCIONES ORIGINALES (RESTAURADAS AL 100%) ---
  const handleSearchAddress = async () => {
    if (!address) return
    setSearchingMap(true)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', San Fernando del Valle de Catamarca, Argentina')}`)
      const data = await response.json()
      if (data && data.length > 0) {
        const { lat, lon } = data[0]
        setForcedCoords({ lat: parseFloat(lat), lng: parseFloat(lon) })
        setCoords({ lat: parseFloat(lat), lng: parseFloat(lon) })
      } else { alert('📍 Dirección no encontrada en mapa.') }
    } catch (error) { console.error(error) }
    setSearchingMap(false)
  }

  const handleApplyCoupon = async () => {
    if (!couponCode) return
    setLoading(true)
    const { data, error } = await supabase.from('coupons').select('*').eq('code', couponCode.toUpperCase()).eq('is_active', true).single()
    setLoading(false)

    if (error || !data) { setCouponMsg('❌ Cupón inválido'); setDiscount(0); return }
    if (data.expires_at && new Date() > new Date(data.expires_at)) { setCouponMsg('⚠️ Vencido'); setDiscount(0); return }
    if (data.usage_limit && data.times_used >= data.usage_limit) { setCouponMsg('⚠️ Agotado'); setDiscount(0); return }

    let val = data.discount_type === 'percent' ? (subtotal * data.value) / 100 : data.value
    setDiscount(val)
    setCouponMsg(`✅ Descuento: -$${val}`)
  }

  const getOptionsString = (item) => item.selectedOptions?.map(o => o.name).join(', ') || ''

  // --- ENVÍO DE PEDIDO (VERSION COMPLETA) ---
  const handleCheckout = async () => {
    if (!name || !phone) return alert('⚠️ Completa Nombre y Teléfono')
    if (deliveryType === 'delivery' && !address) return alert('⚠️ Escribe tu dirección')
    
    setLoading(true)

    // Guardar en 'orders'
    const { data: order, error } = await supabase.from('orders').insert({
        customer_name: name,
        customer_phone: phone,
        customer_address: deliveryType === 'delivery' ? `(${selectedZone?.name}) ${address}` : 'Retiro en Local',
        total: total,
        status: 'pending',
        delivery_method: deliveryType,
        payment_method: paymentMethod,
        discount: discount + promoSavings, // Sumamos ambos tipos de ahorro
        coupon_code: couponCode || null
      }).select().single()

    if (error) {
      console.error("Error Supabase:", error)
      alert('Error al guardar: ' + error.message)
      setLoading(false)
      return
    }

    // Guardar items
    const orderItems = cart.map(item => ({
      order_id: order.id,
      product_name: item.name,
      quantity: item.quantity,
      price: item.price,
      options: getOptionsString(item),
      note: item.note || ''
    }))
    await supabase.from('order_items').insert(orderItems)
    
    // Actualizar Cupón
    if (discount > 0 && couponCode) {
        const { data: c } = await supabase.from('coupons').select('times_used').eq('code', couponCode).single()
        if(c) await supabase.from('coupons').update({ times_used: c.times_used + 1 }).eq('code', couponCode)
    }

    // WhatsApp Formateado
    const itemsList = cart.map(i => {
        const extras    = getOptionsString(i)
        const nota      = i.note ? ` _(Nota: ${i.note})_` : ''
        const savings   = getItemPromoSavings(i)
        const hasPromo  = i.special_offers && i.special_offers.is_active !== false
        const promoTag  = hasPromo ? ` 🎁 *[${i.special_offers.discount_value}]*` : ''
        const promoLine = savings > 0 ? `%0A  └ Ahorro: -$${Math.round(savings).toLocaleString('es-AR')}` : ''
        return `▪️ ${i.quantity}x *${i.name}*${promoTag}${extras ? ` + ${extras}` : ''}${nota}${promoLine}`
    }).join('%0A')

    const mapLink = coords ? `http://maps.google.com/maps?q=${coords.lat},${coords.lng}` : ''
    let msg = `Hola American Burger! 🍔%0A%0ASoy *${name}*.%0APedido *%23${order.id}* (%0A`
    
    if (deliveryType === 'delivery') {
        msg += `🛵 *ENVÍO A DOMICILIO*`
        msg += `%0A🗺️ Zona: *${selectedZone?.name}*` 
        msg += `%0A📍 Dir: *${address}*`
        if (mapLink) msg += `%0A📍 GPS: ${mapLink}`
    } else { msg += `🏪 *RETIRO EN LOCAL*` }

    msg += `)%0A%0A${itemsList}%0A%0A`
    if (promoSavings > 0) msg += `🎁 Ahorro Promos: -$${promoSavings}%0A`
    msg += `Total: *$${total}*%0APago: ${paymentMethod.toUpperCase()}`

    window.open(`https://wa.me/5493834968345?text=${msg}`, '_blank')
    clearCart()
    onClose()
    setLoading(false)
  }

  const handleMercadoPago = () => alert("Función MP en mantenimiento. Usa 'Enviar Pedido'.")

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-gray-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[95vh] overflow-y-auto shadow-2xl border border-gray-800 text-gray-200 no-scrollbar">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Tu Pedido</h2>
          <button onClick={onClose} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 text-white"><X size={20} /></button>
        </div>

        {/* LISTA DE PRODUCTOS */}
        <div className="space-y-3 mb-6 pr-1">
          {cart.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Carrito vacío</p>
          ) : cart.map((item, index) => {
            const itemSavings = getItemPromoSavings(item)
            const hasPromo = item.special_offers && item.special_offers.is_active !== false
            return (
              <div key={index} className={`flex justify-between items-start p-3 rounded-xl border transition-all ${hasPromo ? 'bg-yellow-900/10 border-yellow-800/50' : 'bg-black/40 border-gray-800'}`}>
                <div className="flex gap-3 flex-1 min-w-0">
                  <div className="text-red-500 font-bold mt-0.5 shrink-0">{item.quantity}x</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white leading-tight">{item.name}</p>
                      {hasPromo && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-yellow-400 bg-yellow-900/30 border border-yellow-800/50 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          <Gift size={9} className="shrink-0"/> {item.special_offers.discount_value}
                        </span>
                      )}
                    </div>
                    {item.selectedOptions?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">+ {getOptionsString(item)}</p>
                    )}
                    {item.note && (
                      <p className="text-[10px] text-yellow-500 italic mt-1 bg-yellow-900/10 px-2 py-0.5 rounded border border-yellow-900/30">📝 {item.note}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <p className={`font-bold text-sm ${hasPromo ? 'line-through text-gray-500' : 'text-gray-400'}`}>
                        ${Math.round(item.price * item.quantity).toLocaleString('es-AR')}
                      </p>
                      {itemSavings > 0 && (
                        <p className="text-yellow-400 font-black text-sm">
                          ${Math.round((item.price * item.quantity) - itemSavings).toLocaleString('es-AR')}
                          <span className="text-[9px] text-yellow-600 ml-1">(-${Math.round(itemSavings).toLocaleString('es-AR')})</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.cartItemId)} className="text-gray-600 hover:text-red-500 p-1 transition-colors shrink-0 ml-2"><Trash2 size={16}/></button>
              </div>
            )
          })}
        </div>

        {/* FORMULARIO */}
        <div className="space-y-4">
            <div className="flex gap-2">
                <input type="text" placeholder="CUPÓN" className="w-full pl-4 p-3 bg-black border border-gray-700 rounded-xl text-white outline-none uppercase text-sm focus:border-green-600" value={couponCode} onChange={e => setCouponCode(e.target.value)} />
                <button onClick={handleApplyCoupon} className="bg-gray-800 text-white font-bold px-4 rounded-xl text-xs border border-gray-700">APLICAR</button>
            </div>
            {couponMsg && <p className={`text-xs text-center font-bold ${discount > 0 ? 'text-green-500' : 'text-red-500'}`}>{couponMsg}</p>}

            <input type="text" placeholder="Tu Nombre" className="w-full p-3 bg-black border border-gray-700 rounded-xl text-white focus:border-red-600 outline-none transition-all" value={name} onChange={e => setName(e.target.value)} />
            <input type="tel" placeholder="Tu WhatsApp" className="w-full p-3 bg-black border border-gray-700 rounded-xl text-white focus:border-red-600 outline-none transition-all" value={phone} onChange={e => setPhone(e.target.value)} />
            
            <div className="flex bg-gray-900 rounded-xl p-1 border border-gray-700">
                <button onClick={() => setDeliveryType('delivery')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${deliveryType === 'delivery' ? 'bg-red-600 text-white' : 'text-gray-500'}`}><MapPin size={16} className="inline mr-1"/> ENVÍO</button>
                <button onClick={() => setDeliveryType('pickup')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${deliveryType === 'pickup' ? 'bg-red-600 text-white' : 'text-gray-500'}`}><Store size={16} className="inline mr-1"/> RETIRO</button>
            </div>

            {deliveryType === 'delivery' && (
                <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
                    <div className="relative">
                        <select className="w-full p-3 bg-black border border-gray-700 rounded-xl font-bold text-white appearance-none focus:border-red-600 outline-none"
                            onChange={(e) => setSelectedZone(DELIVERY_ZONES.find(z => z.id === parseInt(e.target.value)))}
                            value={selectedZone?.id}>
                            {DELIVERY_ZONES.map(z => <option key={z.id} value={z.id}>{z.name} - ${z.price}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-3.5 text-gray-500 pointer-events-none" size={20} />
                    </div>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Calle y Número" className="flex-1 p-3 bg-black border border-gray-700 rounded-xl text-white focus:border-red-600 outline-none transition-all" value={address} onChange={e => setAddress(e.target.value)} />
                        <button onClick={handleSearchAddress} className="bg-gray-800 text-white p-3 rounded-xl border border-gray-700 hover:bg-gray-700 transition-colors">{searchingMap ? <Loader2 className="animate-spin"/> : <Search />}</button>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-gray-800 h-40 ring-1 ring-white/5"><MapPicker setLocation={setCoords} forcedCoords={forcedCoords} /></div>
                </div>
            )}

            <select className="w-full p-3 bg-black border border-gray-700 rounded-xl text-white focus:border-red-600 outline-none" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="efectivo">💵 Efectivo</option>
                <option value="transferencia">🏦 Transferencia</option>
                <option value="mercadopago">💳 Mercado Pago</option>
            </select>
        </div>

        {/* RESUMEN DE TOTALES */}
        <div className="mt-6 pt-4 border-t border-gray-800 space-y-1">
            <div className="flex justify-between text-gray-400 text-sm font-medium"><span>Subtotal</span><span>${subtotal}</span></div>
            {deliveryType === 'delivery' && <div className="flex justify-between text-gray-400 text-sm font-medium"><span>Envío</span><span>${deliveryCost}</span></div>}
            {promoSavings > 0 && <div className="flex justify-between text-yellow-500 font-bold text-sm italic"><span>Ahorro Promos</span><span>-${promoSavings}</span></div>}
            {discountAmount > 0 && <div className="flex justify-between text-green-500 font-bold text-sm"><span>Descuento Cupón</span><span>-${discountAmount}</span></div>}
            <div className="flex justify-between text-2xl font-black text-white pt-2 mb-4"><span>Total</span><span className="text-red-600">${total}</span></div>
            
            <div className="space-y-3">
                <button onClick={handleMercadoPago} disabled={loadingMP || loading || cart.length === 0} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-blue-500 disabled:opacity-50 transition-all">
                    {loadingMP ? <Loader2 className="animate-spin"/> : <><CreditCard size={20}/> PAGAR CON MERCADO PAGO</>}
                </button>
                <button onClick={handleCheckout} disabled={loading || loadingMP || cart.length === 0} className="w-full bg-green-600 text-white py-4 rounded-xl font-black flex justify-center items-center gap-2 hover:bg-green-500 disabled:opacity-50 shadow-lg shadow-green-900/20 transition-all uppercase tracking-widest text-sm">
                    {loading ? <Loader2 className="animate-spin"/> : <><MessageCircle size={20}/> Enviar Pedido</>}
                </button>
            </div>
        </div>

      </div>
    </div>
  )
}