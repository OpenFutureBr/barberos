"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

const DOCUMENT_VERSION = "1.0"

const inputCls = "w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"

const NAV = [
  { group: "Termos de Uso", links: [
    ["tu-aceite", "Aceite dos termos"],
    ["tu-servico", "Descrição do serviço"],
    ["tu-acesso", "Acesso e conta"],
    ["tu-planos", "Planos e pagamentos"],
    ["tu-uso", "Uso permitido"],
    ["tu-proibicoes", "Proibições"],
    ["tu-dados", "Propriedade dos dados"],
    ["tu-ia", "IA e biometria"],
    ["tu-pix", "PIX e WhatsApp"],
    ["tu-sla", "SLA e disponibilidade"],
    ["tu-resp", "Responsabilidade"],
    ["tu-cancel", "Cancelamento"],
    ["tu-foro", "Lei e foro"],
  ]},
  { group: "Política de Privacidade", links: [
    ["pp-quem", "Quem somos"],
    ["pp-dados", "Dados coletados"],
    ["pp-bases", "Bases legais (LGPD)"],
    ["pp-sensiveis", "Dados sensíveis e suboperadores"],
    ["pp-retencao", "Retenção e segurança"],
    ["pp-direitos", "Seus direitos"],
  ]},
  { group: "Política de Cookies", links: [
    ["ck-lista", "Cookies utilizados"],
  ]},
  { group: "Contrato SaaS + DPA", links: [
    ["cs-partes", "Partes"],
    ["cs-objeto", "Objeto e plano"],
    ["cs-obrig", "Obrigações"],
    ["cs-dpa", "DPA — tratamento de dados"],
  ]},
]

function Val({ value, placeholder }: { value: string; placeholder: string }) {
  return value ? <>{value}</> : <span className="italic text-zinc-600">[{placeholder}]</span>
}

function Sec({ id, num, title, children }: { id: string; num: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12 scroll-mt-6">
      <span className="block text-[11px] font-mono text-amber-500 tracking-wider mb-1.5">{num}</span>
      <h2 className="text-xl font-bold text-white mb-4 pb-2.5 border-b border-zinc-800">{title}</h2>
      <div className="space-y-3 text-sm text-zinc-400 leading-relaxed [&_strong]:text-zinc-200 [&_strong]:font-medium [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-zinc-200 [&_h3]:mt-5 [&_h3]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:marker:text-zinc-600">
        {children}
      </div>
    </section>
  )
}

function Box({ tone, children }: { tone: "gold" | "red" | "blue"; children: React.ReactNode }) {
  const styles = {
    gold: "bg-amber-500/10 border-amber-500/20 text-zinc-300",
    red: "bg-red-500/10 border-red-500/20 text-red-300",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-300",
  }
  return <div className={`rounded-lg border px-4 py-3 text-sm ${styles[tone]}`}>{children}</div>
}

