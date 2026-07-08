'use client';

import { useState } from 'react';
import { ProductForm } from '@/components/marketplace/product-form';
import { ImageUploader } from '@/components/marketplace/image-uploader';
import { PostGenerator } from '@/components/marketplace/post-generator';
import { ExportSection } from '@/components/marketplace/export-section';
import { ArrowRight, Trash2 } from 'lucide-react';

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image?: string;
  imageWithWatermark?: string;
}

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('marketplace_products');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'products' | 'images' | 'posts' | 'export'>('products');

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleAddProduct = (product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
    };
    const updated = [...products, newProduct];
    setProducts(updated);
    localStorage.setItem('marketplace_products', JSON.stringify(updated));
    setSelectedProductId(newProduct.id);
  };

  const handleDeleteProduct = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    localStorage.setItem('marketplace_products', JSON.stringify(updated));
    if (selectedProductId === id) {
      setSelectedProductId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleUpdateProduct = (id: string, updates: Partial<Product>) => {
    const updated = products.map(p =>
      p.id === id ? { ...p, ...updates } : p
    );
    setProducts(updated);
    localStorage.setItem('marketplace_products', JSON.stringify(updated));
  };

  const steps = [
    { id: 'products' as const, label: 'Productos', number: 1 },
    { id: 'images' as const, label: 'Imagenes', number: 2 },
    { id: 'posts' as const, label: 'Publicaciones', number: 3 },
    { id: 'export' as const, label: 'Exportar', number: 4 },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-foreground">Gestor de Marketplace</h1>
            <p className="text-muted-foreground">Crea productos, agrega fotos con marca de agua y genera publicaciones</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                  currentStep === step.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {step.number}
              </button>
              <span
                className={`ml-3 text-sm font-medium ${
                  currentStep === step.id ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    steps.findIndex(s => s.id === currentStep) > index
                      ? 'bg-primary'
                      : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-40 space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Tus Productos ({products.length})</h2>
                {products.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay productos aun. Crea uno para comenzar.</p>
                ) : (
                  <div className="space-y-2">
                    {products.map(product => (
                      <div
                        key={product.id}
                        className={`flex items-between justify-between p-3 rounded-lg cursor-pointer transition-all border ${
                          selectedProductId === product.id
                            ? 'bg-primary/10 border-primary'
                            : 'bg-muted/50 border-border hover:bg-muted'
                        }`}
                      >
                        <div
                          onClick={() => setSelectedProductId(product.id)}
                          className="flex-1 min-w-0"
                        >
                          <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">${product.price}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="ml-2 p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {currentStep === 'products' && (
              <ProductForm onAddProduct={handleAddProduct} />
            )}

            {currentStep === 'images' && (
              selectedProduct ? (
                <ImageUploader
                  product={selectedProduct}
                  onUpdate={(updates) => handleUpdateProduct(selectedProduct.id, updates)}
                />
              ) : (
                <div className="bg-card border border-border rounded-lg p-12 text-center">
                  <p className="text-muted-foreground mb-4">Por favor selecciona un producto para editar imagenes</p>
                  <button
                    onClick={() => setCurrentStep('products')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
                  >
                    Crear producto <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )
            )}

            {currentStep === 'posts' && (
              selectedProduct ? (
                <PostGenerator product={selectedProduct} />
              ) : (
                <div className="bg-card border border-border rounded-lg p-12 text-center">
                  <p className="text-muted-foreground mb-4">Por favor selecciona un producto para generar publicaciones</p>
                  <button
                    onClick={() => setCurrentStep('products')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
                  >
                    Crear producto <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )
            )}

            {currentStep === 'export' && (
              <ExportSection products={products} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
