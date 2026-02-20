'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Save, X, Loader2, Image as ImageIcon } from 'lucide-react'

export default function AdminBannerForm({ onCancel, onSaved }) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleImageUpload = async (e) => {
    try {
      setUploading(true)
      if (!e.target.files || e.target.files.length === 0) return

      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('banners').getPublicUrl(filePath)
      setImageUrl(data.publicUrl)

    } catch (error) {
      alert('Error subiendo imagen: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  // ✅ FIX: handleSave ya no recibe "e" porque el form NO tiene onSubmit.
  // El único punto de entrada es el botón type="submit" dentro del form.
  // Esto elimina el doble disparo que ocurría cuando el botón del footer
  // llamaba onClick={handleSave} mientras el form ya tenía onSubmit={handleSave}.
  const handleSave = async (e) => {
    e.preventDefault()
    if (!imageUrl) return alert('¡Debes subir una imagen!')

    setLoading(true)
    try {
      const { error } = await supabase
        .from('banners')
        .insert([{
          title,
          image_url: imageUrl,
          is_active: true
        }])

      if (error) throw error
      onSaved()

    } catch (error) {
      console.error(error)
      alert('Error guardando banner')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-gray-900 w-full max-w-md rounded-2xl border border-gray-800 shadow-2xl flex flex-col">

        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon size={20} className="text-red-600" /> Nuevo Banner
          </h2>
          {/* ✅ FIX: El botón X usa type="button" para no disparar el submit del form */}
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white"><X /></button>
        </div>

        {/* ✅ FIX: Solo el form tiene onSubmit. El botón Publicar es type="submit".
            El botón Cancelar es type="button" para no interferir. */}
        <form onSubmit={handleSave} className="p-6 space-y-6">

          {/* Subida de Imagen */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Imagen del Banner</label>
            <div className="relative overflow-hidden bg-black border border-gray-700 rounded-xl aspect-video flex items-center justify-center group cursor-pointer hover:border-gray-500 transition">
              {imageUrl ? (
                <img src={imageUrl} className="w-full h-full object-cover" alt="Preview banner" />
              ) : (
                <div className="text-gray-500 flex flex-col items-center">
                  {uploading ? <Loader2 className="animate-spin mb-2" /> : <ImageIcon size={32} className="mb-2" />}
                  <span className="text-xs">{uploading ? 'Subiendo...' : 'Click para subir foto'}</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={uploading}
              />
            </div>
            <p className="text-[10px] text-gray-500">Recomendado: Formato horizontal (ej: 1200x400)</p>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Título (Opcional)</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-red-500 placeholder-gray-700"
              placeholder="Ej: 2x1 Jueves..."
            />
          </div>

          {/* Footer dentro del form para que type="submit" funcione correctamente */}
          <div className="pt-4 border-t border-gray-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg font-bold text-gray-400 hover:bg-gray-800 transition text-sm"
            >
              Cancelar
            </button>
            {/* ✅ FIX: type="submit" — un solo punto de disparo, sin onClick adicional */}
            <button
              type="submit"
              disabled={loading || uploading || !imageUrl}
              className="px-6 py-2 rounded-lg font-bold bg-red-600 text-white hover:bg-red-500 transition shadow-lg flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Publicar</>}
            </button>
          </div>

        </form>

      </div>
    </div>
  )
}