function Tbl({ head, rows }: { head: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className="bg-amber-500/5 text-amber-500 font-mono text-[10px] tracking-wide uppercase px-3 py-2 text-left border border-zinc-800">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 === 1 ? "bg-white/[.02]" : ""}>
              {r.map((c, j) => <td key={j} className="px-3 py-2 border border-zinc-800 text-zinc-400 align-top">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AceiteLegalInner() {
  const searchParams = useSearchParams()
  const orgId = searchParams.get("org")

  const [empresaCnpj, setEmpresaCnpj] = useState("")
  const [empresaEndereco, setEmpresaEndereco] = useState("")

  const [jaAceito, setJaAceito] = useState(false)
  const [aceiteInfo, setAceiteInfo] = useState<{ em: string; por: string | null } | null>(null)
  const [carregando, setCarregando] = useState(!!orgId)
  const [erroCarga, setErroCarga] = useState("")

  const [razao, setRazao] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [email, setEmail] = useState("")
  const [responsavel, setResponsavel] = useState("")

  const [chk1, setChk1] = useState(false)
  const [chk2, setChk2] = useState(false)
  const [chk3, setChk3] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState("")
  const [sucesso, setSucesso] = useState<{ em: string } | null>(null)

  useEffect(() => {
    fetch("/api/public/empresa-legal")
      .then(r => r.json())
      .then(d => {
        setEmpresaCnpj(d.cnpj || "")
        setEmpresaEndereco(d.endereco || "")
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!orgId) return
    fetch(`/api/public/aceite-legal?org=${orgId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErroCarga(d.error); return }
        setJaAceito(d.jaAceito)
        if (d.jaAceito) setAceiteInfo({ em: d.aceiteEm, por: d.aceitoPor })
        setRazao(d.organization.legalName || d.organization.name || "")
        setCnpj(d.organization.cnpj || "")
        setEmail(d.organization.email || d.organization.ownerEmail || "")
        setResponsavel(d.organization.ownerName || "")
      })
      .catch(() => setErroCarga("Não foi possível carregar os dados da empresa."))
      .finally(() => setCarregando(false))
  }, [orgId])

  const totalChecks = [chk1, chk2, chk3].filter(Boolean).length
  const podeEnviar = totalChecks === 3 && razao.trim() && cnpj.trim() && email.trim() && responsavel.trim()

  async function confirmarAceite() {
    if (!orgId || !podeEnviar) return
    setEnviando(true)
    setErroEnvio("")
    try {
      const r = await fetch("/api/public/aceite-legal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, legalName: razao, cnpj, email, responsibleName: responsavel }),
      })
      const d = await r.json()
      if (!r.ok) { setErroEnvio(d.error || "Erro ao registrar aceite."); return }
      setSucesso({ em: d.aceite.acceptedAt })
    } catch {
      setErroEnvio("Erro ao conectar. Tente novamente.")
    } finally {
      setEnviando(false)
    }
  }

  const modoConsulta = !orgId

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 pb-32">
      <div className="sticky top-0 z-20 h-12 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-amber-500 text-black font-black text-sm flex items-center justify-center">B</div>
          <span className="text-sm font-semibold text-white">BarberOS <span className="text-zinc-500 font-normal text-xs ml-1">DOCUMENTOS LEGAIS</span></span>
        </div>
        {orgId && (
          <span className={`text-[10px] font-mono tracking-wide rounded-full border px-2.5 py-1 ${jaAceito || sucesso ? "text-green-400 border-green-500/20" : "text-amber-500 border-amber-500/20"}`}>
            {jaAceito || sucesso ? "ACEITO ✓" : "PENDENTE DE ACEITE"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] max-w-5xl mx-auto">
        <aside className="hidden lg:block border-r border-zinc-800 py-6 px-4 sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto">
          {NAV.map(g => (
            <div key={g.group} className="mb-2">
              <div className="text-[9px] font-mono text-zinc-600 tracking-wider uppercase px-2 pt-4 pb-1.5">{g.group}</div>
              {g.links.map(([id, label]) => (
                <a key={id} href={`#${id}`} className="block text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded px-2 py-1 mb-0.5 transition-colors">{label}</a>
              ))}
            </div>
          ))}
        </aside>

        <main className="px-5 py-8 lg:px-10 lg:py-10 max-w-2xl">
          <div className="pb-8 mb-10 border-b border-zinc-800">
            <div className="text-[10px] font-mono text-amber-500 tracking-widest uppercase mb-3">Documentos Legais</div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white leading-tight mb-4">Termos de Uso, Privacidade,<br />Cookies e Contrato SaaS</h1>
            <div className="flex flex-wrap gap-5">
              <div><div className="text-[9px] text-zinc-600 uppercase tracking-wide font-mono">Empresa</div><div className="text-xs text-zinc-300 font-medium">OpenFutureBr Tecnologia Ltda</div></div>
              <div><div className="text-[9px] text-zinc-600 uppercase tracking-wide font-mono">Versão</div><div className="text-xs text-zinc-300 font-medium">{DOCUMENT_VERSION} — 2026</div></div>
              <div><div className="text-[9px] text-zinc-600 uppercase tracking-wide font-mono">Jurisdição</div><div className="text-xs text-zinc-300 font-medium">República Federativa do Brasil</div></div>
            </div>
          </div>

          {modoConsulta && (
            <Box tone="blue">Você está vendo esta página em modo de consulta. Para registrar o aceite oficial em nome de um estabelecimento, acesse pelo link enviado por e-mail no momento da contratação.</Box>
          )}
          {orgId && erroCarga && <Box tone="red">{erroCarga}</Box>}
          {orgId && jaAceito && aceiteInfo && !sucesso && (
            <Box tone="gold">✓ {aceiteInfo.por ? `${aceiteInfo.por} já registrou` : "Já foi registrado"} o aceite destes documentos (versão {DOCUMENT_VERSION}) em {new Date(aceiteInfo.em).toLocaleString("pt-BR")}.</Box>
          )}

          <div className="mt-6" />
          <Box tone="gold">⚠️ <strong>Leia atentamente antes de utilizar o BarberOS.</strong> Ao criar uma conta ou acessar o sistema, você declara ter lido, compreendido e concordado com todos os termos aqui estabelecidos.</Box>

          <div className="mt-2 text-xs text-zinc-600 uppercase tracking-widest font-mono text-center py-5 border-y border-zinc-800 my-10">Documento 01 · Termos de Uso</div>

          <Sec id="tu-aceite" num="01" title="Aceite dos Termos">
            <p>Estes Termos constituem um contrato legal vinculante entre o <strong>Contratante</strong> e a <strong>OpenFutureBr Tecnologia Ltda</strong>, CNPJ n.º <Val value={empresaCnpj} placeholder="CNPJ a definir" />, com sede em <Val value={empresaEndereco} placeholder="endereço a definir" /> — São Paulo/SP (&quot;BarberOS&quot;).</p>
            <p>O aceite ocorre por qualquer dos meios: (i) criação de conta; (ii) acesso ao sistema; (iii) confirmação digital neste documento; (iv) assinatura de proposta comercial. Ao aceitar, você também concorda com a Política de Privacidade, Política de Cookies e o Contrato SaaS + DPA descritos neste mesmo documento.</p>
          </Sec>

          <Sec id="tu-servico" num="02" title="Descrição do Serviço">
            <p>O <strong>BarberOS</strong> é uma plataforma SaaS para gestão de barbearias e salões, com os seguintes módulos:</p>
            <ul>
              <li><strong>Agenda:</strong> agendamentos online, fila de espera e notificações automáticas</li>
              <li><strong>Atendimento a domicílio:</strong> agendamento e gestão de atendimentos fora do estabelecimento</li>
              <li><strong>Clientes:</strong> CRM com histórico, preferências e Central de Clientes IA</li>
              <li><strong>Equipe:</strong> gestão de CLT, PJ, MEI e autônomos com split automático, e bancada individual do profissional</li>
              <li><strong>Financeiro:</strong> caixa, DRE, repasse de comissões, assinaturas recorrentes de clientes e relatórios</li>
              <li><strong>Cashback:</strong> programa de fidelidade com limite configurável por estabelecimento</li>
              <li><strong>PIX:</strong> geração e cobrança via EfiBank com split automático</li>
              <li><strong>Estoque e PDV:</strong> controle de produtos, catálogo, ponto de venda e sugestões de compra por IA</li>
              <li><strong>WhatsApp:</strong> mensagens automáticas via Evolution API</li>
              <li><strong>IA de Biotipo:</strong> análise facial para recomendação de cortes (dado sensível LGPD)</li>
              <li><strong>Precificação com IA:</strong> sugestão de preços de serviços com base em dados do estabelecimento</li>
              <li><strong>Fiscal:</strong> preparação de dados para NF-e e relatórios MEI</li>
              <li><strong>Multi-unidades e unidades irmãs:</strong> gestão de múltiplos estabelecimentos e compartilhamento de galeria entre unidades</li>
              <li><strong>White-label:</strong> disponível no plano Business</li>
            </ul>
          </Sec>

          <Sec id="tu-acesso" num="03" title="Acesso e Conta">
            <p>Para utilizar o BarberOS você deve ter capacidade civil plena (18 anos) e representar legalmente o estabelecimento cadastrado. Você é responsável pela confidencialidade de suas credenciais. Qualquer acesso com suas credenciais é de sua responsabilidade.</p>
            <p>Em caso de suspeita de acesso não autorizado, notifique imediatamente: <strong>seguranca@barberos.com.br</strong></p>
          </Sec>

          <Sec id="tu-planos" num="04" title="Planos e Pagamentos">
            <Tbl head={["Plano", "Cobrança", "Carência por inadimplência"]} rows={[
              ["Start", "Mensal recorrente via PIX ou cartão", "5 dias"],
              ["Pro", "Mensal recorrente via PIX ou cartão", "5 dias"],
              ["Business", "Mensal recorrente via PIX ou cartão", "5 dias"],
            ]} />
            <p>O período de avaliação gratuita é de <strong>14 dias</strong> sem cartão de crédito. Preços são reajustados anualmente pelo IGPM/FGV com aviso de 30 dias. <strong>Não há reembolso proporcional</strong> por cancelamento durante o período vigente.</p>
          </Sec>

          <Sec id="tu-uso" num="05" title="Uso Permitido">
            <p>A licença concedida é <strong>limitada, não exclusiva, intransferível e revogável</strong>, para uso exclusivo na gestão do estabelecimento cadastrado. Inclui acesso à plataforma, funcionalidades do plano contratado e atualizações automáticas.</p>
          </Sec>

          <Sec id="tu-proibicoes" num="06" title="Proibições">
            <Box tone="red">É expressamente proibido: revender ou sublicenciar o acesso · realizar engenharia reversa do software · usar para fins ilícitos ou fraudulentos · realizar scraping ou bots não autorizados · compartilhar credenciais externamente · usar WhatsApp automático para spam · coletar dados de menores sem autorização dos responsáveis · usar a IA de biotipo sem consentimento do cliente final.</Box>
            <p>A violação pode resultar em suspensão imediata sem reembolso e sujeição às sanções legais cabíveis.</p>
          </Sec>

          <Sec id="tu-dados" num="07" title="Propriedade dos Dados">
            <p>Todos os dados inseridos pelo Contratante são de sua <strong>exclusiva propriedade</strong>. O BarberOS atua como operador, processando os dados em nome do Contratante. Você pode exportar seus dados a qualquer momento no formato CSV ou JSON. Após cancelamento, os dados são mantidos por 90 dias e então excluídos permanentemente.</p>
          </Sec>

          <Sec id="tu-ia" num="08" title="Funcionalidades de IA e Dados Biométricos">
            <Box tone="red">⚠️ A IA de biotipo processa <strong>dados biométricos (imagens faciais)</strong> — dados sensíveis pela LGPD (Art. 5º, II). O estabelecimento é o responsável por coletar e documentar o <strong>consentimento expresso e específico</strong> do cliente antes de qualquer análise. As imagens NÃO são armazenadas pelo BarberOS após o processamento — apenas o resultado da análise é salvo no perfil do cliente.</Box>
            <p>As recomendações da IA são sugestivas e não substituem a expertise do profissional. O BarberOS não garante precisão das análises.</p>
          </Sec>

          <Sec id="tu-pix" num="09" title="Pagamentos PIX e WhatsApp">
            <p>Os pagamentos PIX são processados pela <strong>EfiBank (Efí Pagamentos S.A.)</strong>, instituição autorizada pelo Banco Central. O BarberOS não é instituição financeira e não se responsabiliza por falhas da EfiBank, bloqueios de conta PIX por decisão regulatória ou chargebacks.</p>
            <p>O módulo WhatsApp utiliza a Evolution API — integração não oficialmente suportada pela Meta, podendo ser descontinuada a qualquer momento. O Contratante é responsável pelo cumprimento dos Termos de Serviço do WhatsApp/Meta e pela obtenção de opt-in dos destinatários.</p>
          </Sec>

          <Sec id="tu-sla" num="10" title="Disponibilidade do Serviço (SLA)">
            <Tbl head={["Plano", "Disponibilidade mensal", "Manutenção programada"]} rows={[
              ["Start", "95%", "Domingos 02h–06h"],
              ["Pro", "99%", "Domingos 02h–06h"],
              ["Business", "99,5%", "Domingos 02h–06h (com aviso prévio)"],
            ]} />
            <p>Indisponibilidade não programada superior a 4 horas gera crédito proporcional na próxima fatura.</p>
          </Sec>

          <Sec id="tu-resp" num="11" title="Limitação de Responsabilidade">
            <p>Na máxima extensão legal, o BarberOS não é responsável por lucros cessantes, perda de dados por falha do Contratante, danos causados por terceiros (EfiBank, Google, Groq, Meta) ou decisões tomadas com base em dados do sistema. A responsabilidade total do BarberOS limita-se ao valor pago nos últimos <strong>3 meses</strong>.</p>
          </Sec>

          <Sec id="tu-cancel" num="12" title="Cancelamento e Rescisão">
            <p>O Contratante pode cancelar a qualquer momento pelo painel ou por e-mail para <strong>cancelamento@barberos.com.br</strong>. O acesso permanece até o final do período pago. O BarberOS pode suspender o acesso imediatamente por violação grave dos Termos, uso ilícito ou inadimplência superior a 30 dias após notificação.</p>
          </Sec>

          <Sec id="tu-foro" num="13" title="Lei Aplicável e Foro">
            <p>Estes Termos são regidos pelo Código Civil (Lei 10.406/2002), CDC (Lei 8.078/1990), LGPD (Lei 13.709/2018) e Marco Civil da Internet (Lei 12.965/2014). Fica eleito o foro da <strong>Comarca de São Paulo/SP</strong>, com renúncia a qualquer outro.</p>
            <p>Contatos: <strong>suporte@barberos.com.br</strong> · <strong>juridico@barberos.com.br</strong> · <strong>dpo@barberos.com.br</strong></p>
          </Sec>

          <div className="text-xs text-zinc-600 uppercase tracking-widest font-mono text-center py-5 border-y border-zinc-800 my-10">Documento 02 · Política de Privacidade · LGPD Lei 13.709/2018</div>

          <Sec id="pp-quem" num="01" title="Quem Somos — Controlador de Dados">
            <p>A <strong>OpenFutureBr Tecnologia Ltda</strong>, CNPJ <Val value={empresaCnpj} placeholder="CNPJ a definir" />, é a Controladora de Dados da plataforma BarberOS. Na relação com os estabelecimentos clientes: o <strong>BarberOS é Controlador</strong> dos dados de cadastro dos estabelecimentos e <strong>Operador</strong> dos dados dos clientes finais das barbearias. Os <strong>estabelecimentos são Controladores</strong> dos dados de seus próprios clientes.</p>
          </Sec>

          <Sec id="pp-dados" num="02" title="Dados que Coletamos">
            <h3>Dados dos Estabelecimentos (B2B)</h3>
            <Tbl head={["Categoria", "Dados", "Obrig."]} rows={[
              ["Identificação", "Razão social, CNPJ, nome fantasia", "Sim"],
              ["Contato", "E-mail, telefone, WhatsApp", "Sim"],
              ["Localização", "Endereço, CEP, cidade, UF", "Sim"],
              ["Financeiro", "Chave PIX, dados bancários", "Módulo PIX"],
              ["Acesso", "E-mail, senha (hash bcrypt), IP, logs", "Sim"],
            ]} />
            <h3>Dados de Clientes Finais (processados em nome dos estabelecimentos)</h3>
            <Tbl head={["Categoria", "Dados", "Obs."]} rows={[
              ["Identificação", "Nome completo, telefone, e-mail", "—"],
              ["Histórico", "Agendamentos, serviços, preferências, assinaturas", "Gerado pelo uso"],
              ["Biométrico ⚠️", "Imagem facial para IA de biotipo", "Consentimento obrigatório"],
              ["Financeiro", "Histórico de pagamentos, cashback", "Gerado pelo uso"],
            ]} />
          </Sec>

          <Sec id="pp-bases" num="03" title="Bases Legais (LGPD — Art. 7º)">
            <Tbl head={["Base Legal", "Aplicação no BarberOS"]} rows={[
              ["Execução de contrato (Art. 7º, V)", "Prestação dos serviços contratados"],
              ["Consentimento (Art. 7º, I)", "Análise biométrica (IA de biotipo) e marketing"],
              ["Legítimo interesse (Art. 7º, IX)", "Segurança, logs, analytics anonimizado"],
              ["Obrigação legal (Art. 7º, II)", "Retenção fiscal e contábil (5 anos)"],
            ]} />
            <p>O BarberOS <strong>não vende, não aluga e não comercializa</strong> dados pessoais de seus usuários.</p>
          </Sec>

          <Sec id="pp-sensiveis" num="04" title="Dados Sensíveis — Biometria, IA e Suboperadores">
            <Box tone="red">⚠️ Imagens faciais são <strong>dados sensíveis</strong> (Art. 5º, II, LGPD). O BarberOS NÃO armazena imagens após o processamento. A análise é realizada pelos provedores de IA listados abaixo e apenas o resultado (tipo de rosto, recomendações) é salvo no perfil do cliente. O estabelecimento é responsável pelo consentimento expresso do cliente final antes de usar esta funcionalidade.</Box>
            <h3>Suboperadores de Dados Autorizados</h3>
            <Tbl head={["Suboperador", "Finalidade", "País"]} rows={[
              ["Vercel Inc.", "Hospedagem da aplicação", "EUA"],
              ["Supabase Inc.", "Banco de dados PostgreSQL", "EUA"],
              ["Google (Gemini)", "Análise facial (IA de biotipo) e geração de texto", "EUA"],
              ["Groq Inc.", "Análise facial e geração de texto por IA (Llama)", "EUA"],
              ["EfiBank", "Processamento de pagamentos PIX", "Brasil"],
              ["Evolution API", "WhatsApp automático", "Brasil"],
            ]} />
          </Sec>

          <Sec id="pp-retencao" num="05" title="Retenção e Segurança">
            <Tbl head={["Dado", "Prazo de retenção"]} rows={[
              ["Dados de conta", "Vigência + 90 dias"],
              ["Logs de acesso", "6 meses (Marco Civil, Art. 15)"],
              ["Dados fiscais", "5 anos (Código Tributário)"],
              ["Imagens faciais", "Não armazenadas"],
            ]} />
            <p>Medidas de segurança: TLS 1.3 · senhas com hash bcrypt · dados financeiros criptografados · banco de dados com SSL · autenticação com expiração de sessão · backup diário com retenção de 30 dias.</p>
          </Sec>

          <Sec id="pp-direitos" num="06" title="Seus Direitos (LGPD — Art. 18)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 not-prose">
              {[
                ["Acesso e confirmação", "Confirmar existência e acessar cópia dos seus dados"],
                ["Correção", "Corrigir dados incompletos ou desatualizados"],
                ["Eliminação", "Excluir dados tratados com base em consentimento"],
                ["Portabilidade", "Exportar dados em formato CSV ou JSON"],
                ["Revogação de consentimento", "Revogar consentimentos a qualquer momento"],
                ["Reclamação à ANPD", "Reclamar junto à Autoridade Nacional: anpd.gov.br"],
              ].map(([t, d]) => (
                <div key={t} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-3">
                  <div className="text-xs font-medium text-zinc-200 mb-0.5">{t}</div>
                  <div className="text-[11px] text-zinc-500 leading-snug">{d}</div>
                </div>
              ))}
            </div>
            <Box tone="gold">📧 Para exercer seus direitos, contate nosso DPO: <strong>dpo@barberos.com.br</strong>. Prazo de resposta: até 15 dias úteis.</Box>
          </Sec>

          <div className="text-xs text-zinc-600 uppercase tracking-widest font-mono text-center py-5 border-y border-zinc-800 my-10">Documento 03 · Política de Cookies</div>

          <Sec id="ck-lista" num="01" title="Cookies Utilizados">
            <p>O BarberOS utiliza cookies para funcionamento, segurança e melhoria da plataforma. Cookies essenciais não podem ser desativados sem comprometer o acesso.</p>
            <Tbl head={["Cookie", "Tipo", "Finalidade", "Duração"]} rows={[
              ["barberos_session", "Essencial", "Autenticação e manutenção da sessão", "Sessão / 30 dias"],
              ["barberos_csrf", "Essencial", "Proteção contra ataques CSRF", "Sessão"],
              ["barberos_consent", "Essencial", "Registro do consentimento de cookies", "1 ano"],
              ["barberos_prefs", "Funcional", "Preferências de interface (tema, idioma)", "1 ano"],
              ["barberos_analytics", "Analítico", "Análise anônima de uso para melhoria do produto", "90 dias"],
            ]} />
          </Sec>

          <div className="text-xs text-zinc-600 uppercase tracking-widest font-mono text-center py-5 border-y border-zinc-800 my-10">Documento 04 · Contrato SaaS + DPA · LGPD</div>

          <Sec id="cs-partes" num="01" title="Das Partes">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-5 py-4 mb-3">
              <div className="text-[10px] font-mono text-amber-500 tracking-wide uppercase mb-2">Contratada</div>
              <p className="text-sm text-zinc-300 leading-7">
                <strong>OpenFutureBr Tecnologia Ltda</strong><br />
                CNPJ: <Val value={empresaCnpj} placeholder="a definir" /> · Sede: <Val value={empresaEndereco} placeholder="a definir" /> — São Paulo/SP<br />
                E-mail: juridico@barberos.com.br · DPO: dpo@barberos.com.br
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-5 py-4">
              <div className="text-[10px] font-mono text-amber-500 tracking-wide uppercase mb-2">Contratante {orgId ? "" : "(preenchido no ato do aceite digital)"}</div>
              <p className="text-sm text-zinc-300 leading-7">
                <strong>Razão Social:</strong> {razao || "—"}<br />
                <strong>CNPJ:</strong> {cnpj || "—"}<br />
                <strong>E-mail:</strong> {email || "—"}<br />
                <strong>Representante Legal:</strong> {responsavel || "—"}
              </p>
            </div>
          </Sec>

          <Sec id="cs-objeto" num="02" title="Objeto e Plano Contratado">
            <p>Licença de uso não exclusiva, intransferível e revogável da plataforma BarberOS, na modalidade SaaS, pelo plano escolhido no momento da contratação. O valor, forma de pagamento e data de início são registrados eletronicamente no ato do aceite.</p>
            <p>Vigência: <strong>12 meses</strong> com renovação automática, salvo notificação de cancelamento com 30 dias de antecedência. Contratos mensais sem fidelidade podem ser cancelados a qualquer momento com efeito ao final do período vigente.</p>
          </Sec>

          <Sec id="cs-obrig" num="03" title="Obrigações das Partes">
            <h3>Contratada (BarberOS)</h3>
            <ul>
              <li>Disponibilizar a plataforma conforme o SLA do plano contratado</li>
              <li>Realizar backups periódicos e manter infraestrutura segura</li>
              <li>Tratar dados conforme LGPD e o DPA abaixo</li>
              <li>Notificar incidentes de segurança em até 72 horas</li>
              <li>Fornecer exportação de dados a qualquer momento</li>
            </ul>
            <h3>Contratante</h3>
            <ul>
              <li>Efetuar os pagamentos nas datas acordadas</li>
              <li>Ser responsável pelo uso feito por seus colaboradores</li>
              <li>Obter os consentimentos necessários de seus clientes finais (LGPD)</li>
              <li>Não utilizar o sistema para fins ilícitos</li>
              <li>Comunicar imediatamente suspeitas de violação de segurança</li>
            </ul>
            <p>A responsabilidade total do BarberOS é limitada ao valor pago nos últimos 3 meses. O sistema é fornecido &quot;como está&quot; (as-is), sem garantia de ausência de erros.</p>
          </Sec>

          <Sec id="cs-dpa" num="04" title="DPA — Acordo de Processamento de Dados (LGPD)">
            <p>O BarberOS (<strong>Operador</strong>) processa dados pessoais em nome do estabelecimento (<strong>Controlador</strong>) conforme as seguintes obrigações:</p>
            <ul>
              <li>Processar dados apenas conforme instruções documentadas do Controlador</li>
              <li>Garantir confidencialidade de todos que acessam os dados</li>
              <li>Não subcontratar processamento sem autorização — suboperadores autorizados estão listados na Política de Privacidade</li>
              <li>Excluir ou devolver todos os dados pessoais após término do contrato</li>
              <li>Notificar o Controlador sobre incidentes em até <strong>72 horas</strong></li>
              <li>Cooperar em auditorias mediante solicitação com 30 dias de antecedência</li>
            </ul>
            <Tbl head={["Papel", "Quem", "Responsabilidade"]} rows={[
              ["Controlador", "Estabelecimento cliente", "Define finalidades, coleta consentimentos dos clientes finais"],
              ["Operador", "BarberOS / OpenFutureBr", "Processa dados conforme instruções do Controlador"],
              ["Titulares", "Clientes finais da barbearia", "Direitos previstos no Art. 18 da LGPD"],
            ]} />
          </Sec>

          <Box tone="blue">ℹ️ O aceite digital tem validade jurídica nos termos da Lei 14.063/2020 (Assinaturas Eletrônicas). O registro de IP, data, hora e e-mail é armazenado como prova do consentimento.</Box>
        </main>
      </div>

      {orgId && !jaAceito && !sucesso && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-zinc-950/97 backdrop-blur border-t border-amber-500/20 px-5 py-4">
          <div className="max-w-5xl mx-auto flex flex-col gap-4">
            {carregando ? (
              <p className="text-sm text-zinc-500">Carregando dados da empresa...</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Razão Social *</label>
                    <input className={inputCls} value={razao} onChange={e => setRazao(e.target.value)} placeholder="Nome da empresa ou MEI" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">CNPJ ou CPF *</label>
                    <input className={inputCls} value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">E-mail *</label>
                    <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contato@suabarbearia.com" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Nome do Representante *</label>
                    <input className={inputCls} value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Nome completo" />
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input type="checkbox" checked={chk1} onChange={e => setChk1(e.target.checked)} className="mt-0.5 accent-amber-500" />
                      <span className="text-xs text-zinc-400 leading-relaxed">Li e aceito os <a href="#tu-aceite" className="text-amber-500 hover:underline">Termos de Uso</a> e a <a href="#pp-quem" className="text-amber-500 hover:underline">Política de Privacidade</a> do BarberOS, incluindo o tratamento dos meus dados conforme a LGPD.</span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input type="checkbox" checked={chk2} onChange={e => setChk2(e.target.checked)} className="mt-0.5 accent-amber-500" />
                      <span className="text-xs text-zinc-400 leading-relaxed">Aceito a <a href="#ck-lista" className="text-amber-500 hover:underline">Política de Cookies</a> e o <a href="#cs-partes" className="text-amber-500 hover:underline">Contrato SaaS + DPA</a>, comprometendo-me a cumprir as obrigações neles descritas.</span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input type="checkbox" checked={chk3} onChange={e => setChk3(e.target.checked)} className="mt-0.5 accent-amber-500" />
                      <span className="text-xs text-zinc-400 leading-relaxed">Declaro ter capacidade legal para representar o estabelecimento cadastrado e que as informações fornecidas são verdadeiras.</span>
                    </label>
                  </div>
                  <div className="flex flex-col items-start lg:items-end gap-1.5 shrink-0">
                    {erroEnvio && <p className="text-xs text-red-400">{erroEnvio}</p>}
                    <button
                      disabled={!podeEnviar || enviando}
                      onClick={confirmarAceite}
                      className="bg-amber-500 hover:bg-amber-400 disabled:opacity-35 disabled:cursor-not-allowed text-black font-bold text-sm rounded-lg px-7 py-2.5 transition-colors"
                    >
                      {enviando ? "Enviando..." : "Aceitar e continuar →"}
                    </button>
                    <div className="text-[11px] text-zinc-600 font-mono">{totalChecks} de 3 confirmações</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {sucesso && (
        <div className="fixed inset-0 z-40 bg-zinc-950/92 backdrop-blur flex items-center justify-center flex-col text-center p-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-2xl mb-5">✓</div>
          <h2 className="text-xl font-bold text-white mb-2.5">Aceite registrado com sucesso!</h2>
          <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">Todos os documentos legais foram aceitos e o registro foi gravado com data, hora e identificação do contratante.</p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-6 py-4 text-left max-w-md w-full mb-5 text-xs text-zinc-400 leading-7">
            <strong className="text-zinc-200">Registro de aceite:</strong><br />
            Empresa: {razao}<br />
            Responsável: {responsavel}<br />
            E-mail: {email}<br />
            Data/hora: {new Date(sucesso.em).toLocaleString("pt-BR")}<br />
            Documentos: Termos de Uso · Privacidade · Cookies · Contrato SaaS + DPA<br />
            <span className="text-green-400 text-[11px] mt-1 block">✓ Registro válido conforme Lei 14.063/2020</span>
          </div>
          <a href="/login" className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-lg px-7 py-2.5 transition-colors">Acessar o BarberOS →</a>
        </div>
      )}
    </div>
  )
}

export default function AceiteLegalPage() {
  return (
    <Suspense fallback={null}>
      <AceiteLegalInner />
    </Suspense>
  )
}
