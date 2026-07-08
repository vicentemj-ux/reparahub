'use client';

import { useState } from 'react';
import { File, Table2, FileText } from 'lucide-react';
import type { Product } from '@/app/herramientas/marketplace/page';

interface ExportSectionProps {
  products: Product[];
}

export function ExportSection({ products }: ExportSectionProps) {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>('json');

  const exportAsJSON = () => {
    const dataStr = JSON.stringify(products, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `productos_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    const headers = ['Nombre', 'Categoria', 'Precio', 'Descripcion'];
    const rows = products.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category.replace(/"/g, '""')}"`,
      p.price,
      `"${p.description.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `productos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAsHTML = () => {
    let htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Productos - Catalogo</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
            color: #333;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        .card {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .card-content {
            padding: 20px;
        }
        .category {
            display: inline-block;
            background: #e3f2fd;
            color: #1976d2;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-bottom: 10px;
        }
        .name {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
        }
        .description {
            font-size: 14px;
            color: #666;
            margin-bottom: 12px;
            line-height: 1.5;
        }
        .price {
            font-size: 24px;
            font-weight: bold;
            color: #1976d2;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Catalogo de Productos</h1>
        <div class="grid">
`;

    products.forEach(p => {
      htmlContent += `
            <div class="card">
                <div class="card-content">
                    <div class="category">${p.category}</div>
                    <div class="name">${p.name}</div>
                    <div class="description">${p.description}</div>
                    <div class="price">$${p.price.toFixed(2)}</div>
                </div>
            </div>
`;
    });

    htmlContent += `
        </div>
        <div class="footer">
            <p>Catalogo generado con Taller Cloud * ${new Date().toLocaleDateString('es-ES')}</p>
        </div>
    </div>
</body>
</html>
`;

    const dataBlob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalogo_${new Date().toISOString().split('T')[0]}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {products.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <File className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No hay productos para exportar</p>
          <p className="text-sm text-muted-foreground">Crea algunos productos primero para poder exportarlos</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Resumen</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-primary">{products.length}</p>
                <p className="text-sm text-muted-foreground">Productos</p>
              </div>
              <div className="bg-secondary/10 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-secondary-foreground">
                  ${products.reduce((sum, p) => sum + p.price, 0).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Valor total</p>
              </div>
              <div className="bg-accent/10 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-accent-foreground">
                  ${(products.reduce((sum, p) => sum + p.price, 0) / products.length).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Precio promedio</p>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Exportar Datos</h3>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                onClick={exportAsJSON}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <File className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="font-medium text-sm text-foreground">JSON</span>
              </button>
              <button
                onClick={exportAsCSV}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <Table2 className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="font-medium text-sm text-foreground">CSV</span>
              </button>
              <button
                onClick={exportAsHTML}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <FileText className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="font-medium text-sm text-foreground">HTML</span>
              </button>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>JSON:</strong> Para importar datos en otras aplicaciones o hacer backup completo.
              </p>
              <p>
                <strong>CSV:</strong> Compatible con Excel, Google Sheets y otras herramientas de analisis.
              </p>
              <p>
                <strong>HTML:</strong> Catalogo visual listo para compartir o publicar en tu sitio web.
              </p>
            </div>
          </div>

          {/* Products List */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Tus Productos ({products.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-foreground">Nombre</th>
                    <th className="text-left py-2 px-3 font-medium text-foreground">Categoria</th>
                    <th className="text-right py-2 px-3 font-medium text-foreground">Precio</th>
                    <th className="text-left py-2 px-3 font-medium text-foreground">Descripcion</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-3 text-foreground">{product.name}</td>
                      <td className="py-3 px-3 text-muted-foreground">{product.category}</td>
                      <td className="py-3 px-3 text-right font-medium text-foreground">${product.price.toFixed(2)}</td>
                      <td className="py-3 px-3 text-muted-foreground truncate max-w-xs">{product.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
