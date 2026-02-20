import { useState, useMemo, useEffect } from 'react';
import { X, Check, PenLine } from 'lucide-react';

// ✅ FIX: Helper para formatear precios sin decimales sucios.
// El problema: sumar floats en JS da resultados como 1250.0000000002
// porque los números de punto flotante no son exactos en binario.
// Ejemplo: 1200 + 50.10 = 1250.1000000000001
//
// Solución: redondeamos a 2 decimales y luego usamos toLocaleString
// para mostrar el separador de miles con formato argentino.
function formatPrice(amount) {
  // Math.round(n * 100) / 100 es más preciso que toFixed() para aritmética
  const rounded = Math.round(amount * 100) / 100
  // Si el resultado es entero, no mostramos decimales (ej: $1.250 en vez de $1.250,00)
  return rounded % 1 === 0
    ? rounded.toLocaleString('es-AR')
    : rounded.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ProductModal({ product, isOpen, onClose, onAddToCart }) {
  const [selectedOptions, setSelectedOptions] = useState({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  // 1. Reiniciar estado al abrir
  useEffect(() => {
    if (isOpen) {
      setSelectedOptions({});
      setQty(1);
      setNote('');
    }
  }, [isOpen, product]);

  const groups = product?.modifiers || [];

  // 2. Calcular precio unitario
  const unitPrice = useMemo(() => {
    if (!product) return 0;
    let extraCost = 0;
    groups.forEach(group => {
      const options = group.modifier_options || [];
      options.forEach(opt => {
        if (selectedOptions[opt.id]) {
          extraCost += Number(opt.price);
        }
      });
    });
    // ✅ FIX: Redondeamos el unitPrice ya en el useMemo para que el valor
    // guardado en el carrito también sea limpio, no solo el display.
    return Math.round((Number(product.price) + extraCost) * 100) / 100;
  }, [product, selectedOptions, groups]);

  if (!isOpen || !product) return null;

  // 3. Handlers
  const handleToggleOption = (group, option) => {
    if (group.min_selection === 1 && group.max_selection === 1) {
      // Radio (selección única)
      const newSelection = { ...selectedOptions };
      group.modifier_options.forEach(o => delete newSelection[o.id]);
      newSelection[option.id] = true;
      setSelectedOptions(newSelection);
    } else {
      // Checkbox (selección múltiple)
      setSelectedOptions(prev => {
        const isSelected = !!prev[option.id];
        const currentCount = group.modifier_options.filter(o => prev[o.id]).length;

        if (isSelected) {
          const newState = { ...prev };
          delete newState[option.id];
          return newState;
        } else {
          if (group.max_selection && currentCount >= group.max_selection) {
            return prev; // Límite alcanzado
          }
          return { ...prev, [option.id]: true };
        }
      });
    }
  };

  const handleAddToOrder = () => {
    // Validar obligatorios
    const missingRequired = groups.filter(g => {
      if (g.min_selection > 0) {
        const count = g.modifier_options.filter(o => selectedOptions[o.id]).length;
        return count < g.min_selection;
      }
      return false;
    });

    if (missingRequired.length > 0) {
      alert(`⚠️ Por favor selecciona opciones en: ${missingRequired[0].name}`);
      return;
    }

    // Preparar lista de opciones elegidas
    const optionsList = [];
    groups.forEach(g => {
      g.modifier_options.forEach(o => {
        if (selectedOptions[o.id]) {
          optionsList.push({ name: o.name, price: o.price });
        }
      });
    });

    onAddToCart({
      ...product,
      selectedOptions: optionsList,
      price: unitPrice, // Ya viene redondeado del useMemo
      quantity: qty,
      note: note
    });
    onClose();
  };

  // ✅ FIX: Calculamos el total para mostrar en el botón usando el helper,
  // evitando que aparezca "$1250.0000000002" cuando hay extras con decimales.
  // Antes: ${unitPrice * qty}  →  podía dar "1250.1000000000001"
  // Ahora: formatPrice(unitPrice * qty)  →  siempre da "1.250,10" o "1.250"
  const totalDisplay = formatPrice(unitPrice * qty)

  // 4. Renderizado
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">

      <div className="bg-gray-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-gray-800 text-gray-200">

        {/* Imagen Header */}
        <div className="relative h-48 sm:h-56 bg-gray-800 shrink-0">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-600">🍔</div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition border border-gray-700"
          >
            <X size={20} />
          </button>
          <div className="absolute bottom-0 w-full h-20 bg-gradient-to-t from-gray-900 to-transparent"></div>
        </div>

        {/* Scroll Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-900 custom-scrollbar">

          {/* Info Producto */}
          <div>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">{product.name}</h2>
            <p className="text-gray-400 text-sm leading-relaxed">{product.description}</p>
          </div>

          <hr className="border-gray-800" />

          {/* Extras */}
          {groups.length > 0 ? (
            groups.map(group => (
              <div key={group.id} className="space-y-3">
                <div className="flex justify-between items-end">
                  <h3 className="font-bold text-white uppercase text-sm tracking-wide">{group.name}</h3>
                  <div className="flex gap-2">
                    {group.min_selection > 0 && (
                      <span className="text-[10px] bg-red-900/40 text-red-400 px-2 py-0.5 rounded border border-red-900/50 font-bold uppercase">Obligatorio</span>
                    )}
                    {group.max_selection > 1 && (
                      <span className="text-[10px] text-gray-500 font-bold bg-gray-800 px-2 py-0.5 rounded border border-gray-700">Max: {group.max_selection}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {group.modifier_options?.map(option => {
                    const isSelected = !!selectedOptions[option.id];
                    return (
                      <div
                        key={option.id}
                        onClick={() => option.is_available && handleToggleOption(group, option)}
                        className={`flex justify-between items-center p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.98] 
                          ${!option.is_available ? 'opacity-50 grayscale cursor-not-allowed bg-gray-800' : ''}
                          ${isSelected ? 'border-red-600 bg-red-900/10 shadow-[0_0_15px_rgba(220,38,38,0.1)]' : 'border-gray-800 bg-black/40 hover:border-gray-600'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'border-red-500 bg-red-600 text-white' : 'border-gray-600 bg-transparent'}`}>
                            {isSelected && <Check size={12} strokeWidth={4} />}
                          </div>
                          <span className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>{option.name}</span>
                        </div>
                        {/* ✅ FIX: También formateamos el precio de cada extra para consistencia */}
                        <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                          {Number(option.price) > 0 ? `+$${formatPrice(Number(option.price))}` : 'Gratis'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-600 text-xs italic">Este producto no tiene ingredientes extra.</p>
          )}

          {/* SECCIÓN NOTA DE PEDIDO */}
          <div className="bg-black/30 p-4 rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <PenLine size={14} className="text-yellow-500" />
              <h3 className="font-bold text-white text-xs uppercase tracking-wide">¿Alguna aclaración?</h3>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:border-yellow-500 outline-none placeholder-gray-600 resize-none transition-all focus:ring-1 focus:ring-yellow-500/50"
              rows="2"
              placeholder="Ej: Sin sal, la carne bien cocida, sin mayonesa..."
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-900 border-t border-gray-800 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-black border border-gray-700 rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-10 h-10 flex items-center justify-center font-bold text-lg text-gray-400 hover:text-white transition active:scale-90"
              >-</button>
              <span className="w-8 text-center font-bold text-white text-lg">{qty}</span>
              <button
                type="button"
                onClick={() => setQty(qty + 1)}
                className="w-10 h-10 flex items-center justify-center font-bold text-lg text-gray-400 hover:text-white transition active:scale-90"
              >+</button>
            </div>

            <button
              type="button"
              onClick={handleAddToOrder}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl text-lg flex justify-between px-6 shadow-lg shadow-red-900/30 transition-all active:scale-95 border-t border-red-400"
            >
              <span>AGREGAR</span>
              {/* ✅ FIX: Usamos totalDisplay en lugar de unitPrice * qty directamente */}
              <span>${totalDisplay}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}