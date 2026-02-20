'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Save, X, Loader2, Layers } from 'lucide-react'

export default function AdminGroupForm({ groupToEdit, onCancel, onSaved }) {
  const [loading, setLoading] = useState(false)
  
  // Estados del Formulario
  const [name, setName] = useState('')
  const [type, setType] = useState('single') // 'single' (Radio) o 'multiple' (Checkbox)
  const [isRequired, setIsRequired] = useState(true) // ¿Obligatorio?
  const [maxSelection, setMaxSelection] = useState(5) // Solo para múltiple

  useEffect(() => {
    if (groupToEdit) {
      setName(groupToEdit.name)
      // Deducir lógica basada en min/max
      if (groupToEdit.max_selection === 1 && groupToEdit.min_selection === 1) {
        setType('single')
        setIsRequired(true)
      } else {
        setType('multiple')
        setIsRequired(groupToEdit.min_selection > 0)
        setMaxSelection(groupToEdit.max_selection || 5)
      }
    }
  }, [groupToEdit])

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Calcular reglas para la DB
      let minSel = 0
      let maxSel = 0

      if (type === 'single') {
        // Selección Única siempre es 1 y 1 (Radio Button)
        minSel = 1
        maxSel = 1
      } else {
        // Selección Múltiple
        minSel = isRequired ? 1 : 0
        maxSel = parseInt(maxSelection) || 5
      }

      const groupData = {
        name,
        min_selection: minSel,
        max_selection: maxSel
      }

      if (groupToEdit) {
        const { error } = await supabase.from('modifier_groups').update(groupData).eq('id', groupToEdit.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('modifier_groups').insert(groupData)
        if (error) throw error
      }

      onSaved()

    } catch (error) {
      console.error(error)
      alert('Error guardando grupo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-gray-900 w-full max-w-md rounded-2xl border border-gray-800 shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers size={20} className="text-red-600"/> 
            {groupToEdit ? 'Editar Grupo' : 'Nuevo Grupo de Extras'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white"><X /></button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          
          {/* Nombre */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Nombre del Grupo</label>
            <input 
                required 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-red-500 outline-none placeholder-gray-600"
                placeholder="Ej: Salsas, Punto de Carne, Bebidas..." 
            />
          </div>

          {/* Tipo de Selección */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Tipo de Selección</label>
            <div className="grid grid-cols-2 gap-3">
                <div onClick={() => setType('single')} className={`cursor-pointer border rounded-lg p-3 text-center transition ${type === 'single' ? 'bg-red-900/20 border-red-500 text-white' : 'bg-black border-gray-700 text-gray-500'}`}>
                    <div className="font-bold text-sm">Única (Radio)</div>
                    <div className="text-[10px]">El usuario elige solo 1 opción.</div>
                </div>
                <div onClick={() => setType('multiple')} className={`cursor-pointer border rounded-lg p-3 text-center transition ${type === 'multiple' ? 'bg-red-900/20 border-red-500 text-white' : 'bg-black border-gray-700 text-gray-500'}`}>
                    <div className="font-bold text-sm">Múltiple (Checkbox)</div>
                    <div className="text-[10px]">El usuario puede elegir varias.</div>
                </div>
            </div>
          </div>

          {/* Configuración Adicional */}
          <div className="bg-black/50 p-4 rounded-lg border border-gray-800 space-y-4">
              
              {/* Obligatorio Toggle */}
              <div className="flex justify-between items-center">
                  <div>
                      <div className="text-sm font-bold text-gray-300">¿Es Obligatorio?</div>
                      <div className="text-xs text-gray-500">¿Debe elegir al menos 1 opción?</div>
                  </div>
                  <input type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} className="w-5 h-5 accent-red-600 cursor-pointer"/>
              </div>

              {/* Máximo (Solo múltiple) */}
              {type === 'multiple' && (
                  <div className="pt-3 border-t border-gray-700">
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-bold text-gray-300">Máximo permitido</div>
                        <input 
                            type="number" 
                            min="1" 
                            value={maxSelection} 
                            onChange={e => setMaxSelection(e.target.value)}
                            className="w-16 bg-gray-900 border border-gray-700 rounded p-1 text-center text-white outline-none focus:border-red-500"
                        />
                      </div>
                  </div>
              )}
          </div>

        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg font-bold text-gray-400 hover:bg-gray-800 transition text-sm">Cancelar</button>
          <button onClick={handleSave} disabled={loading} className="px-6 py-2 rounded-lg font-bold bg-red-600 text-white hover:bg-red-500 transition shadow-lg flex items-center gap-2 text-sm">
            {loading ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Guardar Grupo</>}
          </button>
        </div>

      </div>
    </div>
  )
}