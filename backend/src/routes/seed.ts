import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../db/supabase';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { isAdminOrDeveloper } from '../types';

const router = Router();

// Require authentication
router.use(authenticateToken);

// POST /api/seed/demo — Create fictitious data for the authenticated admin's company
router.post('/demo', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !isAdminOrDeveloper(req.user.role)) {
      return res.status(403).json({ error: 'Admin or developer access required' });
    }

    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated with this account' });
    }

    console.log(`[Seed] Starting demo data seed for company ${companyId}`);

    // ===== 1. Create demo agents =====
    const agentNames = [
      { display_name: 'Ana Silva', email: 'ana.silva@demo.com', custom_role_name: 'Comercial', categories: ['Comercial'] },
      { display_name: 'João Santos', email: 'joao.santos@demo.com', custom_role_name: 'Comercial', categories: ['Comercial'] },
      { display_name: 'Maria Costa', email: 'maria.costa@demo.com', custom_role_name: 'Suporte', categories: ['Suporte'] },
      { display_name: 'Pedro Oliveira', email: 'pedro.oliveira@demo.com', custom_role_name: 'Comercial', categories: ['Comercial'] },
      { display_name: 'Sofia Ferreira', email: 'sofia.ferreira@demo.com', custom_role_name: 'Suporte', categories: ['Suporte'] },
    ];

    const passwordHash = await bcrypt.hash('Demo2026!Agent', 13);
    const agentIds: number[] = [];

    for (const agent of agentNames) {
      // Check if agent already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', companyId)
        .eq('email', agent.email)
        .single();

      if (existing) {
        agentIds.push(existing.id);
        continue;
      }

      const { data: newAgent, error } = await supabase
        .from('users')
        .insert({
          company_id: companyId,
          username: agent.email,
          email: agent.email,
          password_hash: passwordHash,
          role: 'agent',
          display_name: agent.display_name,
          custom_role_name: agent.custom_role_name,
          categories: agent.categories,
          language_preference: 'pt',
          theme_preference: 'light',
        })
        .select('id')
        .single();

      if (error) {
        console.error(`[Seed] Error creating agent ${agent.display_name}:`, error.message);
        continue;
      }
      agentIds.push(newAgent.id);
    }

    console.log(`[Seed] Created/found ${agentIds.length} agents`);

    // ===== 2. Create criteria =====
    const criteriaList = [
      { name: 'Saudação/Abertura', description: 'Cumprimento e abertura profissional da chamada', weight: 1, category: 'Comercial' },
      { name: 'Identificação da necessidade', description: 'Identificação clara das necessidades do cliente', weight: 2, category: 'Comercial' },
      { name: 'Escuta ativa', description: 'Demonstração de escuta ativa e empatia', weight: 1, category: 'Comercial' },
      { name: 'Apresentação de solução', description: 'Apresentação clara e relevante de soluções', weight: 3, category: 'Comercial' },
      { name: 'Tratamento de objeções', description: 'Gestão eficaz e profissional das objeções', weight: 2, category: 'Comercial' },
      { name: 'Clareza na comunicação', description: 'Comunicação clara, estruturada e compreensível', weight: 1, category: 'Comercial' },
      { name: 'Tom profissional', description: 'Manutenção de tom profissional e cordial', weight: 1, category: 'Comercial' },
      { name: 'Próximo passo definido', description: 'Definição clara do próximo passo com compromisso', weight: 3, category: 'Comercial' },
      { name: 'Fecho da chamada', description: 'Encerramento profissional e resumo da chamada', weight: 1, category: 'Comercial' },
      { name: 'Resolução no primeiro contacto', description: 'Capacidade de resolver o problema na primeira chamada', weight: 3, category: 'Suporte' },
      { name: 'Empatia e compreensão', description: 'Demonstração de empatia pela situação do cliente', weight: 2, category: 'Suporte' },
      { name: 'Conhecimento técnico', description: 'Demonstração de conhecimento do produto/serviço', weight: 2, category: 'Suporte' },
    ];

    const criteriaIds: number[] = [];
    for (const c of criteriaList) {
      const { data: existing } = await supabase
        .from('criteria')
        .select('id')
        .eq('company_id', companyId)
        .eq('name', c.name)
        .single();

      if (existing) {
        criteriaIds.push(existing.id);
        continue;
      }

      const { data: newCriteria, error } = await supabase
        .from('criteria')
        .insert({ company_id: companyId, name: c.name, description: c.description, weight: c.weight, category: c.category })
        .select('id')
        .single();

      if (error) {
        console.error(`[Seed] Error creating criterion ${c.name}:`, error.message);
        continue;
      }
      criteriaIds.push(newCriteria.id);
    }

    console.log(`[Seed] Created/found ${criteriaIds.length} criteria`);

    // ===== 3. Create calls spread over 45 days =====
    const phoneNumbers = [
      '+351912345678', '+351923456789', '+351934567890', '+351945678901',
      '+351956789012', '+351967890123', '+351978901234', '+351989012345',
      '+351911222333', '+351922333444', '+351933444555', '+351944555666',
    ];

    const summaries = {
      good: [
        'Cliente interessado em upgrade do plano atual. Identificação de necessidades excelente e proposta adequada apresentada.',
        'Venda concretizada com sucesso. Cliente aderiu ao plano Pro após demonstração dos benefícios.',
        'Excelente atendimento técnico. Problema de faturação resolvido na primeira chamada com total satisfação.',
        'Cliente novo captado com sucesso. Apresentação clara do serviço e fecho com agendamento de demo.',
        'Chamada de follow-up muito produtiva. Cliente confirmou interesse e agendou reunião para a próxima semana.',
        'Resolução rápida e eficaz de uma reclamação. Cliente saiu satisfeito e agradecido.',
        'Renovação de contrato anual negociada com sucesso. Cliente fidelizado por mais 12 meses.',
      ],
      medium: [
        'Chamada informativa sobre serviços. Cliente pediu para pensar e prometeu ligar de volta.',
        'Atendimento de suporte técnico. Problema parcialmente resolvido, necessário escalar para nível 2.',
        'Cliente com dúvidas sobre faturação. Informação fornecida mas cliente ficou com algumas reservas.',
        'Apresentação de proposta comercial. Cliente interessado mas a comparar com concorrência.',
        'Follow-up a cliente antigo. Interesse moderado, pediu envio de catálogo atualizado.',
        'Chamada de suporte sobre configuração. Guiado passo a passo mas processo foi demorado.',
      ],
      bad: [
        'Chamada de reclamação sobre serviço. Cliente muito insatisfeito com tempos de resposta. Escalado para supervisor.',
        'Cliente solicitou cancelamento do serviço. Tentativa de retenção sem sucesso.',
        'Atendimento demorado com múltiplas transferências. Cliente frustrado com o processo.',
        'Reclamação sobre faturação incorreta. Problema não resolvido, necessário investigação adicional.',
      ],
    };

    const nextSteps = {
      good: [
        'Enviar proposta comercial por email até final do dia',
        'Agendar reunião de demonstração para terça-feira',
        'Enviar contrato para assinatura digital',
        'Fazer follow-up em 3 dias para confirmar satisfação',
        'Preparar apresentação personalizada para reunião de sexta',
      ],
      medium: [
        'Aguardar contacto do cliente dentro de uma semana',
        'Enviar catálogo atualizado por email',
        'Escalar para equipa técnica de nível 2',
        'Recontactar em 5 dias úteis',
      ],
      bad: [
        'Escalar para supervisor imediatamente',
        'Investigar caso e responder em 48 horas',
        'Marcar reunião com gestão para resolver situação',
      ],
    };

    const contactReasonsList = [
      [{ categoria: 'Comercial', motivo: 'Pedido de informação sobre planos' }],
      [{ categoria: 'Comercial', motivo: 'Upgrade de plano' }],
      [{ categoria: 'Comercial', motivo: 'Pedido de orçamento' }],
      [{ categoria: 'Suporte', motivo: 'Problema técnico' }],
      [{ categoria: 'Suporte', motivo: 'Dúvida de faturação' }],
      [{ categoria: 'Suporte', motivo: 'Configuração do serviço' }],
      [{ categoria: 'Comercial', motivo: 'Renovação de contrato' }],
      [{ categoria: 'Suporte', motivo: 'Reclamação sobre serviço' }],
      [{ categoria: 'Comercial', motivo: 'Pedido de demonstração' }, { categoria: 'Comercial', motivo: 'Comparação de planos' }],
      [{ categoria: 'Suporte', motivo: 'Cancelamento' }],
    ];

    const objectionsList = [
      [{ categoria: 'Preço', objecao: 'O preço é elevado comparado com a concorrência' }],
      [{ categoria: 'Preço', objecao: 'Precisamos de um desconto para avançar' }],
      [{ categoria: 'Prazo', objecao: 'O prazo de implementação é longo demais' }],
      [{ categoria: 'Funcionalidades', objecao: 'Não tem integração com o nosso CRM atual' }],
      [{ categoria: 'Confiança', objecao: 'Precisamos de mais referências de clientes' }],
      [{ categoria: 'Decisão', objecao: 'Preciso consultar o meu superior antes de decidir' }],
      [],
      [],
      [],
    ];

    const riskWordSets = [
      [], [], [], [], [], [], [],
      ['cancelar'],
      ['insatisfeito', 'reclamação'],
      ['cancelar', 'mudar de fornecedor'],
      ['demasiado caro'],
    ];

    const wentWellOptions = [
      [{ text: 'Excelente identificação das necessidades do cliente', timestamp: '00:45' }, { text: 'Apresentação clara e estruturada', timestamp: '01:30' }],
      [{ text: 'Tom profissional mantido durante toda a chamada', timestamp: '00:20' }, { text: 'Boa gestão do tempo', timestamp: '02:00' }],
      [{ text: 'Escuta ativa demonstrada', timestamp: '00:55' }, { text: 'Solução adequada proposta', timestamp: '02:30' }],
      [{ text: 'Tratamento de objeções eficaz', timestamp: '01:45' }, { text: 'Fecho da chamada exemplar', timestamp: '03:15' }],
      [{ text: 'Empatia demonstrada com o cliente', timestamp: '00:30' }],
      [{ text: 'Resolução rápida do problema', timestamp: '01:00' }, { text: 'Cliente satisfeito com a resposta', timestamp: '02:15' }],
    ];

    const wentWrongOptions = [
      [{ text: 'Poderia ter explorado mais objeções', timestamp: '02:15' }],
      [{ text: 'Tempo de espera elevado', timestamp: '01:30' }, { text: 'Resolução não imediata', timestamp: '02:45' }],
      [{ text: 'Faltou criar urgência na decisão', timestamp: '03:00' }],
      [{ text: 'Próximo passo pouco concreto', timestamp: '02:30' }],
      [],
      [{ text: 'Chamada demasiado longa', timestamp: '04:30' }, { text: 'Cliente mencionou cancelamento', timestamp: '05:00' }],
    ];

    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const rand = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 10) / 10;

    let callsCreated = 0;
    const callIds: number[] = [];

    // Generate 80 calls over 45 days
    for (let i = 0; i < 80; i++) {
      const daysAgo = Math.floor(Math.random() * 45);
      const callDate = new Date();
      callDate.setDate(callDate.getDate() - daysAgo);
      callDate.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);

      const agentId = pick(agentIds);
      const quality = Math.random();
      let score: number;
      let summaryType: 'good' | 'medium' | 'bad';

      if (quality > 0.6) {
        score = rand(7.5, 9.8);
        summaryType = 'good';
      } else if (quality > 0.2) {
        score = rand(5.5, 7.4);
        summaryType = 'medium';
      } else {
        score = rand(3.0, 5.4);
        summaryType = 'bad';
      }

      const duration = summaryType === 'good'
        ? 120 + Math.floor(Math.random() * 240)
        : summaryType === 'medium'
          ? 180 + Math.floor(Math.random() * 300)
          : 240 + Math.floor(Math.random() * 420);

      const direction = Math.random() > 0.3 ? 'inbound' : 'outbound';

      const skillScores = [
        { skill: 'Escuta Ativa', score: Math.min(10, score + rand(-1.5, 1.5)) },
        { skill: 'Clareza', score: Math.min(10, score + rand(-1, 1)) },
        { skill: 'Objeções', score: Math.min(10, score + rand(-2, 1.5)) },
        { skill: 'Fecho', score: Math.min(10, score + rand(-1.5, 2)) },
        { skill: 'Empatia', score: Math.min(10, score + rand(-1, 1.5)) },
      ].map(s => ({ ...s, score: Math.max(1, Math.round(s.score * 10) / 10) }));

      const hasObjections = summaryType !== 'good' || Math.random() > 0.5;
      const hasRiskWords = summaryType === 'bad' && Math.random() > 0.4;

      const topPerformerScore = rand(8.5, 9.8);

      const { data: call, error: callError } = await supabase
        .from('calls')
        .insert({
          company_id: companyId,
          agent_id: agentId,
          phone_number: pick(phoneNumbers),
          direction,
          duration_seconds: duration,
          final_score: score,
          call_date: callDate.toISOString(),
          summary: pick(summaries[summaryType]),
          next_step_recommendation: pick(nextSteps[summaryType]),
          what_went_well: JSON.stringify(pick(wentWellOptions)),
          what_went_wrong: JSON.stringify(pick(wentWrongOptions)),
          risk_words_detected: hasRiskWords ? JSON.stringify(pick(riskWordSets.filter(r => r.length > 0))) : JSON.stringify([]),
          contact_reasons: JSON.stringify(pick(contactReasonsList)),
          objections: hasObjections ? JSON.stringify(pick(objectionsList.filter(o => o.length > 0))) : JSON.stringify([]),
          skill_scores: JSON.stringify(skillScores),
          phrases_to_avoid: JSON.stringify(summaryType === 'bad' ? ['Não sei', 'Isso não é possível', 'Não é da minha responsabilidade'] : []),
          recommended_phrases: JSON.stringify(['Como posso ajudá-lo hoje?', 'Compreendo perfeitamente a sua situação', 'Vou resolver isso imediatamente']),
          response_improvement_example: JSON.stringify({
            before: 'Não sei se conseguimos fazer isso.',
            after: 'Vou verificar essa possibilidade e entro em contacto consigo com uma resposta concreta até amanhã.',
          }),
          top_performer_comparison: JSON.stringify({
            agent_score: score,
            top_performer_score: topPerformerScore,
            areas_to_improve: score < 7 ? ['Tratamento de objeções', 'Definição de próximo passo'] : ['Consistência geral'],
          }),
          transcription: generateTranscription(summaryType, duration),
        })
        .select('id')
        .single();

      if (callError) {
        console.error(`[Seed] Error creating call ${i}:`, callError.message);
        continue;
      }

      callIds.push(call.id);
      callsCreated++;

      // Create criteria results for this call
      if (criteriaIds.length > 0) {
        const criteriaResults = criteriaIds.map(criterionId => ({
          call_id: call.id,
          criterion_id: criterionId,
          passed: summaryType === 'good' ? Math.random() > 0.1 : summaryType === 'medium' ? Math.random() > 0.4 : Math.random() > 0.6,
          justification: summaryType === 'good'
            ? 'O agente cumpriu este critério de forma exemplar.'
            : summaryType === 'medium'
              ? 'O agente cumpriu parcialmente este critério.'
              : 'O agente não cumpriu este critério adequadamente.',
        }));

        const { error: crError } = await supabase.from('call_criteria_results').insert(criteriaResults);
        if (crError) {
          console.error(`[Seed] Error creating criteria results for call ${call.id}:`, crError.message);
        }
      }
    }

    console.log(`[Seed] Created ${callsCreated} calls`);

    // ===== 4. Create alerts =====
    const alertTypes = ['low_score', 'risk_words', 'long_duration', 'no_next_step'] as const;
    let alertsCreated = 0;

    for (let i = 0; i < 20; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const alertDate = new Date();
      alertDate.setDate(alertDate.getDate() - daysAgo);

      const alertType = pick([...alertTypes]);
      const agentId = pick(agentIds);
      const callId = pick(callIds);

      const messages: Record<string, string> = {
        low_score: `Chamada com pontuação baixa (${rand(2, 5).toFixed(1)}/10) — necessita revisão`,
        risk_words: 'Palavras de risco detetadas: "cancelar", "insatisfeito"',
        long_duration: `Chamada com duração excessiva (${Math.floor(rand(8, 15))} minutos)`,
        no_next_step: 'Chamada sem próximo passo definido',
      };

      const { error: alertError } = await supabase.from('alerts').insert({
        company_id: companyId,
        call_id: callId,
        agent_id: agentId,
        type: alertType,
        message: messages[alertType],
        is_read: Math.random() > 0.6,
        created_at: alertDate.toISOString(),
      });

      if (alertError) {
        console.error(`[Seed] Error creating alert:`, alertError.message);
        continue;
      }
      alertsCreated++;
    }

    console.log(`[Seed] Created ${alertsCreated} alerts`);

    // ===== 5. Ensure category metadata exists =====
    for (const cat of [
      { key: 'comercial', name: 'Comercial', color_id: 'blue' },
      { key: 'suporte', name: 'Suporte', color_id: 'green' },
    ]) {
      const { data: existing } = await supabase
        .from('category_metadata')
        .select('id')
        .eq('company_id', companyId)
        .eq('key', cat.key)
        .single();

      if (!existing) {
        await supabase.from('category_metadata').insert({
          company_id: companyId,
          key: cat.key,
          name: cat.name,
          color_id: cat.color_id,
        });
      }
    }

    console.log(`[Seed] Demo data seed complete for company ${companyId}`);

    return res.json({
      success: true,
      agents_created: agentIds.length,
      calls_created: callsCreated,
      alerts_created: alertsCreated,
      criteria_created: criteriaIds.length,
    });
  } catch (error) {
    console.error('[Seed] Error:', error);
    return res.status(500).json({ error: 'Failed to seed demo data' });
  }
});

