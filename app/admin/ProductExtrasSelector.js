import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Este componente va DENTRO de tu formulario de Admin
export default function ProductExtrasSelector({ productId }) {
  const [allGroups, setAllGroups] = useState([]);
  const [activeGroupIds, setActiveGroupIds] = useState([]);

  useEffect(() => {
    loadData();
  }, [productId]);

  async function loadData() {
    // 1. Cargar TODOS los grupos disponibles (Punto carne, Salsas, etc)
    const { data: groups } = await supabase.from('modifier_groups').select('*');
    setAllGroups(groups || []);

    // 2. Si estamos editando un producto, ver cuáles ya tiene asignados
    if (productId) {
      const { data: relations } = await supabase
        .from('product_modifiers')
        .select('group_id')
        .eq('product_id', productId);
      
      if (relations) {
        setActiveGroupIds(relations.map(r => r.group_id));
      }
    }
  }

  const toggleGroup = async (groupId) => {
    const isSelected = activeGroupIds.includes(groupId);

    if (isSelected) {
      // BORRAR relación
      await supabase
        .from('product_modifiers')
        .delete()
        .match({ product_id: productId, group_id: groupId });
        
      setActiveGroupIds(prev => prev.filter(id => id !== groupId));
    } else {
      // CREAR relación
      await supabase
        .from('product_modifiers')
        .insert({ product_id: productId, group_id: groupId });
        
      setActiveGroupIds(prev => [...prev, groupId]);
    }
  };

  if (!productId) return <p className="text-sm text-gray-500">Guarda el producto primero para asignarle extras.</p>;

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
      <h3 className="font-bold text-gray-700 mb-3">🍔 Asignar Extras a este Producto</h3>
      <div className="grid grid-cols-1 gap-2">
        {allGroups.map(group => {
          const isActive = activeGroupIds.includes(group.id);
          return (
            <div 
              key={group.id} 
              onClick={() => toggleGroup(group.id)}
              className={`
                flex items-center justify-between p-3 rounded-md cursor-pointer border transition-all
                ${isActive ? 'bg-green-50 border-green-500' : 'bg-white border-gray-200 hover:border-gray-400'}
              `}
            >
              <div>
                <span className="font-bold text-gray-800">{group.name}</span>
                <span className="text-xs text-gray-500 ml-2">
                   ({group.min_selection === 1 && group.max_selection === 1 ? 'Radio' : 'Checkbox'})
                </span>
              </div>
              <div className={`w-5 h-5 rounded border flex items-center justify-center ${isActive ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                {isActive && <span className="text-white text-xs">✓</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}