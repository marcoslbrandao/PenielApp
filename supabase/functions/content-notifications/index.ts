// supabase/functions/content-notifications/index.ts
// Disparado por um Database Webhook do Supabase sempre que uma linha nova é
// inserida em `avisos` ou `devocionais`. Manda push real via Expo.
//
// Segmentação por grupo: quando o registro tem `grupo` preenchido
// (mulheres/homens/jovens), o push vai só pra quem está em `grupo_membros`
// daquele grupo (via `members.profile_id`) — não pra igreja toda. Sem
// `grupo` (null), continua sendo um push geral pra todo mundo com token,
// igual sempre foi.
//
// Como ligar (uma vez só, no Supabase Dashboard):
// 1. Deploy: supabase functions deploy content-notifications
// 2. Dashboard > Database > Webhooks > Create a new webhook
//    - Table: avisos   | Events: Insert | Type: Supabase Edge Functions
//      Edge Function: content-notifications
//    - Repita criando um segundo webhook igual para a tabela: devocionais

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const table = payload.table as string;
    const record = payload.record as any;

    let titulo = '';
    let corpo = '';
    let tipo = '';

    if (table === 'avisos') {
      const tag = record.tipo === 'urgente' ? '🚨' : record.tipo === 'evento' ? '📅' : '📢';
      titulo = `${tag} ${record.titulo}`;
      corpo = String(record.texto ?? '').slice(0, 140);
      tipo = 'aviso';
    } else if (table === 'devocionais') {
      titulo = `📖 Novo devocional: ${record.titulo}`;
      corpo = `"${record.versiculo}" — ${record.referencia}`;
      tipo = 'devocional';
    } else {
      return new Response(JSON.stringify({ message: `Tabela ${table} não é tratada por esta função.` }), { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const grupo = record.grupo as string | null | undefined;

    let tokens: { token: string }[] | null = null;

    if (grupo) {
      // Só quem foi adicionado a esse grupo (pelo líder) recebe. Busca via
      // grupo_membros -> members.profile_id -> push_tokens.user_id.
      const { data: membros, error: membrosError } = await supabase
        .from('grupo_membros')
        .select('members(profile_id)')
        .eq('grupo', grupo);
      if (membrosError) throw membrosError;

      const profileIds = [...new Set(
        (membros ?? [])
          .map((m: any) => m.members?.profile_id)
          .filter((id: string | null) => !!id)
      )];

      if (profileIds.length === 0) {
        return new Response(JSON.stringify({ message: `Ninguém com conta vinculada no grupo ${grupo} ainda.` }), { status: 200 });
      }

      const { data: tokensData, error: tokensError } = await supabase
        .from('push_tokens').select('token').in('user_id', profileIds);
      if (tokensError) throw tokensError;
      tokens = tokensData;
    } else {
      const { data: tokensData, error: tokensError } = await supabase.from('push_tokens').select('token');
      if (tokensError) throw tokensError;
      tokens = tokensData;
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum token de push encontrado.' }), { status: 200 });
    }

    const mensagens = tokens.map((t: any) => ({
      to: t.token,
      title: titulo,
      body: corpo,
      sound: 'default',
      data: { type: tipo, grupo: grupo ?? null },
    }));

    // Expo aceita no máximo 100 mensagens por request — quebra em lotes.
    const lotes = [];
    for (let i = 0; i < mensagens.length; i += 100) lotes.push(mensagens.slice(i, i + 100));

    const resultados = [];
    for (const lote of lotes) {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lote),
      });
      resultados.push(await response.json());
    }

    return new Response(JSON.stringify({ success: true, enviados: tokens.length, resultados }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
