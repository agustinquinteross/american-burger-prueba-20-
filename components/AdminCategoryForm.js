import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Plus, Trash2, Edit, Save, Loader2 } from 'lucide-react';

export default function AdminCategoryForm({ onCancel, onSaved }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estado para la nueva categoría o la que estamos editando
  const [currentCategory, setCurrentCategory] = useState({ id: null, name: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('id');
    
    if (!error && data) setCategories(data);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentCategory.name.trim()) return;

    setSaving(true);
    try {
      if (isEditing && currentCategory.id) {
        // Actualizar
        const { error } = await supabase
          .from('categories')
          .update({ name: currentCategory.name })
          .eq('id', currentCategory.id);
        if (error) throw error;
      } else {
        // Crear nueva
        const { error } = await supabase
          .from('categories')
          .insert([{ name: currentCategory.name }]);
        if (error) throw error;
      }
      
      // Limpiar y recargar
      setCurrentCategory({ id: null, name: '' });
      setIsEditing(false);
      await fetchCategories();
      onSaved(); // Avisamos al padre que hubo cambios
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error al guardar la categoría.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setCurrentCategory(category);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro? Los productos en esta categoría podrían quedar huérfanos.')) return;
    
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchCategories();
      onSaved();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error al eliminar. Verifica que no haya productos usando esta categoría.');
    }
  };

  const resetForm = () => {
    setCurrentCategory({ id: null, name: '' });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/50 rounded-t-2xl">
          <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">
            Gestión de Categorías
          </h2>
          <button onClick={onCancel} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Formulario Crear/Editar */}
        <div className="p-4 border-b border-gray-800 bg-black/30">
          <form onSubmit={handleSave} className="flex gap-2">
            <input
              type="text"
              placeholder="Nombre de la categoría..."
              className="flex-1 bg-black border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-red-600 transition-colors placeholder:text-gray-600 text-sm"
              value={currentCategory.name}
              onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
              required
            />
            <button 
              type="submit" 
              disabled={saving || !currentCategory.name.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin"/> : (isEditing ? <Save size={16}/> : <Plus size={16}/>)}
              {isEditing ? 'Guardar' : 'Crear'}
            </button>
            {isEditing && (
              <button type="button" onClick={resetForm} className="px-3 py-2.5 bg-gray-800 text-gray-400 hover:text-white rounded-lg transition">
                <X size={16} />
              </button>
            )}
          </form>
        </div>

        {/* Lista de Categorías */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-red-600" /></div>
          ) : (
            <div className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">No hay categorías. Crea la primera.</p>
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} className="flex justify-between items-center bg-black border border-gray-800 p-3 rounded-xl hover:border-gray-600 transition group">
                    <span className="font-bold text-gray-200">{cat.name}</span>
                    <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(cat)} className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded transition">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-red-500 hover:bg-red-900/30 rounded transition">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}