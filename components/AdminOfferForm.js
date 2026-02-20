'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { X, Save, Zap, Percent, Copy, Loader2 } from 'lucide-react'

export default function AdminOfferForm({ onCancel, onSaved }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '2x1',
    discount_value: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    let finalValue = formData.discount_value
    if (!finalValue) {
        if (formData.type === '2x1') finalValue = '2x1'
        if (formData.type === '50off') finalValue = '50% OFF'
        if (formData.type === '70off_2nd') finalValue = '70% 2da UNIDAD'
    }

    const { error } = await supabase.from('special_offers').insert([{
        title: formData.title,
        description: formData.description,
        type: formData.type,
        discount_value: finalValue,
        is_active: true 
    }])

    if (error) alert('Error al guardar: ' + error.message)
    else onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-gray-900 w-full max-w-md rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/40">
          <h2 className="font-black text-white text-lg flex items-center gap-2 italic uppercase tracking-tighter"><Zap className="text-yellow-500" size={18}/> NUEVA OFERTA</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setFormData({...formData, type: '2x1', discount_value: '2x1'})} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${formData.type === '2x1' ? 'bg-red-600 border-red-500 text-white' : 'bg-black border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                  <Copy size={20}/> <span className="text-[10px] font-bold">2x1</span>
              </button>
              <button type="button" onClick={() => setFormData({...formData, type: '50off', discount_value: '50% OFF'})} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${formData.type === '50off' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                  <Percent size={20}/> <span className="text-[10px] font-bold">50% OFF</span>
              </button>
              <button type="button" onClick={() => setFormData({...formData, type: '70off_2nd', discount_value: '70% 2da'})} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${formData.type === '70off_2nd' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-black border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                  <Zap size={20}/> <span className="text-[10px] font-bold text-center">70% 2da</span>
              </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">Título de la Promo</label>
              <input required type="text" className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white focus:border-yellow-500 outline-none text-sm" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ej: Martes Loco" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">Descripción</label>
              <input required type="text" className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white focus:border-yellow-500 outline-none text-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Ej: Solo en hamburguesas dobles" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">Etiqueta Visual</label>
              <input type="text" className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white focus:border-yellow-500 outline-none text-sm" value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: e.target.value})} placeholder="Ej: 3x2" />
            </div>
          </div>

          <button disabled={loading} className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 mt-4 transition-all active:scale-95 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> CREAR OFERTA</>}
          </button>
        </form>
      </div>
    </div>
  )
}