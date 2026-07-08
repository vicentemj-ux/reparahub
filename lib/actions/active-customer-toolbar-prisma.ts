"use server"

import { searchClients, type Client } from "@/lib/actions/clients-prisma"
import { resolveCurrentTenantClienteByTelefono } from "@/lib/actions/client-resolver-prisma"

export async function searchToolbarCustomers(query: string): Promise<{ clients: Client[]; error: string | null }> {
  return searchClients(query)
}

export async function resolveToolbarCustomerByPhone(phone: string, nombre?: string) {
  return resolveCurrentTenantClienteByTelefono({
    telefono: phone,
    nombre: nombre?.trim() || "",
    notasOrigen: "Sesion activa desde barra superior",
  })
}
