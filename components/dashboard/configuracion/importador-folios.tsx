"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { v4 as uuidv4 } from "uuid"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { CheckCircle2, Upload, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { uploadToStaging } from "@/lib/actions/import"

// Definimos las columnas que nuestra base de datos (Staging) espera
const COLUMNAS_DESTINO = [
  { id: "folio", label: "Folio / Numero de Orden" },
  { id: "cliente_nombre", label: "Nombre del Cliente" },
  { id: "cliente_telefono", label: "Telefono del Cliente" },
  { id: "marca", label: "Marca" },
  { id: "modelo", label: "Modelo" },
  { id: "falla", label: "Falla Reportada" },
  { id: "costo_total", label: "Costo Total" },
  { id: "fecha_recepcion_original", label: "Fecha de Ingreso" },
  { id: "fecha_entrega_original", label: "Fecha de Entrega" },
]

export function ImportadorFolios() {
  const [paso, setPaso] = useState(1)
  const [headers, setHeaders] = useState<string[]>([])
  const [fullData, setFullData] = useState<any[]>([]) // Todos los registros (5,000+)
  const [previewData, setPreviewData] = useState<any[]>([]) // Solo los primeros 5
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = e.target?.result
        // Lazy load xlsx only when needed
        const XLSX = await import("xlsx")
        const workbook = XLSX.read(data, { type: "binary" })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(sheet)
        
        if (json.length > 0) {
          setHeaders(Object.keys(json[0] as object))
          setFullData(json)
          setPreviewData(json.slice(0, 5))
          setPaso(2)
          toast.success("Archivo leido: " + json.length + " registros detectados")
        }
      } catch (err) {
        toast.error("Error al leer el archivo Excel")
      }
    }
    reader.readAsBinaryString(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    multiple: false,
    accept: { 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 
      'text/csv': ['.csv'] 
    } 
  })

  const handleMappingChange = (dbColumn: string, excelHeader: string) => {
    setMapping(prev => ({ ...prev, [dbColumn]: excelHeader }))
  }

  const handleIniciarCarga = async () => {
    if (!mapping.folio || !mapping.cliente_nombre) {
      toast.error("El Folio y el Nombre del Cliente son obligatorios")
      return
    }

    setLoading(true)
    const batchId = uuidv4()

    // Preparamos TODOS los datos segun el mapeo seleccionado
    const datosMapeados = fullData.map(row => ({
      folio: row[mapping.folio],
      cliente_nombre: row[mapping.cliente_nombre],
      cliente_telefono: row[mapping.cliente_telefono],
      marca: row[mapping.marca],
      modelo: row[mapping.modelo],
      falla: row[mapping.falla],
      costo_total: row[mapping.costo_total],
      fecha_recepcion_original: row[mapping.fecha_recepcion_original],
      fecha_entrega_original: row[mapping.fecha_entrega_original],
    }))

    const result = await uploadToStaging(datosMapeados, batchId)

    if (result.success) {
      toast.success(`¡Migracion iniciada! ${result.count} registros en la tabla de transicion.`)
      setPaso(1)
      setMapping({})
      setFullData([])
    } else {
      toast.error("Error en el servidor: " + result.error)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-8">
      {/* STEPPER */}
      <div className="flex justify-between max-w-md mx-auto mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${paso >= i ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {paso > i ? <CheckCircle2 className="h-5 w-5" /> : i}
            </div>
            <span className={`text-xs font-medium ${paso >= i ? 'text-blue-600' : 'text-slate-400'}`}>
              {i === 1 ? "Carga" : i === 2 ? "Mapeo" : "Validar"}
            </span>
          </div>
        ))}
      </div>

      {paso === 1 && (
        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-blue-50 rounded-full text-blue-600">
              <Upload className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-700">Arrastra tu Excel de Morelos o Reparatech</p>
              <p className="text-sm text-slate-500">Formato .xlsx o .csv</p>
            </div>
          </div>
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {COLUMNAS_DESTINO.map((col) => (
              <div key={col.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50">
                <Label className="text-sm font-medium text-slate-700">{col.label}</Label>
                <Select onValueChange={(value) => handleMappingChange(col.id, value)}>
                  <SelectTrigger className="w-[200px] h-9 bg-white">
                    <SelectValue placeholder="Columna Excel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPaso(1)}>Atras</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setPaso(3)}>Vista Previa</Button>
          </div>
        </div>
      )}

      {paso === 3 && (
        <div className="space-y-6">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase">Folio</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Cliente</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{row[mapping.folio] || '-'}</TableCell>
                    <TableCell className="text-xs">{row[mapping.cliente_nombre] || '-'}</TableCell>
                    <TableCell className="text-xs font-bold text-blue-600">${row[mapping.costo_total] || '0'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <p className="text-xs text-amber-700">
              Se procesaran <strong>{fullData.length}</strong> registros. Se guardaran en la tabla transitoria para validacion manual antes de pasar a la base de datos oficial.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPaso(2)} disabled={loading}>Atras</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleIniciarCarga} disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Iniciar Carga a Staging"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}