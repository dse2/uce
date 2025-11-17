import { GoogleGenAI, Type } from "@google/genai";
import { ProcuracaoData } from '../types';

// Assume process.env.API_KEY is available in the execution environment
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

if (!API_KEY) {
  console.warn("API key for Gemini is not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const correctGrammarWithGemini = async (data: ProcuracaoData): Promise<ProcuracaoData> => {
    if (!API_KEY) {
        console.warn("API key for Gemini is not set. Grammar correction will be skipped.");
        return data;
    }

    const procurador1Nome = data.procurador1_nome || '';
    const procurador1Nacionalidade = data.procurador1_nacionalidade || '';
    const procurador2Nome = data.procurador2_nome || '';
    const procurador2Nacionalidade = data.procurador2_nacionalidade || '';
    
    // Do not call the API if there are no names to check.
    if (!procurador1Nome && !procurador2Nome) {
        return data;
    }
    
    // Skip if nationalities are missing, as there's nothing to correct.
    if (!procurador1Nacionalidade && !procurador2Nacionalidade) {
        return data;
    }


    const model = "gemini-2.5-flash";
    const prompt = `
        Analise os nomes e nacionalidades a seguir. Com base no nome, determine o gênero gramatical correto para a nacionalidade em português.
        Por exemplo, se o nome for "Pedro" e a nacionalidade "brasileira", corrija para "brasileiro".
        Se o nome for "Ana" e a nacionalidade "brasileiro", corrija para "brasileira".
        Se um nome não estiver presente, retorne a nacionalidade original ou uma string vazia se a original também for vazia.
        Se a nacionalidade já estiver correta, mantenha-a.
        
        Dados:
        - Procurador 1: Nome: "${procurador1Nome}", Nacionalidade Atual: "${procurador1Nacionalidade}"
        - Procurador 2: Nome: "${procurador2Nome}", Nacionalidade Atual: "${procurador2Nacionalidade}"

        Retorne APENAS o JSON com as nacionalidades corrigidas. Não inclua markdown backticks ou qualquer outro texto.
    `;
    
    try {
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                procurador1_nacionalidade: { 
                    type: Type.STRING,
                    description: "Nacionalidade corrigida para o procurador 1." 
                },
                procurador2_nacionalidade: { 
                    type: Type.STRING,
                    description: "Nacionalidade corrigida para o procurador 2."
                },
            },
            required: ['procurador1_nacionalidade', 'procurador2_nacionalidade']
        };

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const correctedValues = JSON.parse(jsonText);

        const newData = { ...data };
        
        if (procurador1Nome && typeof correctedValues.procurador1_nacionalidade === 'string') {
            newData.procurador1_nacionalidade = correctedValues.procurador1_nacionalidade;
        }

        if (procurador2Nome && typeof correctedValues.procurador2_nacionalidade === 'string') {
            newData.procurador2_nacionalidade = correctedValues.procurador2_nacionalidade;
        }

        return newData;

    } catch (error) {
        console.error("Error calling Gemini API for grammar correction:", error);
        // Returns original data in case of error
        return data;
    }
};

export const analyzeDataWithGemini = async (data: ProcuracaoData): Promise<string> => {
  if (!API_KEY) {
    return "A chave da API do Gemini não está configurada. A análise não pode ser realizada.";
  }
  
  const model = "gemini-2.5-flash";

  const prompt = `
    Analise os seguintes dados para uma procuração bancária da empresa "LCM CONSTRUÇÃO E COMÉRCIO S/A".
    Aja como um assistente jurídico sênior e revise as informações.
    Seu objetivo é identificar possíveis inconsistências, erros de digitação óbvios, informações que parecem incompletas (ex: CPF com número de dígitos incorreto, RG sem órgão emissor, etc.) ou quaisquer outros pontos que mereçam uma segunda verificação antes de gerar o documento oficial.
    Verifique especificamente a consistência entre os dados dos procuradores e os dados bancários.
    Forneça sua análise em português, em formato de lista (bullet points). Seja conciso e direto. Se tudo parecer correto, simplesmente afirme que os dados parecem consistentes e prontos para geração.

    Dados para análise:
    ${JSON.stringify(data, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        return `Erro ao contatar a API de IA: ${error.message}`;
    }
    return "Ocorreu um erro desconhecido durante a análise da IA.";
  }
};
