# ReparaHub 2.9 - Cliente Unico y Recompensas

## Objetivo

ReparaHub debe tratar el telefono del cliente como el identificador operativo principal en los flujos de mostrador: Reparaciones, Ventas/POS y Bitacora de Visitas. Cada vez que un modulo capture un telefono, el sistema debe buscar al cliente existente o crearlo automaticamente para construir un expediente unico.

Esta base habilita el futuro modulo PRO de Recompensas sin duplicar datos ni depender de capturas manuales inconsistentes.

## Cliente Unico

### Regla central

- El telefono se guarda internamente solo con digitos.
- El telefono valido tiene entre 6 y 15 digitos.
- Si existe un cliente con ese telefono dentro del tenant, se reutiliza.
- Si no existe, se crea automaticamente.
- Si el nombre no se conoce, se guarda como `Cliente sin nombre`.
- WhatsApp conserva su normalizacion internacional separada, basada en el pais del taller.

### Modulos conectados

- **Reparaciones:** al crear o editar folio, el cliente se resuelve con el servicio unico.
- **Ventas/POS:** al finalizar venta con telefono, la venta queda vinculada al cliente aunque la UI no mande `cliente_id`.
- **Ticket digital por WhatsApp:** si el telefono se captura al final, se vincula la venta y se crea/reutiliza cliente antes de abrir WhatsApp.
- **Bitacora de Visitas:** cada visita conserva nombre/telefono como snapshot y, cuando hay telefono, tambien guarda `cliente_id`.
- **Clientes:** el expediente muestra reparaciones, compras POS y visitas.

## Recompensas PRO + Trial

### Posicionamiento

Recompensas sera una capacidad PRO enfocada en retencion: convertir compras, reparaciones y visitas en historial accionable para premiar clientes frecuentes.

### Configuracion

- Activar o desactivar el programa.
- Definir puntos por monto gastado.
- Definir valor de redencion por punto.
- Definir minimo de puntos para canjear.
- Definir vencimiento de puntos.
- Excluir categorias o productos.
- Elegir si suman puntos ventas, reparaciones o ambas.
- Permitir ajustes manuales con motivo y usuario responsable.
- Mostrar u ocultar puntos en ticket digital.

### Modelo de datos recomendado

- `recompensas_config`: configuracion por tenant.
- `cliente_puntos_ledger`: movimientos inmutables de puntos por cliente.
- Cada movimiento debe poder referenciar venta, reparacion, anulacion o ajuste manual.
- Las anulaciones deben crear movimientos reversos, no borrar historial.

### Experiencia de usuario

- Panel principal con clientes top, puntos emitidos, puntos redimidos y saldo pendiente.
- Buscador por telefono para revisar saldo inmediato.
- Detalle de cliente con saldo, historial de puntos y movimientos comerciales.
- Acciones de gerente para ajuste manual.
- En POS, aplicar puntos como descuento cuando el programa este activo y el cliente tenga saldo suficiente.

## Criterios de aceptacion futuros

- Un cliente puede acumular puntos por ventas POS vinculadas.
- Un cliente puede acumular puntos por reparaciones entregadas y pagadas.
- Una venta anulada revierte los puntos otorgados.
- El ticket digital puede mostrar saldo y puntos ganados.
- El modulo respeta plan PRO + Trial.
- El plan Normal no puede activar Recompensas, pero conserva el expediente unico del cliente.

## Pendientes tecnicos

- Auditar duplicados por telefono antes de agregar un indice unique por tenant.
- Migrar o retirar el flujo legacy `app/api/visitas/detect/route.ts`, que aun usa Supabase.
- Definir reglas fiscales/contables para descuentos pagados con puntos antes de habilitar redencion.
