"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, Mail, Pencil, Plus, RotateCcw, Trash2, Users, X, KeyRound, ShieldAlert } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ModuleHeader } from "@/components/dashboard/module-header"
import {
  createMiembro,
  deleteMiembro,
  deleteMiembroPermanente,
  getEquipoPageData,
  resendMiembroInvitacion,
  toggleMiembroActivo,
  updateMiembro,
} from "@/lib/actions/team-prisma"
import { PAISES } from "@/lib/constants/paises"
import type {
  RolOption,
  EquipoMiembroRow,
  EquipoOwnerRow,
} from "@/lib/team-types"

type MemberCard = {
  key: string
  nombre: string
  email: string
  rol: string
  estado: "ACTIVO" | "INACTIVO" | "PENDIENTE"
  emailVerified: boolean
  source?: "user" | "colaborador"
  owner?: boolean
  initial: string
  miembroId?: string
  rolId?: string
  telefono?: string | null
  telefonoPais?: string | null
}

export default function EquipoPage() {
  const [owner, setOwner] = useState<EquipoOwnerRow | null>(null)
  const [miembros, setMiembros] = useState<EquipoMiembroRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rolesOptions, setRolesOptions] = useState<RolOption[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [nombreMiembro, setNombreMiembro] = useState("")
  const [emailMiembro, setEmailMiembro] = useState("")
  const [rolIdMiembro, setRolIdMiembro] = useState("")
  const [passwordMiembro, setPasswordMiembro] = useState("")
  const [telefonoPaisMiembro, setTelefonoPaisMiembro] = useState("Mexico")
  const [telefonoMiembro, setTelefonoMiembro] = useState("")

  const [editOpen, setEditOpen] = useState(false)
  const [editMemberId, setEditMemberId] = useState("")
  const [editNombre, setEditNombre] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editRolId, setEditRolId] = useState("")
  const [editPassword, setEditPassword] = useState("")
  const [editTelefonoPais, setEditTelefonoPais] = useState("Mexico")
  const [editTelefono, setEditTelefono] = useState("")

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteMemberId, setDeleteMemberId] = useState("")
  const [deleteMemberName, setDeleteMemberName] = useState("")
  const [deleteAction, setDeleteAction] = useState<"deactivate" | "permanent">("deactivate")

  const [resendingId, setResendingId] = useState<string | null>(null)
  const [reactivatingId, setReactivatingId] = useState<string | null>(null)

  // PERF: getEquipoPageData ya retorna roles - una sola llamada en vez de dos useEffects separados
  const load = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { owner: o, miembros: m, roles: r, error } = await getEquipoPageData()
      if (error) {
        setLoadError(error)
        toast({ title: "Aviso", description: error, variant: "destructive" })
      }
      setOwner(o)
      setMiembros(m)
      setRolesOptions(r)
    } catch (e) {
      console.error(e)
      setLoadError("No se pudo cargar el equipo.")
      toast({ title: "Error", description: "No se pudo cargar el equipo.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!createOpen || rolesOptions.length === 0) return
    setRolIdMiembro((prev) => {
      if (prev) return prev
      const def = rolesOptions.find((r) => r.slug === "tecnico_estandar")
      return def?.id ?? rolesOptions[0]?.id ?? ""
    })
  }, [createOpen, rolesOptions])

  const rolesEstandar = useMemo(
    () => rolesOptions.filter((r) => r.categoria === "estandar"),
    [rolesOptions]
  )
  const rolesEspecial = useMemo(
    () => rolesOptions.filter((r) => r.categoria === "especial"),
    [rolesOptions]
  )
  const selectedCreateRole = useMemo(
    () => rolesOptions.find((r) => r.id === rolIdMiembro) ?? null,
    [rolesOptions, rolIdMiembro]
  )
  const isExternalCreateRole = selectedCreateRole?.slug === "reparador"

  const memberCards = useMemo<MemberCard[]>(() => {
    const rows: MemberCard[] = []
    if (owner) {
      rows.push({
        key: "owner",
        nombre: owner.nombre,
        email: owner.email,
        rol: "SUPER ADMIN",
        estado: "ACTIVO",
        emailVerified: true,
        owner: true,
        initial: (owner.nombre?.trim()?.charAt(0) || "P").toUpperCase(),
      })
    }

    for (const m of miembros) {
      const estado: MemberCard["estado"] = !m.activo
        ? "INACTIVO"
        : !m.emailVerified
          ? "PENDIENTE"
          : "ACTIVO"
      rows.push({
        key: m.id,
        miembroId: m.id,
        rolId: m.rolId,
        nombre: m.nombre,
        email: m.email,
        rol: m.rolNombre.toUpperCase(),
        estado,
        emailVerified: m.emailVerified,
        source: m.source ?? "user",
        initial: (m.nombre?.trim()?.charAt(0) || "U").toUpperCase(),
        telefono: m.telefono ?? null,
        telefonoPais: m.telefonoPais ?? null,
      })
    }
    return rows
  }, [owner, miembros])

  const pendingCount = useMemo(
    () => memberCards.filter((m) => m.estado === "PENDIENTE").length,
    [memberCards]
  )
  const inactiveCount = useMemo(
    () => memberCards.filter((m) => m.estado === "INACTIVO").length,
    [memberCards]
  )
  const activeMembersCount = useMemo(
    () => memberCards.filter((m) => !m.owner && m.source !== "colaborador" && m.estado !== "INACTIVO").length,
    [memberCards]
  )
  const groupedMembers = useMemo(
    () => [
      {
        key: "activos",
        title: "Activos",
        description: "Usuarios con acceso y perfiles externos disponibles para asignacion.",
        members: memberCards.filter((m) => m.estado === "ACTIVO"),
      },
      {
        key: "pendientes",
        title: "Pendientes",
        description: "Creados, pero aun no verifican el codigo enviado por correo.",
        members: memberCards.filter((m) => m.estado === "PENDIENTE"),
      },
      {
        key: "inactivos",
        title: "Inactivos",
        description: "No pueden iniciar sesion y no cuentan para el limite. Puedes reactivarlos o liberar su correo.",
        members: memberCards.filter((m) => m.estado === "INACTIVO"),
      },
    ],
    [memberCards],
  )

  const openCreateModal = () => {
    if (loadError) return
    setNombreMiembro("")
    setEmailMiembro("")
    setPasswordMiembro("")
    setTelefonoPaisMiembro("Mexico")
    setTelefonoMiembro("")
    const def = rolesOptions.find((r) => r.slug === "tecnico_estandar")
    setRolIdMiembro(def?.id ?? rolesOptions[0]?.id ?? "")
    setCreateOpen(true)
  }

  const openEditModal = (member: MemberCard) => {
    if (!member.miembroId || member.owner) return
    setEditMemberId(member.miembroId)
    setEditNombre(member.nombre)
    setEditEmail(member.email)
    setEditRolId(member.rolId || "")
    setEditPassword("")
    setEditTelefonoPais(member.telefonoPais || "Mexico")
    setEditTelefono(member.telefono || "")
    setEditOpen(true)
  }

  const openDeleteDialog = (member: MemberCard, action: "deactivate" | "permanent" = "deactivate") => {
    if (!member.miembroId || member.owner) return
    setDeleteMemberId(member.miembroId)
    setDeleteMemberName(member.nombre)
    setDeleteAction(action)
    setDeleteOpen(true)
  }

  const handleCrearUsuario = async () => {
    const nombre = nombreMiembro.trim()
    const email = emailMiembro.trim()
    const password = passwordMiembro
    const rolId = rolIdMiembro
    const telefono = telefonoMiembro.trim()
    const telefonoPais = telefonoPaisMiembro

    if (!nombre) {
      toast({ title: "Campo requerido", description: "Ingresa el nombre.", variant: "destructive" })
      return
    }
    if (!isExternalCreateRole && !email) {
      toast({ title: "Campo requerido", description: "Ingresa el email.", variant: "destructive" })
      return
    }
    if (!isExternalCreateRole && (!password || password.length < 6)) {
      toast({ title: "Contrasena invalida", description: "Minimo 6 caracteres.", variant: "destructive" })
      return
    }
    if (!rolId) {
      toast({ title: "Campo requerido", description: "Selecciona un puesto/rol.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createMiembro({
        nombre,
        email: isExternalCreateRole ? "" : email,
        password: isExternalCreateRole ? "" : password,
        rolId,
        telefono,
        telefonoPais,
      })
      if (!result.success) {
        toast({ title: "Error", description: result.error ?? "No se pudo crear el usuario.", variant: "destructive" })
        return
      }

      if (isExternalCreateRole) {
        toast({
          title: "Tec. externo creado",
          description: `${nombre} ya esta disponible para asignarlo en folios y liquidaciones.`,
        })
      } else if (result.error) {
        toast({
          title: "Usuario creado con aviso",
          description: `No pudimos enviar el correo a ${email}: ${result.error}. Usa "Reenviar invitacion" en la tarjeta del miembro.`,
          duration: 8000,
        })
      } else {
        toast({
          title: "Usuario creado - PENDIENTE de verificacion",
          description: `Enviamos un codigo de 6 digitos a ${email}. El miembro NO podra iniciar sesion hasta confirmarlo en reparahub.com/auth/login.`,
          duration: 8000,
        })
      }
      setCreateOpen(false)
      await load()
    } catch (e) {
      console.error(e)
      toast({ title: "Error", description: "Ocurrio un error al guardar.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGuardarEdicion = async () => {
    const nombre = editNombre.trim()
    const rolId = editRolId
    const password = editPassword
    const telefono = editTelefono.trim()
    const telefonoPais = editTelefonoPais

    if (!editMemberId) {
      toast({ title: "Error", description: "Miembro invalido.", variant: "destructive" })
      return
    }
    if (!nombre) {
      toast({ title: "Campo requerido", description: "Ingresa el nombre.", variant: "destructive" })
      return
    }
    if (!rolId) {
      toast({ title: "Campo requerido", description: "Selecciona un puesto/rol.", variant: "destructive" })
      return
    }
    if (password && password.length < 6) {
      toast({ title: "Contrasena invalida", description: "Minimo 6 caracteres.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await updateMiembro({
        miembroId: editMemberId,
        nombre,
        rolId,
        password,
        telefono,
        telefonoPais,
      })

      if (!result.success) {
        toast({ title: "Error", description: result.error ?? "No se pudo editar el miembro.", variant: "destructive" })
        return
      }

      toast({ title: "Cambios guardados", description: "La informacion del miembro fue actualizada." })
      setEditOpen(false)
      await load()
    } catch (e) {
      console.error(e)
      toast({ title: "Error", description: "No se pudo guardar la edicion.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteMember = async () => {
    if (!deleteMemberId) return
    setIsSubmitting(true)
    try {
      const result = deleteAction === "permanent"
        ? await deleteMiembroPermanente(deleteMemberId)
        : await deleteMiembro(deleteMemberId)
      if (!result.success) {
        toast({ title: "Error", description: result.error ?? "No se pudo completar la accion.", variant: "destructive" })
        return
      }

      toast({
        title: deleteAction === "permanent" ? "Miembro eliminado permanentemente" : "Acceso desactivado",
        description: deleteAction === "permanent"
          ? "El correo quedo libre para volver a usarse."
          : "El miembro ya no puede iniciar sesion.",
      })
      setDeleteOpen(false)
      setDeleteMemberId("")
      setDeleteMemberName("")
      setDeleteAction("deactivate")
      await load()
    } catch (e) {
      console.error(e)
      toast({ title: "Error", description: "No se pudo completar la accion.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReactivateMember = async (member: MemberCard) => {
    if (!member.miembroId) return
    setReactivatingId(member.miembroId)
    try {
      const result = await toggleMiembroActivo(member.miembroId)
      if (!result.success) {
        toast({ title: "Error", description: result.error ?? "No se pudo reactivar el miembro.", variant: "destructive" })
        return
      }
      toast({ title: "Miembro reactivado", description: "El miembro vuelve a contar para el limite activo del taller." })
      await load()
    } catch (e) {
      console.error(e)
      toast({ title: "Error", description: "No se pudo reactivar el miembro.", variant: "destructive" })
    } finally {
      setReactivatingId(null)
    }
  }

  const handleResendInvite = async (member: MemberCard) => {
    if (!member.miembroId) return
    setResendingId(member.miembroId)
    try {
      const result = await resendMiembroInvitacion(member.miembroId)
      if (!result.success) {
        toast({ title: "Error", description: result.error ?? "No se pudo reenviar la invitacion.", variant: "destructive" })
        return
      }
      toast({
        title: "Invitacion reenviada",
        description: `Enviamos un nuevo codigo de verificacion a ${member.email}.`,
      })
    } catch (e) {
      console.error(e)
      toast({ title: "Error", description: "No se pudo reenviar la invitacion.", variant: "destructive" })
    } finally {
      setResendingId(null)
    }
  }

  const renderMemberCard = (member: MemberCard) => {
    const isPending = member.estado === "PENDIENTE"
    const isInactive = member.estado === "INACTIVO"
    const isExternal = member.source === "colaborador"
    const dotColor = isInactive
      ? "bg-slate-400"
      : isPending
        ? "bg-amber-500"
        : "bg-green-500"
    const textColor = isInactive
      ? "text-slate-500"
      : isPending
        ? "text-amber-600"
        : "text-green-600"

    return (
      <article
        key={member.key}
        className={
          isPending
            ? "rounded-2xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm"
            : isInactive
              ? "rounded-2xl border border-slate-200 bg-slate-100/70 p-6 shadow-sm"
              : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isInactive ? "bg-slate-200 text-slate-600" : "bg-blue-100 text-blue-700"}`}>
              {member.initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-900">{member.nombre}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge
                  className={
                    member.owner
                      ? "border border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-50"
                      : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50"
                  }
                >
                  {member.rol}
                </Badge>
                {member.owner && (
                  <Badge className="border border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-50">
                    DUENO
                  </Badge>
                )}
                {isPending && (
                  <Badge className="border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100">
                    PENDIENTE
                  </Badge>
                )}
                {isInactive && (
                  <Badge className="border border-slate-300 bg-white text-slate-600 hover:bg-white">
                    INACTIVO
                  </Badge>
                )}
                {isExternal && (
                  <Badge className="border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-50">
                    CONTROL
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {!member.owner && !isInactive && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-slate-400 transition-colors hover:text-blue-600"
                aria-label={`Editar ${member.nombre}`}
                onClick={() => openEditModal(member)}
              >
                <Pencil className="h-4 w-4" />
              </button>
              {!isExternal ? (
                <button
                  type="button"
                  className="text-slate-400 transition-colors hover:text-red-600"
                  aria-label={`Desactivar acceso de ${member.nombre}`}
                  onClick={() => openDeleteDialog(member, "deactivate")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-lg bg-white/80 p-3 ring-1 ring-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {isExternal ? "Uso operativo" : "Email de acceso"}
          </p>
          <p className="mt-1 truncate text-sm text-slate-800">
            {isExternal ? "Sin acceso al sistema. Disponible para asignacion y control de gastos." : member.email || "-"}
          </p>
        </div>

        <div className="mt-3 rounded-lg bg-white/80 p-3 ring-1 ring-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">WhatsApp interno</p>
          <p className="mt-1 truncate text-sm text-slate-800">
            {member.telefono ? `${member.telefonoPais || "Mexico"} · ${member.telefono}` : "Sin telefono registrado"}
          </p>
        </div>

        {isPending && (
          <div className="mt-3 space-y-1.5 rounded-lg border border-amber-300 bg-white p-3 text-xs text-amber-900">
            <p className="flex items-center gap-1.5 font-bold">
              <KeyRound className="h-3.5 w-3.5" />
              Verificacion pendiente
            </p>
            <p className="text-amber-800">
              Enviamos un codigo de 6 digitos a <strong>{member.email}</strong>{" "}
              (vigente 15 min). El miembro debe ingresarlo en{" "}
              <code className="rounded bg-amber-100 px-1 font-mono text-[10px]">reparahub.com/auth/login</code>
              {" "}para activar su acceso.
            </p>
          </div>
        )}

        {isInactive && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
            Este miembro no puede iniciar sesion y no cuenta para el limite. Puedes reactivarlo o eliminarlo permanentemente para liberar el correo.
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</span>
          <span className={`flex items-center gap-1 text-xs font-bold ${textColor}`}>
            <span className={`h-2 w-2 rounded-full ${dotColor}`} />
            {member.estado}
          </span>
        </div>

        {isPending && member.miembroId && (
          <Button
            type="button"
            variant="outline"
            disabled={resendingId === member.miembroId}
            onClick={() => handleResendInvite(member)}
            className="mt-3 h-10 w-full gap-2 rounded-xl border-amber-300 bg-white text-amber-800 hover:bg-amber-50"
          >
            {resendingId === member.miembroId ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Reenviar invitacion
              </>
            )}
          </Button>
        )}

        {isInactive && member.miembroId && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              disabled={reactivatingId === member.miembroId}
              onClick={() => handleReactivateMember(member)}
              className="h-10 gap-2 rounded-xl border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
            >
              {reactivatingId === member.miembroId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Reactivar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => openDeleteDialog(member, "permanent")}
              className="h-10 gap-2 rounded-xl border-red-200 bg-white text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </div>
        )}
      </article>
    )
  }

  return (
    <div className="min-h-screen bg-dashboard-surface">
      <div className="flex w-full flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
      {loadError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Mi Equipo esta temporalmente degradado: {loadError}
        </div>
      ) : null}
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <ModuleHeader
        icon={Users}
        title="MI EQUIPO"
        eyebrow="GESTION DE USUARIOS Y PERMISOS"
        description="Administra accesos, roles y estado de los usuarios del taller."
        stats={[
          {
            label: "Miembros activos",
            value: `${activeMembersCount}/5`,
            tone: "blue",
          },
          ...(pendingCount > 0
            ? [{
                label: "Pendientes",
                value: pendingCount,
                tone: "amber" as const,
              }]
            : []),
        ]}
        actions={(
          <Button
            onClick={openCreateModal}
            disabled={Boolean(loadError)}
            className="h-11 shrink-0 gap-2 rounded-xl px-4 font-semibold tracking-tight btn-glow"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Miembro</span>
          </Button>
        )}
      />

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-slate-500 shadow-sm">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Cargando...
          </div>
        ) : memberCards.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center text-slate-500 shadow-sm">
            No hay miembros disponibles.
          </div>
        ) : (
          <div className="space-y-6">
            {inactiveCount > 0 && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
                Los usuarios inactivos no pueden iniciar sesion y no cuentan para el limite. Eliminar permanentemente libera el correo para corregir altas duplicadas.
              </div>
            )}
            {groupedMembers.map((group) => {
              if (group.members.length === 0) return null
              return (
                <section key={group.key} className="space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-2 px-1">
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-800">{group.title}</h2>
                      <p className="text-xs font-medium text-slate-500">{group.description}</p>
                    </div>
                    <Badge variant="outline" className="rounded-full bg-white text-slate-600">
                      {group.members.length} {group.members.length === 1 ? "miembro" : "miembros"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {group.members.map(renderMemberCard)}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={(o) => !isSubmitting && setCreateOpen(o)}>
        <DialogContent showCloseButton={false} className="max-w-md border-slate-200 bg-white p-0 text-slate-900 sm:rounded-2xl">
          <DialogHeader className="space-y-1 border-b border-slate-200 px-6 pb-4 pt-6">
            <div className="flex items-start justify-between gap-2">
              <DialogTitle className="text-left text-xl font-bold text-slate-900">Nuevo Miembro</DialogTitle>
              <button
                type="button"
                onClick={() => !isSubmitting && setCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-left text-sm text-slate-500">
              {isExternalCreateRole ? (
                <>
                  Este perfil no tendra acceso al sistema. Solo sirve para asignarlo como tecnico en folios,
                  controlar gastos y liquidaciones.
                </>
              ) : (
                <>
                  El miembro <strong>debera confirmar su correo electronico</strong> con un codigo de 6
                  digitos antes de poder iniciar sesion. Hasta entonces aparecera como
                  <strong className="ml-1 inline-flex items-center rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-amber-800">PENDIENTE</strong>
                  y no tendra acceso al sistema.
                </>
              )}
            </p>
          </DialogHeader>

          <div className="space-y-4 px-6 pb-6 pt-4">
            {/* Como funciona - 3 pasos */}
            {!isExternalCreateRole && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Como funciona</p>
              <ol className="mt-2 space-y-1.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">1</span>
                  <span>Creas la cuenta con nombre, email, puesto y contrasena.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">2</span>
                  <span>
                    Enviamos un <strong>codigo de 6 digitos</strong> al correo del miembro
                    (vigente 15 min).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">3</span>
                  <span>
                    El miembro confirma el codigo en{" "}
                    <code className="rounded bg-white px-1 font-mono text-[10px] text-blue-700">reparahub.com/auth/login</code>
                    {" "}y ya puede iniciar sesion.
                  </span>
                </li>
              </ol>
            </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Nombre</Label>
              <Input
                value={nombreMiembro}
                onChange={(e) => setNombreMiembro(e.target.value)}
                placeholder="Nombre completo"
                className="h-12 rounded-xl border-slate-200 bg-white text-slate-900"
              />
            </div>
            {!isExternalCreateRole && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Email</Label>
                <Input
                  type="email"
                  value={emailMiembro}
                  onChange={(e) => setEmailMiembro(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="h-12 rounded-xl border-slate-200 bg-white text-slate-900"
                />
                <p className="text-[11px] text-slate-500">A este correo llegara el codigo de verificacion.</p>
              </div>
            )}
            <div className="grid grid-cols-[minmax(120px,0.9fr)_1.1fr] gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Pais</Label>
                <Select value={telefonoPaisMiembro} onValueChange={setTelefonoPaisMiembro}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white text-left text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white text-slate-900">
                    {PAISES.map((pais) => (
                      <SelectItem key={pais.nombre} value={pais.nombre}>
                        +{pais.codigoTelefono} {pais.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">WhatsApp</Label>
                <Input
                  value={telefonoMiembro}
                  onChange={(e) => setTelefonoMiembro(e.target.value)}
                  placeholder="Numero de telefono"
                  inputMode="tel"
                  className="h-12 rounded-xl border-slate-200 bg-white text-slate-900"
                />
              </div>
            </div>
            <p className="-mt-2 text-[11px] text-slate-500">Se usa para enviar resumenes internos desde los folios.</p>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Puesto / rol del miembro</Label>
              <Select value={rolIdMiembro} onValueChange={setRolIdMiembro}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white text-left text-slate-900">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-900">
                  {rolesEstandar.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs font-bold text-slate-800">Roles estandar</SelectLabel>
                      {rolesEstandar.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {rolesEspecial.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="pt-2 text-xs font-bold text-slate-800">Roles con permisos especiales</SelectLabel>
                      {rolesEspecial.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>
            {!isExternalCreateRole && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Contrasena</Label>
              <Input
                type="password"
                value={passwordMiembro}
                onChange={(e) => setPasswordMiembro(e.target.value)}
                placeholder="********"
                className="h-12 rounded-xl border-slate-200 bg-white text-slate-900"
              />
              <p className="text-[11px] text-slate-500">
                El miembro la usara junto con el codigo para iniciar sesion por primera vez.
              </p>
            </div>
            )}

            {!isExternalCreateRole ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
              <p>
                <strong>El miembro no tendra acceso</strong> al dashboard hasta confirmar
                el codigo. Si el correo no llega en 2 minutos, usa <strong>Reenviar
                invitacion</strong> en su ficha.
              </p>
            </div>
            ) : (
              <div className="flex items-start gap-2 rounded-lg border border-cyan-200 bg-cyan-50 p-2.5 text-[11px] text-cyan-900">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-700" />
                <p>
                  <strong>Perfil de control:</strong> no envia correo, no crea contrasena y no puede iniciar sesion.
                  Quedara disponible para asignarse en reparaciones y registrar maquila/gastos.
                </p>
              </div>
            )}

            <Button
              type="button"
              disabled={isSubmitting}
              className="mt-2 h-12 w-full rounded-2xl bg-blue-600 text-sm font-bold uppercase tracking-tight text-white hover:bg-blue-700"
              onClick={handleCrearUsuario}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                isExternalCreateRole ? "Crear tec. externo" : "Crear usuario y enviar codigo"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(o) => !isSubmitting && setEditOpen(o)}>
        <DialogContent showCloseButton={false} className="max-w-md border-slate-200 bg-white p-0 text-slate-900 sm:rounded-2xl">
          <DialogHeader className="space-y-1 border-b border-slate-200 px-6 pb-4 pt-6">
            <div className="flex items-start justify-between gap-2">
              <DialogTitle className="text-left text-xl font-bold text-slate-900">Editar Miembro</DialogTitle>
              <button
                type="button"
                onClick={() => !isSubmitting && setEditOpen(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-left text-sm text-slate-500">Actualiza los datos y permisos del miembro.</p>
          </DialogHeader>

          <div className="space-y-4 px-6 pb-6 pt-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Nombre</Label>
              <Input
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                className="h-12 rounded-xl border-slate-200 bg-white text-slate-900"
              />
            </div>
            {editMemberId.startsWith("colaborador:") ? null : (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Email</Label>
                <Input
                  type="email"
                  value={editEmail}
                  disabled
                  className="h-12 rounded-xl border-slate-200 bg-slate-100 text-slate-500"
                />
              </div>
            )}
            <div className="grid grid-cols-[minmax(120px,0.9fr)_1.1fr] gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Pais</Label>
                <Select value={editTelefonoPais} onValueChange={setEditTelefonoPais}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white text-left text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white text-slate-900">
                    {PAISES.map((pais) => (
                      <SelectItem key={pais.nombre} value={pais.nombre}>
                        +{pais.codigoTelefono} {pais.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">WhatsApp</Label>
                <Input
                  value={editTelefono}
                  onChange={(e) => setEditTelefono(e.target.value)}
                  placeholder="Numero de telefono"
                  inputMode="tel"
                  className="h-12 rounded-xl border-slate-200 bg-white text-slate-900"
                />
              </div>
            </div>
            <p className="-mt-2 text-[11px] text-slate-500">Se usa para enviar resumenes internos desde los folios.</p>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Puesto / rol del miembro</Label>
              <Select value={editRolId} onValueChange={setEditRolId} disabled={editMemberId.startsWith("colaborador:")}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white text-left text-slate-900">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-900">
                  {rolesEstandar.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs font-bold text-slate-800">Roles estandar</SelectLabel>
                      {rolesEstandar.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {rolesEspecial.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="pt-2 text-xs font-bold text-slate-800">Roles con permisos especiales</SelectLabel>
                      {rolesEspecial.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>
            {editMemberId.startsWith("colaborador:") ? null : (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Contrasena</Label>
              <Input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Dejar vacio para no cambiar"
                className="h-12 rounded-xl border-slate-200 bg-white text-slate-900"
              />
            </div>
            )}

            <Button
              type="button"
              disabled={isSubmitting}
              className="mt-2 h-12 w-full rounded-2xl bg-blue-600 text-sm font-bold uppercase tracking-tight text-white hover:bg-blue-700"
              onClick={handleGuardarEdicion}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={(o) => !isSubmitting && setDeleteOpen(o)}>
        <AlertDialogContent className="rounded-3xl border-slate-200 bg-white text-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">
              {deleteAction === "permanent" ? "Eliminar permanentemente" : "Desactivar acceso"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              {deleteAction === "permanent"
                ? `Estas por eliminar definitivamente a ${deleteMemberName || "este miembro"}. Esta accion libera el correo y no se puede deshacer.`
                : `Estas por desactivar el acceso de ${deleteMemberName || "este miembro"}. No podra iniciar sesion, pero su registro quedara disponible para reactivarlo.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleDeleteMember}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Procesando..."
                : deleteAction === "permanent"
                  ? "Eliminar permanentemente"
                  : "Desactivar acceso"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
