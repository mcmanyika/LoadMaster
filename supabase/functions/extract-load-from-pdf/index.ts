import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing required field: text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `
You extract trucking load data from rate confirmation text.
Return strict JSON only with this exact structure:
{
  "company": {"value": string|null, "confidence": number, "source": string},
  "gross": {"value": number|null, "confidence": number, "source": string},
  "miles": {"value": number|null, "confidence": number, "source": string},
  "dropDate": {"value": "YYYY-MM-DD"|null, "confidence": number, "source": string},
  "origin": {"value": string|null, "confidence": number, "source": string},
  "destination": {"value": string|null, "confidence": number, "source": string}
}
Rules:
- confidence must be 0 to 1
- prefer null over guessing
- gross is total linehaul/rate if present
- output date as YYYY-MM-DD when possible
- The "company" field is the pickup shipper / facility COMPANY NAME ONLY (short proper name, e.g. "GAVCO PLASTICS 4").
  Do NOT include table headers or labels: Name, Pickup, From, To, Address, etc. Not broker/bill-to.
  If only broker is visible, set company to null.
- origin and destination: city and state as "City, ST"; normalize from "City ST" or "City, State" when needed.
- no markdown, no explanation
`.trim();

    const aiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 700,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract fields from this PDF text:\n\n${text}` }
        ]
      })
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.json().catch(() => ({}));
      return new Response(
        JSON.stringify({
          error: 'OpenAI request failed',
          details: err?.error?.message || `HTTP ${aiResponse.status}`
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await aiResponse.json();
    const content = payload?.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'OpenAI returned empty response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Extraction function failed',
        message: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
