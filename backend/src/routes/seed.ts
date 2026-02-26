import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../db/supabase';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { isAdminOrDeveloper } from '../types';

const router = Router();

router.use(authenticateToken);

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 10) / 10;

// POST /api/seed/demo — Batch-create fictitious data for the admin's company
router.post('/demo', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !isAdminOrDeveloper(req.user.role)) {
      return res.status(403).json({ error: 'Admin or developer access required' });
    }

    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'No company associated' });
    }

    // ===== 1. Create agents (batch) =====
    const passwordHash = await bcrypt.hash('Demo2026!Agent', 13);
    const agents = [
      { display_name: 'Ana Silva', email: 'ana.silva@demo.com', custom_role_name: 'Comercial', categories: ['Comercial'] },
      { display_name: 'João Santos', email: 'joao.santos@demo.com', custom_role_name: 'Comercial', categories: ['Comercial'] },
      { display_name: 'Maria Costa', email: 'maria.costa@demo.com', custom_role_name: 'Suporte', categories: ['Suporte'] },
      { display_name: 'Pedro Oliveira', email: 'pedro.oliveira@demo.com', custom_role_name: 'Comercial', categories: ['Comercial'] },
      { display_name: 'Sofia Ferreira', email: 'sofia.ferreira@demo.com', custom_role_name: 'Suporte', categories: ['Suporte'] },
    ];

    // Delete existing demo agents to avoid conflicts
    await supabase.from('users').delete().eq('company_id', companyId).like('email', '%@demo.com');

    const { data: insertedAgents, error: agentErr } = await supabase
      .from('users')
      .insert(agents.map(a => ({
        company_id: companyId, username: a.email, email: a.email,
        password_hash: passwordHash, role: 'agent',
        display_name: a.display_name, custom_role_name: a.custom_role_name,
        categories: a.categories, language_preference: 'pt', theme_preference: 'light',
      })))
      .select('id');

    if (agentErr) {
      console.error('[Seed] Agent error:', agentErr.message);
      return res.status(500).json({ error: 'Failed to create agents: ' + agentErr.message });
    }

    const agentIds = (insertedAgents || []).map((a: any) => a.id);
    if (agentIds.length === 0) {
      return res.status(500).json({ error: 'No agents created' });
    }

    // ===== 2. Create criteria (batch) =====
    const criteriaList = [
      { name: 'Saudação/Abertura', description: 'Cumprimento e abertura profissional', weight: 1, category: 'Comercial' },
      { name: 'Identificação da necessidade', description: 'Identificação das necessidades do cliente', weight: 2, category: 'Comercial' },
      { name: 'Escuta ativa', description: 'Demonstração de escuta ativa e empatia', weight: 1, category: 'Comercial' },
      { name: 'Apresentação de solução', description: 'Apresentação clara de soluções', weight: 3, category: 'Comercial' },
      { name: 'Tratamento de objeções', description: 'Gestão eficaz das objeções', weight: 2, category: 'Comercial' },
      { name: 'Clareza na comunicação', description: 'Comunicação clara e compreensível', weight: 1, category: 'Comercial' },
      { name: 'Tom profissional', description: 'Tom profissional mantido', weight: 1, category: 'Comercial' },
      { name: 'Próximo passo definido', description: 'Definição clara do próximo passo', weight: 3, category: 'Comercial' },
      { name: 'Fecho da chamada', description: 'Encerramento profissional', weight: 1, category: 'Comercial' },
      { name: 'Resolução no 1º contacto', description: 'Resolução na primeira chamada', weight: 3, category: 'Suporte' },
      { name: 'Empatia e compreensão', description: 'Empatia pela situação do cliente', weight: 2, category: 'Suporte' },
      { name: 'Conhecimento técnico', description: 'Conhecimento do produto/serviço', weight: 2, category: 'Suporte' },
    ];

    // Get or create criteria
    const { data: existingCriteria } = await supabase
      .from('criteria').select('id, name').eq('company_id', companyId);

    const existingNames = new Set((existingCriteria || []).map((c: any) => c.name));
    const newCriteria = criteriaList.filter(c => !existingNames.has(c.name));

    if (newCriteria.length > 0) {
      await supabase.from('criteria').insert(newCriteria.map(c => ({ company_id: companyId, ...c })));
    }

    const { data: allCriteria } = await supabase
      .from('criteria').select('id').eq('company_id', companyId);
    const criteriaIds = (allCriteria || []).map((c: any) => c.id);

    // ===== 3. Generate calls (batch) =====
    const phones = ['+351912345678', '+351923456789', '+351934567890', '+351945678901',
      '+351956789012', '+351967890123', '+351978901234', '+351989012345',
      '+351911222333', '+351922333444', '+351933444555', '+351944555666'];

    const summariesGood = [
      'Cliente interessado em upgrade do plano. Identificação excelente e proposta adequada.',
      'Venda concretizada com sucesso. Cliente aderiu ao plano Pro.',
      'Excelente atendimento técnico. Problema resolvido na primeira chamada.',
      'Cliente novo captado. Apresentação clara e fecho com agendamento.',
      'Follow-up produtivo. Cliente confirmou interesse e agendou reunião.',
      'Renovação de contrato negociada com sucesso. Fidelização por 12 meses.',
      'Demonstração do produto muito bem conduzida. Cliente impressionado com funcionalidades.',
    ];
    const summariesMed = [
      'Chamada informativa. Cliente pediu para pensar e ligar de volta.',
      'Suporte técnico parcial. Problema escalado para nível 2.',
      'Dúvidas sobre faturação. Informação fornecida mas cliente com reservas.',
      'Proposta comercial apresentada. Cliente a comparar com concorrência.',
      'Follow-up a cliente antigo. Interesse moderado, pediu catálogo.',
      'Suporte sobre configuração. Processo guiado mas demorado.',
    ];
    const summariesBad = [
      'Reclamação sobre serviço. Cliente muito insatisfeito. Escalado para supervisor.',
      'Pedido de cancelamento. Tentativa de retenção sem sucesso.',
      'Atendimento demorado com múltiplas transferências. Cliente frustrado.',
      'Faturação incorreta. Problema não resolvido, necessário investigação.',
    ];

    const nextStepsGood = ['Enviar proposta por email', 'Agendar demonstração', 'Enviar contrato', 'Follow-up em 3 dias', 'Preparar apresentação personalizada'];
    const nextStepsMed = ['Aguardar contacto do cliente', 'Enviar catálogo atualizado', 'Escalar para nível 2', 'Recontactar em 5 dias'];
    const nextStepsBad = ['Escalar para supervisor', 'Investigar e responder em 48h', 'Reunião com gestão'];

    const contactReasons = [
      [{ categoria: 'Comercial', motivo: 'Pedido de informação sobre planos' }],
      [{ categoria: 'Comercial', motivo: 'Upgrade de plano' }],
      [{ categoria: 'Comercial', motivo: 'Pedido de orçamento' }],
      [{ categoria: 'Suporte', motivo: 'Problema técnico' }],
      [{ categoria: 'Suporte', motivo: 'Dúvida de faturação' }],
      [{ categoria: 'Suporte', motivo: 'Configuração do serviço' }],
      [{ categoria: 'Comercial', motivo: 'Renovação de contrato' }],
      [{ categoria: 'Suporte', motivo: 'Reclamação sobre serviço' }],
      [{ categoria: 'Comercial', motivo: 'Pedido de demonstração' }, { categoria: 'Comercial', motivo: 'Comparação de planos' }],
    ];

    const objections = [
      [{ categoria: 'Preço', objecao: 'Preço elevado vs concorrência' }],
      [{ categoria: 'Preço', objecao: 'Precisamos de desconto' }],
      [{ categoria: 'Prazo', objecao: 'Prazo de implementação longo' }],
      [{ categoria: 'Funcionalidades', objecao: 'Falta integração com CRM' }],
      [{ categoria: 'Decisão', objecao: 'Preciso consultar superior' }],
    ];

    const wentWellSets = [
      [{ text: 'Excelente identificação de necessidades', timestamp: '00:45' }, { text: 'Apresentação clara', timestamp: '01:30' }],
      [{ text: 'Tom profissional mantido', timestamp: '00:20' }, { text: 'Boa gestão do tempo', timestamp: '02:00' }],
      [{ text: 'Escuta ativa demonstrada', timestamp: '00:55' }, { text: 'Solução adequada', timestamp: '02:30' }],
      [{ text: 'Tratamento de objeções eficaz', timestamp: '01:45' }, { text: 'Fecho exemplar', timestamp: '03:15' }],
      [{ text: 'Empatia demonstrada', timestamp: '00:30' }, { text: 'Resolução rápida', timestamp: '01:00' }],
    ];

    const wentWrongSets = [
      [{ text: 'Poderia ter explorado mais objeções', timestamp: '02:15' }],
      [{ text: 'Tempo de espera elevado', timestamp: '01:30' }],
      [{ text: 'Faltou criar urgência', timestamp: '03:00' }],
      [{ text: 'Próximo passo pouco concreto', timestamp: '02:30' }],
      [],
      [{ text: 'Chamada longa', timestamp: '04:30' }, { text: 'Cliente mencionou cancelamento', timestamp: '05:00' }],
    ];

    const callRows: any[] = [];

    for (let i = 0; i < 80; i++) {
      const daysAgo = Math.floor(Math.random() * 45);
      const callDate = new Date();
      callDate.setDate(callDate.getDate() - daysAgo);
      callDate.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);

      const quality = Math.random();
      let score: number, summaryType: 'good' | 'medium' | 'bad';

      if (quality > 0.6) { score = rand(7.5, 9.8); summaryType = 'good'; }
      else if (quality > 0.2) { score = rand(5.5, 7.4); summaryType = 'medium'; }
      else { score = rand(3.0, 5.4); summaryType = 'bad'; }

      const duration = summaryType === 'good' ? 120 + Math.floor(Math.random() * 240)
        : summaryType === 'medium' ? 180 + Math.floor(Math.random() * 300)
        : 240 + Math.floor(Math.random() * 420);

      const skillScores = [
        { skill: 'Escuta Ativa', score: Math.max(1, Math.min(10, rand(score - 1.5, score + 1.5))) },
        { skill: 'Clareza', score: Math.max(1, Math.min(10, rand(score - 1, score + 1))) },
        { skill: 'Objeções', score: Math.max(1, Math.min(10, rand(score - 2, score + 1.5))) },
        { skill: 'Fecho', score: Math.max(1, Math.min(10, rand(score - 1.5, score + 2))) },
        { skill: 'Empatia', score: Math.max(1, Math.min(10, rand(score - 1, score + 1.5))) },
      ];

      const hasRiskWords = summaryType === 'bad' && Math.random() > 0.4;
      const riskWords = hasRiskWords ? pick([['cancelar'], ['insatisfeito', 'reclamação'], ['cancelar', 'mudar de fornecedor']]) : [];

      callRows.push({
        company_id: companyId,
        agent_id: pick(agentIds),
        phone_number: pick(phones),
        direction: Math.random() > 0.3 ? 'inbound' : 'outbound',
        duration_seconds: duration,
        final_score: score,
        call_date: callDate.toISOString(),
        summary: summaryType === 'good' ? pick(summariesGood) : summaryType === 'medium' ? pick(summariesMed) : pick(summariesBad),
        next_step_recommendation: summaryType === 'good' ? pick(nextStepsGood) : summaryType === 'medium' ? pick(nextStepsMed) : pick(nextStepsBad),
        what_went_well: JSON.stringify(pick(wentWellSets)),
        what_went_wrong: JSON.stringify(pick(wentWrongSets)),
        risk_words_detected: JSON.stringify(riskWords),
        contact_reasons: JSON.stringify(pick(contactReasons)),
        objections: summaryType !== 'good' || Math.random() > 0.5 ? JSON.stringify(pick(objections)) : JSON.stringify([]),
        skill_scores: JSON.stringify(skillScores),
        phrases_to_avoid: JSON.stringify(summaryType === 'bad' ? ['Não sei', 'Isso não é possível'] : []),
        recommended_phrases: JSON.stringify(['Como posso ajudá-lo?', 'Compreendo a sua situação', 'Vou resolver isso']),
        response_improvement_example: JSON.stringify({ before: 'Não sei se conseguimos.', after: 'Vou verificar e dou-lhe resposta até amanhã.' }),
        top_performer_comparison: JSON.stringify({ agent_score: score, top_performer_score: rand(8.5, 9.8), areas_to_improve: score < 7 ? ['Objeções', 'Próximo passo'] : ['Consistência'] }),
      });
    }

    // Batch insert calls
    const { data: insertedCalls, error: callErr } = await supabase
      .from('calls').insert(callRows).select('id');

    if (callErr) {
      console.error('[Seed] Calls error:', callErr.message);
      return res.status(500).json({ error: 'Failed to create calls: ' + callErr.message });
    }

    const callIds = (insertedCalls || []).map((c: any) => c.id);

    // ===== 4. Create criteria results (batch) =====
    if (criteriaIds.length > 0 && callIds.length > 0) {
      const criteriaResults: any[] = [];
      for (const callId of callIds) {
        // Use a subset of criteria per call (6-10)
        const numCriteria = 6 + Math.floor(Math.random() * (criteriaIds.length - 5));
        const shuffled = [...criteriaIds].sort(() => Math.random() - 0.5).slice(0, numCriteria);
        for (const criterionId of shuffled) {
          criteriaResults.push({
            call_id: callId,
            criterion_id: criterionId,
            passed: Math.random() > 0.3,
            justification: Math.random() > 0.5 ? 'Critério cumprido adequadamente.' : 'Necessita melhoria neste aspeto.',
          });
        }
      }
      // Insert in chunks of 500
      for (let i = 0; i < criteriaResults.length; i += 500) {
        const chunk = criteriaResults.slice(i, i + 500);
        const { error: crErr } = await supabase.from('call_criteria_results').insert(chunk);
        if (crErr) console.error('[Seed] Criteria results chunk error:', crErr.message);
      }
    }

    // ===== 5. Create alerts (batch) =====
    const alertTypes = ['low_score', 'risk_words', 'long_duration', 'no_next_step'] as const;
    const alertRows: any[] = [];
    for (let i = 0; i < 25; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const alertDate = new Date();
      alertDate.setDate(alertDate.getDate() - daysAgo);
      const alertType = pick([...alertTypes]);
      const msgs: Record<string, string> = {
        low_score: `Chamada com pontuação baixa (${rand(2, 5).toFixed(1)}/10)`,
        risk_words: 'Palavras de risco: "cancelar", "insatisfeito"',
        long_duration: `Duração excessiva (${Math.floor(rand(8, 15))} min)`,
        no_next_step: 'Sem próximo passo definido',
      };
      alertRows.push({
        company_id: companyId, call_id: pick(callIds), agent_id: pick(agentIds),
        type: alertType, message: msgs[alertType],
        is_read: Math.random() > 0.6, created_at: alertDate.toISOString(),
      });
    }
    await supabase.from('alerts').insert(alertRows);

    // ===== 6. Ensure categories exist =====
    for (const cat of [{ key: 'comercial', name: 'Comercial', color_id: 'blue' }, { key: 'suporte', name: 'Suporte', color_id: 'green' }]) {
      const { data: ex } = await supabase.from('category_metadata').select('id').eq('company_id', companyId).eq('key', cat.key).single();
      if (!ex) await supabase.from('category_metadata').insert({ company_id: companyId, ...cat });
    }

    return res.json({ success: true, agents: agentIds.length, calls: callIds.length, alerts: alertRows.length, criteria: criteriaIds.length });
  } catch (error: any) {
    console.error('[Seed] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to seed' });
  }
});

export default router;
