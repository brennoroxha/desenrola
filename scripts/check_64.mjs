import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xxhvnwllvwmirigqeamx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aHZud2xsdndtaXJpZ3FlYW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY4NTM3NSwiZXhwIjoyMTAzMjYxMzc1fQ.pryomcIz2CfnE2C7sF5rqOdBnAIUsTJbWfX3AiIUXs4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log("Buscando transações com valor R$ 64,23...");
    
    // O banco salva em centavos, então 64,23 é 6423
    const { data: txs, error: txError } = await supabase
        .from('desenrola_pix_transactions')
        .select('*')
        .eq('amount_cents', 6423);
        
    if (txError) {
        console.error("Erro ao buscar:", txError);
        return;
    }

    if (txs && txs.length > 0) {
        console.log(`Foram encontrados ${txs.length} pedido(s) com valor de R$ 64,23!`);
        txs.forEach(t => {
            console.log(`\n- Pedido ID: ${t.id}`);
            console.log(`- CPF: ${t.cpf}`);
            console.log(`- Nome: ${t.nome}`);
            console.log(`- Status: ${t.status}`);
            console.log(`- Data de Criação: ${t.criado_em}`);
            console.log(`- Data de Atualização: ${t.atualizado_em}`);
        });
    } else {
        console.log("Nenhum pedido no valor de R$ 64,23 foi encontrado no banco de dados.");
    }
}

run();