// Helper: generate a realistic Portuguese transcription
function generateTranscription(quality: 'good' | 'medium' | 'bad', durationSeconds: number): string {
  const transcriptions = {
    good: `[00:00] Agente: Bom dia, obrigado por ligar para a AI CoachCall. O meu nome é Ana, em que posso ajudá-lo?
[00:05] Cliente: Bom dia Ana, estou a ligar porque gostava de saber mais sobre os vossos planos.
[00:12] Agente: Com certeza! Fico contente com o seu interesse. Antes de mais, posso saber o seu nome e qual é a sua empresa?
[00:18] Cliente: Claro, o meu nome é Carlos Mendes, da empresa TechSolutions.
[00:24] Agente: Muito bem Carlos. Para lhe recomendar o plano mais adequado, pode dizer-me quantos agentes tem na sua equipa e qual o volume aproximado de chamadas mensais?
[00:35] Cliente: Temos cerca de 15 agentes e fazemos aproximadamente 2000 chamadas por mês.
[00:42] Agente: Perfeito. Com esse volume, o nosso plano Pro seria ideal para si. Inclui 60 horas de análise por utilizador, relatórios avançados e coaching personalizado com IA.
[00:55] Cliente: Parece interessante. E quanto custa?
[01:00] Agente: O plano Pro tem um valor de 75 euros por utilizador por mês. Para 15 utilizadores, ficaria em 1125 euros mensais. Posso também oferecer um período de teste gratuito de 14 dias.
[01:15] Cliente: Hmm, parece-me um bom valor. Seria possível agendar uma demonstração?
[01:22] Agente: Absolutamente! Posso agendar para esta semana. Que dia e hora seria mais conveniente para si?
[01:30] Cliente: Quinta-feira às 10h da manhã seria perfeito.
[01:35] Agente: Excelente, fica agendado para quinta-feira às 10h. Vou enviar-lhe um convite por email com todos os detalhes. Mais alguma questão Carlos?
[01:45] Cliente: Não, por agora é tudo. Obrigado pela disponibilidade Ana.
[01:50] Agente: Obrigada eu Carlos! Até quinta-feira então. Tenha um excelente dia!`,
    medium: `[00:00] Agente: AI CoachCall, bom dia.
[00:03] Cliente: Bom dia, estou a ligar porque tenho uma dúvida sobre a minha fatura.
[00:08] Agente: Claro, posso ajudar. Qual é o seu número de cliente?
[00:12] Cliente: É o 45892.
[00:15] Agente: Um momento por favor enquanto verifico... Ok, já encontrei a sua conta. Qual é a dúvida?
[00:25] Cliente: Na fatura deste mês aparece um valor diferente do habitual. Normalmente pago 50 euros e agora veio 75.
[00:35] Agente: Deixe-me verificar. Segundo o sistema, houve um ajuste no plano no dia 15 do mês passado. Parece que foi feito um upgrade para o plano Medium.
[00:48] Cliente: Mas eu não autorizei nenhum upgrade.
[00:52] Agente: Compreendo a sua preocupação. Vou verificar isso com mais detalhe. É possível que tenha sido um ajuste automático. Vou escalar esta situação para o nosso departamento de faturação.
[01:05] Cliente: E quanto tempo demora a resolução?
[01:08] Agente: Normalmente conseguimos resolver dentro de 2 a 3 dias úteis. Irá receber uma resposta por email.
[01:15] Cliente: Ok, obrigado.
[01:18] Agente: De nada. Peço desculpa pelo inconveniente. Mais alguma questão?
[01:22] Cliente: Não, é só isso.
[01:25] Agente: Muito bem. Tenha um bom dia!`,
    bad: `[00:00] Agente: Sim?
[00:02] Cliente: Bom dia, estou a ligar para cancelar o meu serviço.
[00:06] Agente: Cancelar? Porquê?
[00:09] Cliente: Porque estou insatisfeito com o serviço. Já liguei três vezes com o mesmo problema e ninguém resolve.
[00:18] Agente: Qual é o problema exatamente?
[00:22] Cliente: O sistema de análise está a dar erros constantes. As chamadas não são transcritas corretamente e as pontuações não fazem sentido.
[00:32] Agente: Hmm, deixe-me ver... Não estou a ver nenhum registo de chamadas anteriores suas.
[00:40] Cliente: É exatamente isso que eu digo! Ninguém regista nada! Cada vez que ligo tenho de explicar tudo de novo!
[00:50] Agente: Ok, não sei bem o que lhe dizer. Talvez o melhor seja falar com o meu supervisor.
[00:58] Cliente: Já me disseram isso da última vez e ninguém me ligou de volta!
[01:05] Agente: Vou transferir a chamada para o departamento técnico...
[01:10] Cliente: Não, não quero ser transferido outra vez! Quero cancelar o serviço e pronto!
[01:18] Agente: Ok, para cancelar preciso de enviar um pedido ao departamento de cancelamentos. Demora cerca de 5 dias úteis.
[01:28] Cliente: 5 dias para cancelar? Isso é ridículo!
[01:33] Agente: É o procedimento normal.
[01:36] Cliente: Vou fazer reclamação no livro de reclamações!
[01:40] Agente: Está no seu direito. Mais alguma coisa?
[01:44] Cliente: Não, obrigado por nada.
[01:47] Agente: Ok, bom dia.`,
  };

  return transcriptions[quality];
}

export default router;
