"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

type CorteItem = { name: string; pct: number; description: string; serviceId?: string | null }

type AnaliseResult = {
  faceShape: string
  confidence: number
  description: string
  catalogCuts: CorteItem[]
  suggestedCuts: CorteItem[]
}

const FACE_SHAPE_LABEL: Record<string, string> = {
  oval: "Oval", redondo: "Redondo", quadrado: "Quadrado",
  coracao: "Coração", oblongo: "Oblongo", triangular: "Triangular",
}

export default function IABiotipoPage() {
  const [etapa, setEtapa] = useState<"upload" | "camera" | "preview" | "analisando" | "resultado">("upload")
  const [resultado, setResultado] = useState<AnaliseResult | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagemPreview, setImagemPreview] = useState<string | null>(null)
  const [erro, setErro] = useState("")
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const abrirCamera = useCallback(async () => {
    setErro("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      setCameraStream(stream)
      setEtapa("camera")
    } catch {
      setErro("Câmera não acessível. Tente fazer upload de uma foto.")
    }
  }, [])

  useEffect(() => {
    if (etapa === "camera" && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream
    }
  }, [etapa, cameraStream])

  function pararCamera() {
    cameraStream?.getTracks().forEach(t => t.stop())
    setCameraStream(null)
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
      body: JSON.stringify({ imageBase64 }),
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
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">IA de Biotipo Facial</h1>
          <p className="text-zinc-500 text-sm">Análise por Visagismo · Groq Vision · Cortes do catálogo em primeiro lugar</p>
        </div>
        {etapa !== "upload" && (
          <button onClick={resetar}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm border border-zinc-700 transition-colors">
            Nova análise
          </button>
        )}
      </div>

      {/* Upload / câmera */}
      {etapa === "upload" && (
        <div className="max-w-lg mx-auto space-y-4">
          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">{erro}</div>
          )}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-4">
            <div className="text-4xl mb-2">🤖</div>
            <h2 className="text-white text-lg font-bold">Analisar biotipo do cliente</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              A IA analisa a foto e detecta o formato do rosto. Sugere os cortes do seu catálogo primeiro, depois opções complementares.
            </p>

            <button onClick={abrirCamera}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              Abrir câmera
            </button>

            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-zinc-700 rounded-xl py-5 hover:border-amber-500 hover:bg-amber-500/5 transition-all text-center">
                <div className="text-zinc-400 text-sm">ou faça upload de uma foto</div>
                <div className="text-zinc-600 text-xs mt-1">PNG, JPG · máx 5MB</div>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleArquivo} />
            </label>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-2">Como funciona</div>
            {[
              { icon: "📸", t: "Foto do cliente é analisada pela Groq Vision (llama-4-scout)" },
              { icon: "✂️", t: "Cortes do catálogo do estabelecimento aparecem em primeiro lugar" },
              { icon: "💡", t: "Sugestões fora do catálogo ficam disponíveis internamente" },
              { icon: "💾", t: "Resultado salvo no perfil do cliente para consultas futuras" },
            ].map((i, k) => (
              <div key={k} className="flex items-start gap-3">
                <span className="text-base">{i.icon}</span>
                <span className="text-zinc-400 text-sm">{i.t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Câmera ao vivo */}
      {etapa === "camera" && (
        <div className="max-w-lg mx-auto space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video object-cover bg-black" />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { pararCamera(); setEtapa("upload") }}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm transition-colors">
              Cancelar
            </button>
            <button onClick={capturarFoto}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl py-3 text-sm transition-colors">
              Capturar foto
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {etapa === "preview" && (
        <div className="max-w-lg mx-auto space-y-4">
          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">{erro}</div>
          )}
          {imagemPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagemPreview} alt="Preview" className="w-full rounded-2xl object-cover max-h-80" />
          )}
          <div className="flex gap-3">
            <button onClick={resetar}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm transition-colors">
              Nova foto
            </button>
            <button onClick={analisar}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl py-3 text-sm transition-colors">
              Analisar biotipo
            </button>
          </div>
        </div>
      )}

      {/* Analisando */}
      {etapa === "analisando" && (
        <div className="max-w-lg mx-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-white font-bold text-lg">Analisando biotipo...</h2>
            <p className="text-zinc-400 text-sm">Groq llama-4-scout está identificando o formato do rosto e cruzando com seu catálogo</p>
          </div>
        </div>
      )}

      {/* Resultado */}
      {etapa === "resultado" && resultado && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Coluna esquerda: biotipo + imagem */}
          <div className="space-y-4">
            {imagemPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagemPreview} alt="Foto analisada" className="w-full rounded-2xl object-cover max-h-56" />
            )}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 font-bold text-lg">✦</span>
                </div>
                <div>
                  <div className="text-xs text-purple-400 font-mono uppercase tracking-widest">Biotipo detectado</div>
                  <div className="text-white text-xl font-bold">
                    Rosto {FACE_SHAPE_LABEL[resultado.faceShape] ?? resultado.faceShape}
                  </div>
                  <div className="text-zinc-400 text-sm">{resultado.confidence}% de confiança</div>
                </div>
              </div>
              {resultado.description && (
                <p className="text-zinc-400 text-sm leading-relaxed">{resultado.description}</p>
              )}
            </div>
          </div>

          {/* Coluna direita: cortes */}
          <div className="space-y-4">
            {/* Do catálogo */}
            {resultado.catalogCuts?.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="text-amber-400 text-xs font-mono uppercase tracking-widest mb-3">✂ Do seu catálogo</div>
                <div className="space-y-3">
                  {resultado.catalogCuts.map((c, i) => (
                    <div key={i} className={`p-3 rounded-xl border ${i === 0 ? "bg-amber-500/10 border-amber-500/25" : "bg-zinc-800 border-zinc-700"}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-sm font-semibold ${i === 0 ? "text-amber-400" : "text-white"}`}>
                          {i === 0 && "⭐ "}{c.name}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">{c.pct}%</span>
                      </div>
                      <div className="h-1 bg-zinc-700 rounded-full overflow-hidden mb-1.5">
                        <div className={`h-full rounded-full ${i === 0 ? "bg-amber-500" : "bg-zinc-500"}`} style={{ width: `${c.pct}%` }} />
                      </div>
                      <div className="text-zinc-500 text-xs">{c.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fora do catálogo */}
            {resultado.suggestedCuts?.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="text-zinc-400 text-xs font-mono uppercase tracking-widest mb-1">💡 Sugestões adicionais</div>
                <div className="text-zinc-600 text-xs mb-3">Cortes fora do catálogo — disponíveis apenas internamente</div>
                <div className="space-y-3">
                  {resultado.suggestedCuts.map((c, i) => (
                    <div key={i} className="p-3 rounded-xl border bg-zinc-800/50 border-zinc-700/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-zinc-300">{c.name}</span>
                        <span className="text-xs font-mono text-zinc-500">{c.pct}%</span>
                      </div>
                      <div className="h-1 bg-zinc-700 rounded-full overflow-hidden mb-1.5">
                        <div className="h-full rounded-full bg-zinc-600" style={{ width: `${c.pct}%` }} />
                      </div>
                      <div className="text-zinc-600 text-xs">{c.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resultado.catalogCuts?.length === 0 && resultado.suggestedCuts?.length === 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center text-zinc-500 text-sm">
                Nenhuma sugestão retornada. Tente com outra foto.
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
