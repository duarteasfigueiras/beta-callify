import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Standard criteria for call evaluation
const STANDARD_CRITERIA = [
  {
    name: 'Abertura/Identificação',
    description: 'Identificação clara (nome + empresa), tom profissional e cordial',
    weight: 1
  },
  {
    name: 'Identificação de Necessidades',
    description: 'Perguntas para entender o cliente, escuta ativa',
    weight: 2
  },
  {
    name: 'Apresentação de Solução/Proposta',
    description: 'Explicação clara do produto/serviço, adaptação às necessidades identificadas',
    weight: 3
  },
  {
    name: 'Tratamento de Objeções',
    description: 'Resposta adequada a dúvidas/resistências, argumentação sem ser agressivo',
    weight: 2
  },
  {
    name: 'Clareza na Comunicação',
    description: 'Linguagem simples e compreensível, evitar jargão técnico',
    weight: 1
  },
  {
    name: 'Tom Profissional',
    description: 'Cortesia constante, controlo emocional',
    weight: 1
  },
  {
    name: 'Próximo Passo Definido',
    description: 'Agendamento de follow-up, call-to-action claro',
    weight: 3
  },
  {
    name: 'Fecho da Chamada',
    description: 'Resumo do acordado, despedida profissional',
    weight: 1
  }
];

async function addStandardCriteria() {
  console.log('Fetching all companies...');

  // Get all companies
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name');

  if (companiesError) {
    console.error('Error fetching companies:', companiesError);
    process.exit(1);
  }

  console.log(`Found ${companies?.length || 0} companies`);

  for (const company of companies || []) {
    console.log(`\nProcessing company: ${company.name} (ID: ${company.id})`);

    // Get all categories for this company
    const { data: categories, error: categoriesError } = await supabase
      .from('category_metadata')
      .select('key, name')
      .eq('company_id', company.id);

    if (categoriesError) {
      console.error(`Error fetching categories for company ${company.id}:`, categoriesError);
      continue;
    }

    // Also add criteria for 'all' category (global)
    const allCategories = [
      { key: 'all', name: 'Todos' },
      ...(categories || [])
    ];

    console.log(`  Found ${allCategories.length} categories: ${allCategories.map(c => c.key).join(', ')}`);

    for (const category of allCategories) {
      console.log(`  Processing category: ${category.name} (${category.key})`);

      let addedCount = 0;
      let skippedCount = 0;

      for (const criterion of STANDARD_CRITERIA) {
        // Check if criterion already exists for this category
        const { data: existing } = await supabase
          .from('criteria')
          .select('id')
          .eq('company_id', company.id)
          .eq('category', category.key)
          .eq('name', criterion.name)
          .limit(1);

        if (existing && existing.length > 0) {
          skippedCount++;
          continue;
        }

        // Add the criterion
        const { error: insertError } = await supabase
          .from('criteria')
          .insert({
            company_id: company.id,
            category: category.key,
            name: criterion.name,
            description: criterion.description,
            weight: criterion.weight,
            is_active: true
          });

        if (insertError) {
          console.error(`    Error adding criterion "${criterion.name}":`, insertError.message);
        } else {
          addedCount++;
        }
      }

      console.log(`    Added: ${addedCount}, Skipped (already exist): ${skippedCount}`);
    }
  }

  console.log('\n✅ Done adding standard criteria to all categories!');
}

addStandardCriteria();
