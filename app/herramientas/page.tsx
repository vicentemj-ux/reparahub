import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';

export const metadata = {
  title: 'Herramientas Gratuitas | Taller Cloud',
  description: 'Herramientas gratis para gestionar tu negocio: generador de publicaciones, editor de imagenes con marca de agua y mas.',
};

export default function HerramientasPage() {
  const tools = [
    {
      id: 'marketplace',
      title: 'Gestor de Marketplace',
      description: 'Crea productos, agrega fotos con marca de agua y genera publicaciones listas para tu marketplace.',
      icon: <Zap className="w-8 h-8" />,
      href: '/herramientas/marketplace',
      features: ['Formulario de productos', 'Editor de imagenes', 'Marca de agua automatica', 'Generador de posts', 'Exportar en multiples formatos'],
      badge: 'Mas popular',
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
              <Zap className="w-4 h-4" />
              Herramientas Gratuitas
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
              Herramientas para tu negocio
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Acceso gratuito a herramientas poderosas disenadas para ayudarte a gestionar y promocionar tu negocio sin costo alguno.
            </p>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-1 gap-8">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="group relative bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-8 sm:p-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg text-primary group-hover:bg-primary/20 transition-colors">
                      {tool.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-2xl font-bold text-foreground">{tool.title}</h2>
                        {tool.badge && (
                          <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-semibold rounded">
                            {tool.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground">{tool.description}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Caracteristicas incluidas:</h3>
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {tool.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={tool.href}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors group"
                >
                  Abrir herramienta
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-b from-background to-primary/5 border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              ¿Necesitas mas funcionalidades?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Nuestro plan premium de Taller Cloud ofrece automaciones avanzadas, integracion con multiples marketplaces y gestion completa de tu negocio.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/#pricing"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Ver planes premium
              </Link>
              <Link
                href="/"
                className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
