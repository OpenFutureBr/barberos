"use client"

import { useState, useRef, useCallback, useEffect } from "react"

type CorteItem = {
  name: string
  pct: number
  description: string
  serviceId?: string | null
}

type AnaliseResult = {
  faceShape: string
  confidence: number
  description: string
  catalogCuts: CorteItem[]
  suggestedCuts: CorteItem[]
}

type Props = {
  onFechar: () => void
  onSelecionarServico?: (serviceId: string, nomeCut: string) => void
  establishmentId?: string
  clientId?: string
  /** Se true, oculta sugestões fora do catálogo (link externo) */
  apenasatalago?: boolean
}

const FACE_SHAPE_LABEL: Record<string, string> = {
  oval: "Oval", redondo: "Redondo", quadrado: "Quadrado",
  coracao: "Coração", oblongo: "Oblongo", triangular: "Triangular",
}

export default function IaBiotipoModal({ onFechar, onSelecionarServico, establishmentId, clientId, apenasatalago = false }: Props) {
  const [etapa, setEtapa] = useState<"upload" | "camera" | "preview" | "analisando" | "resultado">("upload")
  const [resultado, setResultado] = useState<AnaliseResult | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagemPreview, setImagemPreview] = useState<string | null>(null)
  const [erro, setErro] = useState("")
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const pararCamera = useCallback(() => {
    cameraStream?.getTracks().forEach(t => t.stop())
    setCameraStream(null)
  }, [cameraStream])

  useEffect(() => {
    return () => { pararCamera() }
  }, [pararCamera])

  useEffect(() => {
    if (etapa === "camera" && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream
    }
  }, [etapa, cameraStream])

  async function abrirCamera() {
    setErro("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      setCameraStream(stream)
      setEtapa("camera")
    } catch {
      setErro("Câmera não acessível. Tente fazer upload de uma foto.")
    }
  }

  function capturarFoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d")?.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8)
    setImagemPreview(dataUrl)
    setImageBase64(dataUrl.split(",")[1])
    pararCamera()
    setEtapa("preview")
  }

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      setImagemPreview(dataUrl)
      setImageBase64(dataUrl.split(",")[1])
      setEtapa("preview")
    }
    reader.readAsDataURL(file)
  }

  async function analisar() {
    if (!imageBase64) return
    setEtapa("analisando")
    setErro("")
    const res = await fetch("/api/ia/biotipo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, clientId, establishmentId }),
    })
    const data = await res.json()
    if (!res.ok) {
      setErro(data.error ?? "Erro ao analisar")
      setEtapa("preview")
      return
    }
    setResultado(data)
    setEtapa("resultado")
  }

  function resetar() {
    pararCamera()
    setEtapa("upload")
    setResultado(null)
    setImageBase64(null)
    setImagemPreview(null)
    setErro("")
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-sm">IA Biotipo Facial</h2>
            <p className="text-zinc-500 text-xs">Análise por Visagismo · Groq Vision</p>
          </div>
          <button onClick={() => { pararCamera(); onFechar() }} className="text-zinc-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-xs">{erro}</div>
          )}

          {/* Upload */}
          {etapa === "upload" && (
            <div className="space-y-3">
              <button onClick={abrirCamera}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl py-3 flex items-center justify-center gap-2 text-sm transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
                Abrir câmera
              </button>
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-zinc-700 rounded-xl py-4 hover:border-amber-500 transition-all text-center">
                  <div className="text-zinc-400 text-sm">Upload de foto</div>
                  <div className="text-zinc-600 text-xs mt-0.5">PNG, JPG</div>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleArquivo} />
              </label>
            </div>
          )}

          {/* Câmera */}
          {etapa === "camera" && (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="w-full" />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { pararCamera(); setEtapa("upload") }}
                  className="flex-1 bg-zinc-800 text-zinc-300 rounded-lg py-2.5 text-sm">Cancelar</button>
                <button onClick={capturarFoto}
                  className="flex-1 bg-amber-500 text-black font-semibold rounded-lg py-2.5 text-sm">Capturar</button>
              </div>
            </div>
          )}

          {/* Preview */}
          {etapa === "preview" && (
            <div className="space-y-3">
              {imagemPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagemPreview} alt="Preview" className="w-full rounded-xl object-cover max-h-56" />
              )}
              <div className="flex gap-2">
                <button onClick={resetar} className="flex-1 bg-zinc-800 text-zinc-300 rounded-lg py-2.5 text-sm">Nova foto</button>
                <button onClick={analisar} className="flex-1 bg-amber-500 text-black font-semibold rounded-lg py-2.5 text-sm">Analisar</button>
              </div>
            </div>
          )}

          {/* Analisando */}
          {etapa === "analisando" && (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderWidth: 3 }} />
              <p className="text-zinc-400 text-sm">Analisando biotipo facial...</p>
            </div>
          )}

          {/* Resultado */}
          {etapa === "resultado" && resultado && (
            <div className="space-y-4">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                <div className="text-purple-400 text-xs font-mono uppercase tracking-widest mb-1">Biotipo detectado</div>
                <div className="text-white font-bold text-lg">
                  Rosto {FACE_SHAPE_LABEL[resultado.faceShape] ?? resultado.faceShape}
                </div>
                <div className="text-zinc-400 text-xs">{resultado.confidence}% de confiança</div>
                {resultado.description && (
                  <p className="text-zinc-400 text-xs mt-2 leading-relaxed">{resultado.description}</p>
                )}
              </div>

              {/* Cortes do catálogo */}
              {resultado.catalogCuts?.length > 0 && (
                <div>
                  <div className="text-amber-400 text-xs font-mono uppercase tracking-widest mb-2">✂ Do seu catálogo</div>
                  <div className="space-y-2">
                    {resultado.catalogCuts.map((c, i) => (
                      <div key={i} className={`p-3 rounded-xl border ${i === 0 ? "bg-amber-500/10 border-amber-500/25" : "bg-zinc-800 border-zinc-700"}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${i === 0 ? "text-amber-400" : "text-white"}`}>
                            {i === 0 && "⭐ "}{c.name}
                          </span>
                          <span className="text-zinc-500 text-xs">{c.pct}%</span>
                        </div>
                        <div className="text-zinc-500 text-xs mt-0.5">{c.description}</div>
                        {c.serviceId && onSelecionarServico && (
                          <button
                            onClick={() => { onSelecionarServico(c.serviceId!, c.name); onFechar() }}
                            className="mt-2 w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs rounded-lg py-1.5 transition-colors">
                            Selecionar este serviço
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sugestões fora do catálogo (somente interno) */}
              {!apenasatalago && resultado.suggestedCuts?.length > 0 && (
                <div>
                  <div className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-2">💡 Sugestões adicionais</div>
                  <div className="space-y-2">
                    {resultado.suggestedCuts.map((c, i) => (
                      <div key={i} className="p-3 rounded-xl border bg-zinc-800/50 border-zinc-700/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-300">{c.name}</span>
                          <span className="text-zinc-600 text-xs">{c.pct}%</span>
                        </div>
                        <div className="text-zinc-600 text-xs mt-0.5">{c.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={resetar}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2.5 text-sm transition-colors">
                Fazer nova análise
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
