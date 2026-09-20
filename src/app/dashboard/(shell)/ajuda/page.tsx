"use client"

import { useState } from "react"
import Card, { SectionTitle } from "@/components/ui/Card"
import { ButtonLink } from "@/components/ui/Button"

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
    categoria: "Serviços",
    itens: [
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
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-fg text-xl font-bold">Central de Ajuda</h1>
        <p className="text-fg-3 text-sm">Dúvidas frequentes sobre o uso do Barberos</p>
      </div>

      {/* Contato rápido */}
      <Card tone="accent" className="mb-6 flex items-start gap-3">
        <div className="text-accent text-xl flex-shrink-0">💬</div>
        <div>
          <div className="text-accent font-medium text-sm">Precisa de suporte humano?</div>
          <p className="text-fg-2 text-xs mt-1">Entre em contato pelo WhatsApp. Nossa equipe responde em horário comercial.</p>
          <ButtonLink
            href="https://wa.me/5531999999999?text=Olá, preciso de ajuda com o Barberos"
            target="_blank" rel="noopener noreferrer"
            variant="success" size="sm" className="mt-2"
          >
            Abrir WhatsApp →
          </ButtonLink>
        </div>
      </Card>

      {/* FAQs por categoria */}
      <div className="space-y-6">
        {faqs.map(cat => (
          <div key={cat.categoria}>
            <SectionTitle className="mb-2">{cat.categoria}</SectionTitle>
            <div className="space-y-1.5">
              {cat.itens.map((item, i) => {
                const key = `${cat.categoria}-${i}`
                const aberto = abertos.has(key)
                return (
                  <Card key={key} padding="none" className="overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      aria-expanded={aberto}
                      className="w-full flex items-center justify-between gap-3 px-4 min-h-12 py-3 text-left hover:bg-surface-2 transition-colors"
                    >
                      <span className={`text-sm font-medium ${aberto ? "text-fg" : "text-fg-strong"}`}>{item.q}</span>
                      <span
                        className={`text-fg-3 text-lg leading-none flex-shrink-0 transition-transform ${aberto ? "rotate-45" : ""}`}
                        style={{ display: "inline-block" }}
                      >
                        +
                      </span>
                    </button>
                    {aberto && (
                      <div className="px-4 pb-4 text-fg-2 text-sm leading-relaxed border-t border-line pt-3">
                        {item.r}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Documentos legais */}
      <Card className="mt-6 flex items-start gap-3">
        <div className="text-fg-3 text-xl flex-shrink-0">📄</div>
        <div>
          <div className="text-fg-strong font-medium text-sm">Termos de Uso e Política de Privacidade</div>
          <p className="text-fg-3 text-xs mt-1">Consulte a qualquer momento os documentos legais aceitos no cadastro (Termos de Uso, Privacidade, Cookies e Contrato SaaS).</p>
          <ButtonLink href="/aceite-legal" variant="neutral" size="sm" className="mt-2">
            Ver documentos →
          </ButtonLink>
        </div>
      </Card>

      <div className="mt-8 text-center text-fg-4 text-xs">
        Barberos · v1.3 · Todos os direitos reservados
      </div>
    </div>
  )
}
