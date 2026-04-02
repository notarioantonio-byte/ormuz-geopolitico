const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.post('/api/generate', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada' });
    }

    const client = new Anthropic({ apiKey });

    const PRESS_PROMPT = `Eres un monitor de prensa internacional. Busca noticias recientes de FT, Economist, NYT sobre Iran, Hormuz, Israel, misiles, tropas, OTAN. RESPONDE SOLO JSON: [{"source":"FT","headline":"...","reading":"...","date":"hace Xh","tema":"Iran"}]`;

    const SPAIN_PROMPT = `Eres analista de impacto España. Busca noticias de El País, Mundo, ABC sobre gasolina, inflación, bases Rota/Morón, Gobierno. RESPONDE SOLO JSON: {"resumen":"...","temas":[{"tema":"...","severidad":"alta","fuentes":["El País"],"texto":"..."}]}`;

    const GEO_PROMPT = `Eres analista geopolítico senior. RESPONDE SOLO JSON: {"fecha":"hoy","resumen_ejecutivo":"...","indicadores":[{"nombre":"Brent","valor_actual":"$105/bbl","variacion":"+4%","estado":"ALERTA"}],"escenarios":[{"nombre":"Escalada","probabilidad":50,"activo":true}],"narrativa_principal":"...","segunda_derivada":[{"orden":"1a","cadena":"..."}],"lectura_maestra":{"sube_energia":true,"veredicto":"..."}}`;

    console.log('Paso 1: Buscando noticias...');
    const pressRes = await client.messages.create({
      model: 'claude-opus-4-20250805',
      max_tokens: 1500,
      messages: [{ role: 'user', content: PRESS_PROMPT }]
    });
    const pressText = pressRes.content[0].text || '[]';
    let press = [];
    try { press = JSON.parse(pressText); } catch (e) { console.log('Press error'); }

    console.log('Paso 2: Analizando España...');
    const spainRes = await client.messages.create({
      model: 'claude-opus-4-20250805',
      max_tokens: 1500,
      messages: [{ role: 'user', content: SPAIN_PROMPT }]
    });
    const spainText = spainRes.content[0].text || '{}';
    let spain = {};
    try { spain = JSON.parse(spainText); } catch (e) { console.log('Spain error'); }

    console.log('Paso 3: Generando análisis...');
    const geoRes = await client.messages.create({
      model: 'claude-opus-4-20250805',
      max_tokens: 2500,
      messages: [{ role: 'user', content: GEO_PROMPT }]
    });
    const geoText = geoRes.content[0].text || '{}';
    let geo = {};
    try { geo = JSON.parse(geoText); } catch (e) { console.log('Geo error'); }

    res.json({
      success: true,
      report: {
        timestamp: new Date().toISOString(),
        press: press,
        spain: spain,
        analysis: geo
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});
