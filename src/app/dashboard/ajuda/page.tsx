"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const faqs = [
  {
    categoria: "Agenda",
    itens: [
      {
        q: "Como agendar um cliente?",
        r: "Clique no botão '+ Agendar' no canto superior direito da tela ou clique em qualquer slot vazio na grade da agenda. Preencha o telefone do cliente (será buscado automaticamente), escolha o profissional, serviço, data e horário.",
      },
      {
        q: "Como remarcar um agendamento?",
        r: "Abra o detalhe do agendamento clicando nele na grade. Se o status for 'Cancelado', 'Não compareceu' ou 'Desistência', o botão 'Remarcar agendamento' aparecerá. Escolha a nova data, horário, barbeiro e tipo (presencial/domicílio).",
      },
      {
        q: "Como registrar que o cliente veio acompanhado?",
        r: "Na tela de novo agendamento, ative o toggle 'Vem com acompanhante'. Informe o nome do acompanhante, o barbeiro e o serviço dele. Dois agendamentos serão criados simultaneamente no mesmo horário.",
      },
      {
        q: "O que significa cada status?",
        r: "Pendente: agendado, aguarda confirmação. Confirmado: cliente confirmou presença. Aguardando: cliente chegou, esperando. Em andamento: corte iniciado. Concluído: atendimento finalizado. Cancelado: barbearia cancelou. Não compareceu: cliente faltou. Desistência: cliente desistiu.",
      },
    ],
  },
  {
    categoria: "Clientes & Pagamentos",
    itens: [
      {
        q: "Como registrar o pagamento de um atendimento?",
        r: "Abra o detalhe do agendamento na agenda. Adicione produtos à comanda se necessário. Clique em 'Finalizar cobrança'. Escolha a forma de pagamento (PIX, dinheiro, crédito, débito) e confirme. Um recibo é gerado automaticamente.",
      },
      {
        q: "Como adicionar produtos à comanda do cliente?",
        r: "No detalhe do agendamento, use o campo 'Adicionar produto à comanda' para buscar produtos do estoque. Ajuste a quantidade com os botões − e +. O total é atualizado em tempo real.",
      },
      {
        q: "O recibo pode ser impresso?",
        r: "Sim. Após confirmar o pagamento, a tela de recibo exibe um botão 'Imprimir'. Em breve haverá também emissão de NFS-e.",
      },
      {
        q: "Como funciona o cashback?",
        r: "Cada pagamento gera cashback automático conforme as regras configuradas em Fidelidade → Cashback. O saldo é exibido no perfil do cliente e pode ser usado como desconto em atendimentos futuros.",
      },
    ],
  },
  {
    categoria: "Estoque & Bancada",
    itens: [
      {
        q: "O que é a Bancada?",
        r: "A bancada é o controle de itens que a barbearia disponibiliza para cada barbeiro trabalhar (giletes, cremes, produtos de uso diário). Acesse em Gestão → Bancada para transferir itens do estoque geral para a bancada de um barbeiro.",
      },
      {
        q: "Como transferir itens para a bancada de um barbeiro?",
        r: "Em Gestão → Bancada, selecione o barbeiro, o produto e a quantidade. A transferência registra uma saída no estoque geral e fica visível no histórico de bancada do barbeiro.",
      },
      {
        q: "Como configurar o estoque mínimo de um produto?",
        r: "Vá em Gestão → Estoque. Abra o produto e defina o campo 'Estoque mínimo'. A IA de Estoque usa esse valor para alertar quando o produto estiver próximo da ruptura.",
      },
    ],
  },
  {
    categoria: "Galeria & Serviços",
    itens: [
      {
        q: "O que é a Galeria de Cortes?",
        r: "É um catálogo global de estilos e cortes gerenciado pela plataforma. Como organização, você pode ativar os estilos que seu estabelecimento oferece e atribuir cada estilo a barbeiros específicos. Você também pode adicionar uma foto própria para substituir a foto padrão.",
      },
      {
        q: "Como adicionar um serviço?",
        r: "Vá em Gestão → Serviços e clique em '+ Novo serviço'. Preencha nome, categoria, preço e duração. Você pode vincular foto e ativar/desativar o serviço a qualquer momento.",
      },
    ],
  },
  {
    categoria: "Configurações",
    itens: [
      {
        q: "Como configurar o PIX para receber pagamentos?",
        r: "Acesse Sistema → Configurações → aba PIX. Informe sua chave PIX (CPF, CNPJ, e-mail, telefone ou chave aleatória). O QR code será gerado automaticamente nos pagamentos.",
      },
      {
        q: "Como configurar os horários de funcionamento?",
        r: "Em Sistema → Configurações → aba Agenda, configure os horários de abertura e fechamento por dia da semana. Esses horários são usados como base para disponibilidade de agendamentos.",
      },
    ],
  },
]

export default function AjudaPage() {
  const [abertos, setAbertos] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setAbertos(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-white text-xl font-bold">Central de Ajuda</h1>
          <p className="text-zinc-500 text-sm">Dúvidas frequentes sobre o uso do Barberos</p>
        </div>

        {/* Contato rápido */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <div className="text-amber-400 text-xl flex-shrink-0">💬</div>
          <div>
            <div className="text-amber-400 font-medium text-sm">Precisa de suporte humano?</div>
            <p className="text-zinc-400 text-xs mt-1">Entre em contato pelo WhatsApp. Nossa equipe responde em horário comercial.</p>
            <a
              href="https://wa.me/5531999999999?text=Olá, preciso de ajuda com o Barberos"
              target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs bg-green-500/15 hover:bg-green-500/25 text-green-400 font-medium px-3 py-1.5 rounded-lg border border-green-500/20 transition-colors">
              Abrir WhatsApp →
            </a>
          </div>
        </div>

        {/* FAQs por categoria */}
        <div className="space-y-6">
          {faqs.map(cat => (
            <div key={cat.categoria}>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">{cat.categoria}</p>
              <div className="space-y-1.5">
                {cat.itens.map((item, i) => {
                  const key = `${cat.categoria}-${i}`
                  const aberto = abertos.has(key)
                  return (
                    <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors">
                        <span className={`text-sm font-medium ${aberto ? "text-white" : "text-zinc-300"}`}>{item.q}</span>
                        <span className={`text-zinc-500 text-lg leading-none flex-shrink-0 ml-3 transition-transform ${aberto ? "rotate-45" : ""}`} style={{ display: "inline-block" }}>+</span>
                      </button>
                      {aberto && (
                        <div className="px-4 pb-4 text-zinc-400 text-sm leading-relaxed border-t border-zinc-800 pt-3">
                          {item.r}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-zinc-700 text-xs">
          Barberos · v1.3 · Todos os direitos reservados
        </div>
      </div>
    </DashboardLayout>
  )
}
