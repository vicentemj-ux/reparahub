'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Download, Trash2 } from 'lucide-react';
import type { Product } from '@/app/herramientas/marketplace/page';

interface ImageUploaderProps {
  product: Product;
  onUpdate: (updates: Partial<Product>) => void;
}

export function ImageUploader({ product, onUpdate }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [watermarkText, setWatermarkText] = useState('MARCA DE AGUA');
  const [watermarkPosition, setWatermarkPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'>('bottom-right');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      onUpdate({ image: imageData });
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!product.image || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const maxWidth = 600;
      const maxHeight = 600;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      setImageSize({ width, height });

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, width, height);

      // Draw watermark
      const fontSize = Math.max(width, height) * 0.08;
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = `rgba(255, 255, 255, ${watermarkOpacity})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const padding = 20;
      let x = width / 2;
      let y = height / 2;

      switch (watermarkPosition) {
        case 'top-left':
          x = fontSize + padding;
          y = fontSize + padding;
          break;
        case 'top-right':
          x = width - fontSize - padding;
          y = fontSize + padding;
          break;
        case 'bottom-left':
          x = fontSize + padding;
          y = height - fontSize - padding;
          break;
        case 'bottom-right':
          x = width - fontSize - padding;
          y = height - fontSize - padding;
          break;
        case 'center':
          x = width / 2;
          y = height / 2;
          break;
      }

      // Add shadow for better visibility
      ctx.strokeStyle = `rgba(0, 0, 0, ${watermarkOpacity * 0.7})`;
      ctx.lineWidth = 3;
      ctx.strokeText(watermarkText, x, y);
      ctx.fillText(watermarkText, x, y);
    };
    img.src = product.image;
  }, [product.image, watermarkOpacity, watermarkText, watermarkPosition]);

  const downloadWatermarkedImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.href = canvasRef.current.toDataURL('image/jpeg', 0.95);
    link.download = `${product.name.replace(/\s+/g, '_')}_watermark.jpg`;
    link.click();
  };

  const removeImage = () => {
    onUpdate({ image: undefined, imageWithWatermark: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-3 py-8 text-center"
        >
          <Upload className="w-12 h-12 text-muted-foreground" />
          <div>
            <p className="font-semibold text-foreground">
              {product.image ? 'Cambiar imagen' : 'Arrastra tu imagen aqui'}
            </p>
            <p className="text-sm text-muted-foreground">
              o haz clic para seleccionar
            </p>
          </div>
        </button>
      </div>

      {product.image && (
        <>
          {/* Settings */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Configurar Marca de Agua</h3>
              
              <div className="space-y-4">
                {/* Watermark Text */}
                <div className="space-y-2">
                  <label htmlFor="watermark-text" className="block text-sm font-medium text-foreground">
                    Texto de Marca de Agua
                  </label>
                  <input
                    id="watermark-text"
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value.toUpperCase())}
                    maxLength={20}
                    placeholder="MARCA DE AGUA"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Position */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Posicion
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setWatermarkPosition(pos)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors border ${
                          watermarkPosition === pos
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                        }`}
                      >
                        {pos === 'top-left' && 'Arriba Izq'}
                        {pos === 'top-right' && 'Arriba Der'}
                        {pos === 'center' && 'Centro'}
                        {pos === 'bottom-left' && 'Abajo Izq'}
                        {pos === 'bottom-right' && 'Abajo Der'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opacity */}
                <div className="space-y-2">
                  <label htmlFor="opacity" className="block text-sm font-medium text-foreground">
                    Opacidad: {Math.round(watermarkOpacity * 100)}%
                  </label>
                  <input
                    id="opacity"
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Vista Previa</h3>
            <div className="flex justify-center bg-muted/50 rounded-lg p-4 mb-4">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto rounded"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={downloadWatermarkedImage}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar Imagen
              </button>
              <button
                onClick={removeImage}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg font-medium hover:bg-destructive/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
