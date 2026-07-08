'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Product } from '@/app/herramientas/marketplace/page';

interface ProductFormProps {
  onAddProduct: (product: Omit<Product, 'id'>) => void;
}

const categories = [
  'Electronica',
  'Ropa',
  'Accesorios',
  'Hogar',
  'Deportes',
  'Belleza',
  'Libros',
  'Juguetes',
  'Otro',
];

export function ProductForm({ onAddProduct }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: 'Otro',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'El precio debe ser mayor a 0';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'La descripcion es requerida';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onAddProduct({
      name: formData.name.trim(),
      price: parseFloat(formData.price),
      description: formData.description.trim(),
      category: formData.category,
    });

    setFormData({
      name: '',
      price: '',
      description: '',
      category: 'Otro',
    });
    setErrors({});
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-8">
      <h2 className="text-2xl font-bold text-foreground mb-6">Crear Nuevo Producto</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-foreground">
            Nombre del producto
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="Ej: Zapatos deportivos azules"
            className={`w-full px-4 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground transition-colors ${
              errors.name ? 'border-destructive' : 'border-border'
            } focus:outline-none focus:ring-2 focus:ring-primary/50`}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        {/* Price */}
        <div className="space-y-2">
          <label htmlFor="price" className="block text-sm font-medium text-foreground">
            Precio
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-muted-foreground">$</span>
            <input
              id="price"
              name="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={handleChange}
              placeholder="0.00"
              className={`w-full pl-8 pr-4 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground transition-colors ${
                errors.price ? 'border-destructive' : 'border-border'
              } focus:outline-none focus:ring-2 focus:ring-primary/50`}
            />
          </div>
          {errors.price && (
            <p className="text-sm text-destructive">{errors.price}</p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label htmlFor="category" className="block text-sm font-medium text-foreground">
            Categoria
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-foreground">
            Descripcion
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe los detalles de tu producto..."
            rows={4}
            className={`w-full px-4 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground transition-colors resize-none ${
              errors.description ? 'border-destructive' : 'border-border'
            } focus:outline-none focus:ring-2 focus:ring-primary/50`}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Crear Producto
        </button>
      </form>
    </div>
  );
}
