'use client';

import { useState } from 'react';
import { Copy, RefreshCw, Check } from 'lucide-react';
import type { Product } from '@/app/herramientas/marketplace/page';

interface PostGeneratorProps {
  product: Product;
}

const templates = [
  {
    id: 'simple',
    name: 'Publicacion Simple',
    template: (p: Product) => `
🛍️ ${p.name}
💰 ${p.category ? `Categoria: ${p.category}` : ''}

${p.description}

📍 Precio especial: $${p.price}

¿Te interesa? ¡Envianos un mensaje!

#ecommerce #venta #marketplace
    `.trim(),
  },
  {
    id: 'promotional',
    name: 'Publicacion Promocional',
    template: (p: Product) => `
🔥 ¡OFERTA ESPECIAL! 🔥

${p.name.toUpperCase()}

${p.description}

💵 Solo $${p.price}

Este producto es perfecto para ti. No te lo pierdas.

📲 ¡Compra ahora!

#oferta #limitado #compraahora
    `.trim(),
  },
  {
    id: 'detailed',
    name: 'Publicacion Detallada',
    template: (p: Product) => `
📦 ${p.name} - ${p.category}

Descripcion:
${p.description}

Caracteristicas:
✨ Calidad premium
✨ Entrega rapida
✨ Garantia incluida

💲 Precio: $${p.price}

¿Preguntas? Estamos aqui para ayudarte.

Haz tu pedido hoy mismo.

#tienda #calidad #satisfaccion
    `.trim(),
  },
  {
    id: 'urgent',
    name: 'Publicacion Urgente',
    template: (p: Product) => `
⏰ ¡ATENCION! ⏰

Tenemos disponible: ${p.name}

${p.description}

💰 A solo $${p.price}

Stock limitado. 
¡COMPRA AHORA!

#urgente #disponible #rapido
    `.trim(),
  },
];

export function PostGenerator({ product }: PostGeneratorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('simple');
  const [customPost, setCustomPost] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedTemplateObj = templates.find(t => t.id === selectedTemplate);
  const postContent = isCustom ? customPost : (selectedTemplateObj?.template(product) || '');

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(postContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateTemplate = () => {
    if (!isCustom && selectedTemplateObj) {
      setCustomPost(selectedTemplateObj.template(product));
    }
  };

  return (
    <div className="space-y-6">
      {/* Templates Selection */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Plantillas de Publicacion</h3>
        <div className="grid grid-cols-2 gap-3">
          {templates.map(template => (
            <button
              key={template.id}
              onClick={() => {
                setSelectedTemplate(template.id);
                setIsCustom(false);
              }}
              className={`p-4 rounded-lg border transition-all text-left ${
                !isCustom && selectedTemplate === template.id
                  ? 'bg-primary/10 border-primary'
                  : 'bg-muted/50 border-border hover:border-primary/50'
              }`}
            >
              <p className="font-medium text-sm text-foreground">{template.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Vista Previa</h3>
          {postContent && (
            <span className="text-xs text-muted-foreground">
              {postContent.length} caracteres
            </span>
          )}
        </div>

        <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-border min-h-48 max-h-96 overflow-y-auto">
          <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
            {postContent}
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={handleCopyToClipboard}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              copied
                ? 'bg-green-500/10 text-green-600'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar al portapapeles
              </>
            )}
          </button>
          <button
            onClick={handleRegenerateTemplate}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Custom Edit */}
        <div className="space-y-2 border-t border-border pt-6">
          <label htmlFor="custom-post" className="block text-sm font-medium text-foreground">
            Editar Publicacion
          </label>
          <textarea
            id="custom-post"
            value={isCustom ? customPost : postContent}
            onChange={(e) => {
              setCustomPost(e.target.value);
              setIsCustom(true);
            }}
            rows={6}
            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Edita tu publicacion aqui..."
          />
        </div>
      </div>

      {/* Info */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-foreground">
          💡 <strong>Consejo:</strong> Puedes editar cualquier publicacion. Los hashtags y emojis ayudan a mejorar el alcance en redes sociales.
        </p>
      </div>
    </div>
  );
}
