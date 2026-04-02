const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const PRESS_MONITOR_PROMPT = `Eres un monitor de inteligencia de prensa internacional especializado en Oriente Medio. Busca las noticias MAS RECIENTES de Financial Times, The Economist y New York Times sobre: Iran (militar/nuclear/diplomatico), Estrecho de Hormuz (trafico/bloqueos), Israel (operaciones/ataques), misiles y drones en Oriente Medio, movimiento de tropas y portaaviones, Houthis/Yemen, reaccion de EEUU/OTAN. RESPONDE SOLO CON ARRAY JSON. Sin texto. Sin backticks. Formato: [{"source":"Financial Times","headline":"titular","reading":"2-3 frases de relevancia","date":"hace Xh","tema":"Iran|Hormuz|Israel|EEUU|Tropas"}] Entre 5 y 9 items, de mas reciente a mas antiguo.`;

const SPAIN_IMPACT_PROMPT = `Eres un analista del impacto en España de conflictos internacionales. Busca noticias recientes en El Pais, El Mundo, ABC, Expansion, La Vanguardia y Cinco Dias sobre el impacto de la crisis Iran/Ormuz en España: precio gasolina/gasoil, inflacion, tropas españolas, bases americanas (Rota, Moron), declaraciones del Gobierno y oposicion. RESPONDE SOLO CON JSON. Formato: {"resumen":"frase","temas":[{"tema":"nombre","severidad":"alta|media","fuentes":["El Pais"],"texto":"analisis"}]} Entre 4 y 6 temas.`;

const GEOPOLITICAL_ANALYST_PROMPT = `Eres un analista geopolitico senior. RESPONDE SOLO CON JSON. Sin texto. Sin backticks.
Formato: {"fecha":"","resumen_ejecutivo":"2 frases","indicadores":[{"id":"brent","nombre":"Brent","valor_actual":"$X/bbl","variacion":"+X%","direccion":"up","estado":"ALERTA","lectura":"frase"}],"escenarios":[{"id":"s1","nombre":"Ruido sin consecuencias","probabilidad":10,"descripcion":"frase","activo":false}],"narrativa_principal":"4-5 frases","segunda_derivada":[{"orden":"1a","cadena":"frase"}],"lectura_maestra":{"sube_energia":true,"tensa_maritimo":true,"miedo_financiero":true,"deteriora_actividad":true,"veredicto":"2 frases"}}`;

app.post('/api/generate', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    }

    const client = new Anthropic({ apiKey });

    // Paso 1: Prensa
    console.log('Paso 1: Monitoreando prensa...');
    const pressResponse = await client.messages.create({
      model: 'claude-opus-4-20250805',
      max_tokens: 2000,
      messages: [{ role: 'user', content: PRESS_MONITOR_PROMPT }]
    });

    const pressText = pressResponse.content.find(block => block.type === 'text')?.text || '[]';
    let pressData = [];
    try {
      pressData = JSON.parse(pressText);
    } catch (e) {
      console.log('Press parsing error');
    }

    // Paso 2: España
    console.log('Paso 2: Analizando España...');
    const spainResponse = await client.messages.create({
      model: 'claude-opus-4-20250805',
      max_tokens: 2000,
      messages: [{ role: 'user', content: SPAIN_IMPACT_PROMPT }]
    });

    const spainText = spainResponse.content.find(block => block.type === 'text')?.text || '{}';
    let spainData = {};
    try {
      spainData = JSON.parse(spainText);
    } catch (e) {
      console.log('Spain parsing error');
    }

    // Paso 3: Análisis geopolítico
    console.log('Paso 3: Generando análisis...');
    const contextPrompt = `Con base en estas noticias recientes: ${JSON.stringify(pressData.slice(0, 3))} y este impacto en España: ${JSON.stringify(spainData.resumen || '')}, ${GEOPOLITICAL_ANALYST_PROMPT}`;

    const geoResponse = await client.messages.create({
      model: 'claude-opus-4-20250805',
      max_tokens: 3000,
      messages: [{ role: 'user', content: contextPrompt }]
    });

    const geoText = geoResponse.content.find(block => block.type === 'text')?.text || '{}';
    let geoData = {};
    try {
      geoData = JSON.parse(geoText);
    } catch (e) {
      console.log('Geo parsing error');
    }

    res.json({
      success: true,
      report: {
        timestamp: new Date().toISOString(),
        press: pressData,
        spain: spainData,
        analysis: geoData
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
