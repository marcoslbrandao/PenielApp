import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function criarSessao(valor: number, moeda: string) {
  const valorEmCentavos = Math.round(valor * 100);
  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: moeda || 'gbp',
          product_data: { name: 'Dízimos & Ofertas — Peniel Church' },
          unit_amount: valorEmCentavos,
        },
        quantity: 1,
      },
    ],
    payment_method_types: ['card'],
    // Apple Pay e Google Pay aparecem automaticamente no Checkout hospedado
    // do Stripe quando habilitados na conta — não precisa listar aqui.
    success_url: 'https://penielchurchreading.wpcomstaging.com/?oferta=sucesso#oferta',
    cancel_url: 'https://penielchurchreading.wpcomstaging.com/#oferta',
    metadata: {
      origem: 'site_peniel_church',
    },
  });
}

// Dois modos:
// - GET (?valor=25): pensado pra ser chamado direto por um <a href> no
//   site (WordPress.com neutraliza <form> e não executa <script> em
//   blocos de conteúdo, então nada de fetch/JS aqui — só link puro).
//   Responde com um redirect 302 direto pro checkout do Stripe.
//   "Verify JWT" está desligado nesta função (Settings) pra permitir a
//   navegação direta sem headers de autenticação.
// - POST ({ valor, moeda }): modo programático (fetch/JS), responde com
//   { url } em JSON, pro chamador decidir o que fazer.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const valor = Number(url.searchParams.get('valor'));
      const moeda = url.searchParams.get('moeda') || 'gbp';

      if (!valor || valor <= 0) {
        return new Response('Valor inválido', { status: 400, headers: corsHeaders });
      }

      const session = await criarSessao(valor, moeda);
      return Response.redirect(session.url!, 302);
    }

    const { valor, moeda } = await req.json();

    if (!valor || valor <= 0) {
      return new Response(
        JSON.stringify({ error: 'Valor inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const session = await criarSessao(valor, moeda);

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao criar Checkout Session:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
