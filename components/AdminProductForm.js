'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Save, Upload, Loader2, Layers, Image as ImageIcon, Zap, Gift, Plus } from 'lucide-react'

export default function AdminProductForm({ productToEdit, onCancel, onSaved }) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Estados del Formulario
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [costPrice, setCostPrice] = useState('') 
  const [categoryId, setCategoryId] = useState('')
  const [offerId, setOfferId] = useState('') 
  const [imageUrl, setImageUrl] = useState('')
  const [imageToDelete, setImageToDelete] = useState(null)
  const [promoTags, setPromoTags] = useState([]) 
  const [customTag, setCustomTag] = useState('') 
  const [isActive, setIsActive] = useState(true)
  
  // Estados de Datos
  const [categories, setCategories] = useState([])
  const [modifierGroups, setModifierGroups] = useState([])
  const [selectedModifiers, setSelectedModifiers] = useState([])
  const [availableOffers, setAvailableOffers] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      const { data: cats } = await supabase.from('categories').select('*').order('id')
      if (cats) {
          setCategories(cats)
          if (!productToEdit && cats.length > 0) setCategoryId(cats[0].id)
      }
      const { data: groups } = await supabase.from('modifier_groups').select('*').order('id')
      if (groups) setModifierGroups(groups)

      const { data: offers } = await supabase.from('special_offers').select('*').eq('is_active', true)
      if (offers) setAvailableOffers(offers)

      if (productToEdit) {
        setName(productToEdit.name || ''); setDescription(productToEdit.description || ''); setPrice(productToEdit.price || '');
        setCostPrice(productToEdit.cost_price || ''); setCategoryId(productToEdit.category_id || '');
        setOfferId(productToEdit.offer_id || ''); setImageUrl(productToEdit.image_url || ''); setIsActive(productToEdit.is_active);
        
        if (productToEdit.promo_tag) {
            setPromoTags(productToEdit.promo_tag.split(',').map(tag => tag.trim()).filter(tag => tag !== ""))
        } else { setPromoTags([]) }

        const { data: existingModifiers } = await supabase.from('product_modifiers').select('group_id').eq('product_id', productToEdit.id)
        if (existingModifiers) setSelectedModifiers(existingModifiers.map(em => em.group_id))
      }
    }
    fetchData()
  }, [productToEdit])

  const handleImageUpload = async (e) => {
    try {
      setUploading(true)
      const file = e.target.files[0]
      if (!file) return
      const fileName = `${Date.now()}.${file.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage.from('menu-images').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('menu-images').getPublicUrl(fileName)
      if (imageUrl) setImageToDelete(imageUrl)
      setImageUrl(data.publicUrl)
    } catch (error) { alert('Error imagen: ' + error.message) } finally { setUploading(false) }
  }

  const handleSave = async () => {
    if (!name || !price) return alert('Falta nombre o precio.')
    setLoading(true)
    try {
      const tagsString = promoTags.length > 0 ? promoTags.join(', ') : null
      const productData = {
        name, description, price: parseFloat(price), cost_price: costPrice ? parseFloat(costPrice) : null,
        category_id: categoryId, offer_id: offerId || null, image_url: imageUrl, promo_tag: tagsString, is_active: isActive
      }

      let productId = productToEdit?.id
      if (productToEdit) {
        await supabase.from('products').update(productData).eq('id', productId)
      } else {
        const { data, error } = await supabase.from('products').insert([productData]).select()
        if (error) throw error
        productId = data[0].id
      }

      if (productId) {
          await supabase.from('product_modifiers').delete().eq('product_id', productId)
          if (selectedModifiers.length > 0) {
            await supabase.from('product_modifiers').insert(selectedModifiers.map(groupId => ({ product_id: productId, group_id: groupId })))
          }
      }

      if (imageToDelete) {
          const oldName = imageToDelete.split('/menu-images/')[1]
          if (oldName) await supabase.storage.from('menu-images').remove([oldName])
      }

      setTimeout(() => onSaved(), 100)
    } catch (error) { alert('Error: ' + error.message); setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 w-full max-w-2xl max-h-[90vh] rounded-2xl border border-gray-800 shadow-2xl flex flex-col overflow-hidden">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-900 z-10">
          <h2 className="text-xl font-bold text-white uppercase italic">{productToEdit ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white"><X /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto no-scrollbar flex-1">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Foto</label>
                        <div className="relative overflow-hidden bg-black border border-gray-700 rounded-xl aspect-square flex items-center justify-center group cursor-pointer hover:border-gray-500 transition">
                            {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" alt="Preview" /> : <div className="text-gray-500 flex flex-col items-center">{uploading ? <Loader2 className="animate-spin mb-2"/> : <Upload size={32} className="mb-2"/>}<span className="text-xs font-bold uppercase">Subir Foto</span></div>}
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploading} />
                        </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-gray-800/50">
                        <label className="text-xs font-bold text-green-500 uppercase flex items-center gap-1 tracking-widest"><Zap size={14}/> Etiquetas</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {['NUEVO', 'VEGANO', 'SIN TACC', 'PICANTE'].map(tag => (
                                <button key={tag} type="button" onClick={() => setPromoTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag])} className={`text-[9px] font-black px-2 py-1.5 rounded border transition-all ${promoTags.includes(tag) ? 'bg-green-600 text-white border-green-600' : 'bg-black text-gray-500 border-gray-700 hover:border-gray-500'}`}>{tag}</button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Agregar etiqueta..." value={customTag} onChange={e => setCustomTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setPromoTags(p => [...new Set([...p, customTag.toUpperCase()])]), setCustomTag(''))} className="w-full bg-black border border-gray-700 rounded-lg p-2 text-[10px] text-white outline-none focus:border-green-600" />
                        </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-gray-800/50">
                        <label className="text-xs font-bold text-yellow-500 uppercase flex items-center gap-1 tracking-widest"><Gift size={14}/> Vincular Promo</label>
                        <select value={offerId} onChange={e => setOfferId(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-yellow-500 text-xs font-bold">
                            <option value="">Sin Promoción</option>
                            {availableOffers.map(off => <option key={off.id} value={off.id}>{off.title} ({off.discount_value})</option>)}
                        </select>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nombre</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-red-600 font-bold" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Venta</label><input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-red-600 font-black" /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Costo</label><input type="number" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-red-600 font-black" placeholder="0.00" /></div>
                    </div>
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Categoría</label><select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-red-600 text-xs font-bold">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Descripción</label><textarea rows="3" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-red-600 text-xs resize-none" /></div>
                    <div className="space-y-2 pt-2 border-t border-gray-800"><label className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2 tracking-widest"><Layers size={14}/> Extras Permitidos</label><div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto no-scrollbar p-1">{modifierGroups.map(group => (<div key={group.id} onClick={() => setSelectedModifiers(p => p.includes(group.id) ? p.filter(id => id !== group.id) : [...p, group.id])} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition select-none ${selectedModifiers.includes(group.id) ? 'bg-blue-900/20 border-blue-600 text-white' : 'bg-black border-gray-800 text-gray-500 hover:border-gray-600'}`}><div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${selectedModifiers.includes(group.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-600'}`}>{selectedModifiers.includes(group.id) && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}</div><span className="text-[11px] font-bold uppercase">{group.name}</span></div>))}</div></div>
                </div>
            </div>
        </div>
        <div className="p-6 border-t border-gray-800 flex justify-end gap-3 bg-gray-900 z-10">
            <button type="button" onClick={onCancel} className="px-4 py-2 font-bold text-gray-400 hover:text-white transition text-xs uppercase">Cancelar</button>
            <button onClick={handleSave} disabled={loading || uploading} className="px-8 py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase hover:bg-red-500 transition shadow-lg flex items-center gap-2 disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}<span>Confirmar</span></button>
        </div>
      </div>
    </div>
  )
}