'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClientsTable } from "@/components/dashboard/clients-table"
import { ClientDetailModal } from "@/components/dashboard/client-detail-modal"
import { ClientEditModal } from "@/components/dashboard/client-edit-modal"
import { ClientCreateModal } from "@/components/dashboard/client-create-modal"
import { ClientsSearchFilter } from "@/components/dashboard/clients-search-filter"
import { ModuleHeader } from "@/components/dashboard/module-header"
import { getAllClients, searchClients, getClientDetail, deleteClient } from "@/lib/actions/clients-prisma"
import type { Client, ClientDetail } from "@/lib/actions/clients-prisma"
import { Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    setLoading(true)
    const { clients: data, error } = await getAllClients()
    if (!error) setClients(data)
    setLoading(false)
  }

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadClients()
      return
    }
    setLoading(true)
    const { clients: data, error } = await searchClients(query)
    if (!error) setClients(data)
    setLoading(false)
  }, [])

  const handleView = async (client: Client) => {
    const { client: detail, error } = await getClientDetail(client.id)
    if (!error && detail) {
      setSelectedClient(detail)
      setDetailOpen(true)
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setEditOpen(true)
  }

  const handleDelete = async (client: Client) => {
    const { success } = await deleteClient(client.id)
    if (success) {
      setClients((prev) => prev.filter((c) => c.id !== client.id))
    }
  }

  const handleSaveEdit = async (updatedClient: Client) => {
    setClients((prev) =>
      prev.map((c) => (c.id === updatedClient.id ? { ...updatedClient, ordenes_count: c.ordenes_count } : c))
    )
    setEditOpen(false)
  }

  const handleSaveCreate = async (newClient: Client) => {
    setClients((prev) => [newClient, ...prev])
    setCreateOpen(false)
  }

  return (
    <div className="min-h-screen bg-dashboard-surface">
      <div className="flex w-full min-w-0 flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
      <ModuleHeader
        icon={Users}
        title="CLIENTES"
        eyebrow="DIRECTORIO Y EXPEDIENTE DE REPARACIONES"
        description="Consulta clientes, revisa su historial y mantén sus datos listos para ventas y reparaciones."
        stats={[
          {
            label: loading ? "Cargando" : clients.length === 1 ? "Cliente" : "Clientes",
            value: loading ? "-" : clients.length.toLocaleString("es-MX"),
            tone: "blue",
          },
        ]}
        actions={(
          <Button
            type="button"
            className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 btn-glow"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo cliente
          </Button>
        )}
      />

      {/* Search */}
      <ClientsSearchFilter onSearch={handleSearch} isLoading={loading} />

      {/* Cards grid */}
      <ClientsTable
        clients={clients}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={loading}
      />

      {/* Modals */}
      <ClientDetailModal
        client={selectedClient}
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setSelectedClient(null)
        }}
      />

      <ClientEditModal
        client={editingClient}
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false)
          setEditingClient(null)
        }}
        onSave={handleSaveEdit}
      />

      <ClientCreateModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleSaveCreate}
      />
      </div>
    </div>
  )
}
