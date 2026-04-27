"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const endpoints = [
  {
    id: "1",
    metodo: "GET",
    rota: "/api/v1/clientes",
    descricao: "Lista todos os clientes do estabelecimento",
    params: [
      { nome: "page", tipo: "number", desc: "Página (padrão: 1)" },
      { nome: "limit", tipo: "number", desc: "Itens por página (padrão: 20)" },
      { nome: "segmento", tipo: "string", desc: "Filtrar por segmento: VIP, REGULAR, AT_RISK" },
    ],
    response: `{
  "data": [
    {
      "id": "cuid123",
      "nome": "Felipe Gomes",
      "telefone": "(11) 99874-3312",
      "segmento": "VIP",
      "totalGasto": 1890,
      "ultimaVisita": "2026-03-22"
    }
  ],
  "total": 247,
  "page": 1,
  "limit": 20
}`,
  },
  {
    id: "2",
    metodo: "POST",
    rota: "/api/v1/agendamentos",
    descricao: "Cria um novo agendamento",
    params: [
      { nome: "clienteId", tipo: "string", desc: "ID do cliente (obrigatório)" },
      { nome: "servicoId", tipo: "string", desc: "ID do serviço (obrigatório)" },
      { nome: "profissionalId", tipo: "string", desc: "ID do profissional (obrigatório)" },
      { nome: "scheduledAt", tipo: "datetime", desc: "Data e hora ISO 8601 (obrigatório)" },
      { nome: "serviceType", tipo: "string", desc: "PRESENTIAL ou HOME_VISIT" },
    ],
    response: `{
  "id": "cuid456",
  "status": "SCHEDULED",
  "scheduledAt": "2026-04-06T14:00:00Z",
  "cliente": { "nome": "João Ribeiro" },
  "servico": { "nome": "Corte + Barba", "preco": 95 },
  "pixQrCode": "00020126580014BR.GOV..."
}`,
  },
  {
    id: "3",
    metodo: "GET",
    rota: "/api/v1/fila",
    descricao: "Retorna a fila de espera em tempo real",
    params: [],
    response: `{
  "emAtendimento": {
    "cliente": "Carlos Andrade",
    "servico": "Corte + Barba",
    "profissional": "Lucas Carvalho",
    "tempoRestante": 12
  },
  "fila": [
    {
      "posicao": 1,
      "cliente": "João Ribeiro",
      "espera": 12,
      "tipo": "SCHEDULED"
    }
  ]
}`,
  },
  {
    id: "4",
    metodo: "POST",
    rota: "/api/v1/pix/gerar",
    descricao: "Gera uma cobrança PIX para um atendimento",
    params: [
      { nome: "agendamentoId", tipo: "string", desc: "ID do agendamento (obrigatório)" },
      { nome: "valor", tipo: "number", desc: "Valor em reais (obrigatório)" },
      { nome: "splitType", tipo: "string", desc: "SPLIT_ESTABLISHMENT ou DIRECT_PROFESSIONAL" },
    ],
    response: `{
  "pixTxId": "tx_123abc",
  "pixQrCode": "data:image/png;base64,...",
  "pixCopyPaste": "00020126580014BR.GOV.BCB.PIX...",
  "status": "PENDING",
  "expiresAt": "2026-04-05T15:30:00Z"
}`,
  },
  {
    id: "5",
    metodo: "GET",
    rota: "/api/v1/analytics/dashboard",
    descricao: "Retorna os KPIs do dashboard em tempo real",
    params: [
      { nome: "periodo", tipo: "string", desc: "today, week, month (padrão: today)" },
    ],
    response: `{
  "faturamento": 1840,
  "atendimentos": 12,
  "ticketMedio": 153,
  "clientesVIP": 9,
  "comparacao": {
    "faturamentoOntem": 1497,
    "variacao": 23.2
  }
}`,
  },
]

const metodoStyle: Record<string, string> = {
  GET: "bg-green-500/10 text-green-400 border border-green-500/20",
  POST: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  PUT: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  DELETE: "bg-red-500/10 text-red-400 border border-red-500/20",
}

export default function ApiDocsPage() {
  const [endpointSel, setEndpointSel] = useState<string | null>("1")
  const [apiKey] = useState("bos_live_c9c99c36ff732e91ab6a3a475344ddfd")

  const endpoint = endpoints.find(e => e.id === endpointSel)

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">API Pública — Documentação</h1>
          <p className="text-zinc-500 text-sm">REST API · v1 · Autenticação via Bearer Token</p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
          ● API Online
        </span>
      </div>

      {/* API Key */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
        <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-2">Sua API Key</div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 font-mono text-sm text-zinc-300 border border-zinc-700">
            {apiKey}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(apiKey).then(() => alert("API Key copiada!"))}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm border border-zinc-700 transition-colors"
          >
            Copiar
          </button>
          <button className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm border border-red-500/20 transition-colors">
            Revogar
          </button>
        </div>
        <div className="text-zinc-600 text-xs mt-2">
          Use no header: <span className="font-mono text-zinc-400">Authorization: Bearer {"{"}sua_api_key{"}"}</span>
        </div>
      </div>

      {/* Base URL */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
        <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-2">Base URL</div>
        <div className="font-mono text-sm text-amber-400">https://api.barberos.com/v1</div>
      </div>

      <div className="grid grid-cols-3 gap-4">

        {/* Lista de endpoints */}
        <div className="col-span-1">
          <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-2">Endpoints</div>
          <div className="space-y-1">
            {endpoints.map((ep) => (
              <div
                key={ep.id}
                onClick={() => setEndpointSel(ep.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  endpointSel === ep.id
                    ? "bg-zinc-800 border border-zinc-700"
                    : "hover:bg-zinc-900 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${metodoStyle[ep.metodo]}`}>
                    {ep.metodo}
                  </span>
                </div>
                <div className="text-zinc-300 text-xs font-mono">{ep.rota}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Detalhe do endpoint */}
        <div className="col-span-2">
          {endpoint && (
            <div className="space-y-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-sm px-3 py-1 rounded font-mono font-bold ${metodoStyle[endpoint.metodo]}`}>
                    {endpoint.metodo}
                  </span>
                  <span className="text-white font-mono text-sm">{endpoint.rota}</span>
                </div>
                <p className="text-zinc-400 text-sm">{endpoint.descricao}</p>
              </div>

              {endpoint.params.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">
                    {endpoint.metodo === "GET" ? "Query Params" : "Body (JSON)"}
                  </div>
                  <div className="space-y-2">
                    {endpoint.params.map((p, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 border-b border-zinc-800 last:border-0">
                        <span className="text-amber-400 font-mono text-sm w-32 flex-shrink-0">{p.nome}</span>
                        <span className="text-blue-400 font-mono text-xs w-16 flex-shrink-0 mt-0.5">{p.tipo}</span>
                        <span className="text-zinc-400 text-sm">{p.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Response — 200 OK</div>
                <pre className="bg-zinc-800 rounded-lg p-3 text-xs text-green-400 font-mono overflow-x-auto leading-relaxed">
                  {endpoint.response}
                </pre>
              </div>

              {/* Exemplo cURL */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Exemplo — cURL</div>
                <pre className="bg-zinc-800 rounded-lg p-3 text-xs text-zinc-300 font-mono overflow-x-auto leading-relaxed">
{`curl -X ${endpoint.metodo} \\
  https://api.barberos.com/v1${endpoint.rota} \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json"`}
                </pre>
                <button
                  onClick={() => alert("cURL copiado!")}
                  className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  📋 Copiar comando
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </DashboardLayout>
  )
}