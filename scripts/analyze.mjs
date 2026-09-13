import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://xxhvnwllvwmirigqeamx.supabase.co';
// Using the service role key from .env
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aHZud2xsdndtaXJpZ3FlYW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY4NTM3NSwiZXhwIjoyMTAzMjYxMzc1fQ.pryomcIz2CfnE2C7sF5rqOdBnAIUsTJbWfX3AiIUXs4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log("Fetching transactions...");
    const { data: txs, error: txError } = await supabase
        .from('desenrola_pix_transactions')
        .select('cpf, status');
        
    if (txError) {
        console.error("Error fetching txs", txError);
        return;
    }

    const paidTxs = txs.filter(t => ['paid', 'PAID', 'approved', 'APPROVED', 'CONCLUIDO'].includes(t.status));
    console.log(`Found ${txs.length} total txs. ${paidTxs.length} are paid/approved.`);
    
    const cpfs = [...new Set(paidTxs.map(t => t.cpf))];
    console.log(`Unique CPFs: ${cpfs.length}`);
    
    if (cpfs.length === 0) {
        console.log("No paid transactions found.");
        return;
    }
    
    const { data: cpfsData, error: cpfsError } = await supabase
        .from('desenrola_cpf_consultas')
        .select('cpf, sexo, nascimento')
        .in('cpf', cpfs);
        
    if (cpfsError) {
        console.error("Error fetching CPFs", cpfsError);
        return;
    }
    
    let males = 0;
    let females = 0;
    let ages = [];
    
    cpfsData.forEach(c => {
        if (c.sexo === 'M') males++;
        else if (c.sexo === 'F') females++;
        
        if (c.nascimento) {
            let birthYear = 0;
            if (c.nascimento.includes('/')) {
                const parts = c.nascimento.split('/');
                birthYear = parseInt(parts[2]);
            } else if (c.nascimento.includes('-')) {
                const parts = c.nascimento.split('-');
                birthYear = parseInt(parts[0]);
            }
            if (birthYear > 1900) {
                const age = new Date().getFullYear() - birthYear;
                ages.push(age);
            }
        }
    });
    
    console.log(`\n--- RESULTADOS DA ANÁLISE ---`);
    console.log(`Homens: ${males}`);
    console.log(`Mulheres: ${females}`);
    if (males > females) {
        console.log(`=> A maioria dos clientes pagantes são Homens.`);
    } else if (females > males) {
        console.log(`=> A maioria das clientes pagantes são Mulheres.`);
    } else {
        console.log(`=> Quantidade igual de homens e mulheres.`);
    }
    
    if (ages.length > 0) {
        const avgAge = ages.reduce((a, b) => a + b, 0) / ages.length;
        console.log(`Média de idade: ${Math.round(avgAge)} anos`);
        const brackets = {
            '18-25': 0,
            '26-35': 0,
            '36-45': 0,
            '46-55': 0,
            '56+': 0
        };
        ages.forEach(age => {
            if (age <= 25) brackets['18-25']++;
            else if (age <= 35) brackets['26-35']++;
            else if (age <= 45) brackets['36-45']++;
            else if (age <= 55) brackets['46-55']++;
            else brackets['56+']++;
        });
        console.log("Distribuição por faixa etária:", brackets);
    }
}

run();
