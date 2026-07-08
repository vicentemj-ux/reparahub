"use client"

import { useCallback, useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Button } from "@/components/ui/button"
import { NuevaReparacionForm } from "@/components/dashboard/nueva-reparacion-form"
import { submitRepairFormData } from "@/lib/reparaciones/repair-form-submit"
import type { ClientAutocompletePayload } from "@/components/dashboard/client-autocomplete"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReparacionEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Solo edicion de ticket existente */
  editingRepairId: string | null
  /** Tras guardar edicion correctamente */
  onEditSuccess?: (repairId: string) => void
  initialClient?: ClientAutocompletePayload | null
}

/**
 * Modal de edicion de ticket (`NuevaReparacionForm` en modo edicion).
 * Reutilizable desde la lista de reparaciones o la ficha por ID.
 *
 * Seguridad del equipo (PIN, contrasena, patron) se edita en el colapsable «Seguridad»;
 * el **patron de desbloqueo 3x3** se abre al elegir «Patron» en Seguridad del equipo - mismo `ModalPatronSeguridad` que en el alta en modal.
 */
export function ReparacionEditDialog({
  open,
  onOpenChange,
  editingRepairId,
  onEditSuccess,
  initialClient = null,
}: ReparacionEditDialogProps) {
  const [dirty, setDirty] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [isReingreso, setIsReingreso] = useState(false)
  const [previousFolio, setPreviousFolio] = useState("")

  useEffect(() => {
    if (!open) {
      setIsReingreso(false)
      setPreviousFolio("")
    }
  }, [open])

  const handleFormSubmit = async (
    formData: FormData
  ): Promise<{ repairId?: string; folio?: string } | void> => {
    return submitRepairFormData(formData)
  }

  const handleDialogOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        onOpenChange(true)
        return
      }
      if (dirty) {
        setConfirmDiscardOpen(true)
        return
      }
      onOpenChange(false)
    },
    [dirty, onOpenChange],
  )

  const confirmDiscard = useCallback(() => {
    setConfirmDiscardOpen(false)
    setDirty(false)
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          showCloseButton={false}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className={cn(
            "!left-0 !top-0 !translate-x-0 !translate-y-0 h-[100dvh] w-screen max-w-none rounded-none border-0 bg-white p-0 shadow-none",
            "md:h-auto md:max-h-[90vh] md:w-[95vw] md:rounded-2xl md:border md:border-slate-200/80 md:shadow-[0_16px_64px_rgba(0,0,0,0.16)]",
            "md:!left-1/2 md:!top-1/2 md:!translate-x-[-50%] md:!translate-y-[-50%]",
            "lg:max-w-[1200px]",
            "flex flex-col gap-0 overflow-hidden",
          )}
        >
          <DialogHeader className="sticky top-0 z-20 shrink-0 gap-0 border-0 bg-transparent p-0">
            <div className="relative bg-[#eff6ff] px-3 py-2 pr-14 sm:px-5 sm:py-2.5">
              <DialogTitle className="sr-only">
                {editingRepairId ? "Modificar ticket" : "Nuevo ticket"}
              </DialogTitle>
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="min-w-0 text-lg font-black italic leading-tight tracking-tight text-white sm:text-2xl sm:leading-tight">
                  {editingRepairId ? "MODIFICAR TICKET" : "NUEVO TICKET"}
                </span>
                {/* Reingreso removed from here - use "Reactivar como Reingreso" on the ticket detail page */}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 h-9 w-9 shrink-0 -translate-y-1/2 rounded-xl text-white hover:bg-blue-50 hover:text-blue-700 transition-all"
                aria-label="Cerrar"
                onClick={() => handleDialogOpenChange(false)}
              >
                <X className="h-5 w-5" aria-hidden />
              </Button>
            </div>
          </DialogHeader>
          <NuevaReparacionForm
            key={editingRepairId ? `edit-${editingRepairId}` : `new-${open}`}
            onModalDirtyChange={setDirty}
            initialClient={editingRepairId ? null : initialClient}
            onSuccess={(repairId) => {
              setDirty(false)
              onOpenChange(false)
              onEditSuccess?.(repairId)
            }}
            isModal={true}
            onSubmit={handleFormSubmit}
            editingRepairId={editingRepairId}
            modalOrderType={{
              isReingreso,
              setIsReingreso,
              previousFolio,
              setPreviousFolio,
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <AlertDialogContent
          overlayClassName="z-[115]"
          className="z-[116] border-slate-200/80 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-sm rounded-2xl sm:max-w-md"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Los datos no guardados se perderan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200">Seguir editando</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={confirmDiscard}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
