
import { GoogleGenAI, Type } from "@google/genai";
import { ProcuracaoData } from '../types';

// Assume process.env.API_KEY is available in the execution environment
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

if (!API_KEY) {
  console.warn("API key for Gemini is not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const correctDataWithGemini = async (data: ProcuracaoData): Promise<ProcuracaoData> => {
    if (!API_KEY) {
        console.warn("API key for Gemini is not set. Data correction will be skipped.");
        return data;
    }

    // Prepare a subset of data for correction to focus the model
    // Convert all to string to match schema expectations, empty string if undefined
    const inputData = {
        procurador1_nome: String(data.procurador1_nome || ''),
        procurador1_nacionalidade: String(data.procurador1_nacionalidade || ''),
        procurador1_profissao: String(data.procurador1_profissao || ''),
        procurador1_estado_civil: String(data.procurador1_estado_civil || ''),
        procurador1_endereco: String(data.procurador1_endereco || ''),

        procurador2_nome: String(data.procurador2_nome || ''),
        procurador2_nacionalidade: String(data.procurador2_nacionalidade || ''),
        procurador2_profissao: String(data.procurador2_profissao || ''),
        procurador2_estado_civil: String(data.procurador2_estado_civil || ''),
        procurador2_endereco: String(data.procurador2_endereco || ''),

        obra: String(data.obra || ''),
        cidade_emissao: String(data.cidade_emissao || 'Belo Horizonte') // Default if missing
    };
    
    // If main fields are empty, skip
    if (!inputData.procurador1_nome && !inputData.procurador2_nome && !inputData.obra) {
        return data;
    }

    const model = "gemini-2.5-flash";
    const prompt = `
        Você é um assistente de revisão jurídica especializado em corrigir erros de digitação e gramática em dados cadastrais.
        
        Sua tarefa:
        1. Analise os campos do JSON fornecido (nomes, nacionalidades, profissões, endereços, obra, cidade).
        2. Corrija erros de ortografia (ex: "Engenhero" -> "Engenheiro", "Rau" -> "Rua").
        3. Corrija acentuação (ex: "Jao" -> "João", "Sao Paulo" -> "São Paulo").
        4. Ajuste a capitalização (ex: "maria da silva" -> "Maria da Silva").
        5. Ajuste a concordância de gênero da nacionalidade e estado civil com base no nome do procurador (ex: "Maria", "Brasileiro" -> "Brasileira").
        6. Se o endereço estiver desformatado mas legível, corrija a escrita dos logradouros (ex: "Av." em vez de "avenida", ou vice-versa para padronizar, preferência para norma culta).
        
        REGRAS CRÍTICAS:
        - NÃO altere números (números de casa, apto, CEP, etc).
        - NÃO invente dados. Se um campo estiver vazio ou "N/A", mantenha vazio.
        - NÃO altere o sentido da informação (ex: não mude o nome da rua, apenas corrija a grafia se estiver errada).
        
        Dados de Entrada:
        ${JSON.stringify(inputData)}
    `;
    
    try {
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                procurador1_nome: { type: Type.STRING },
                procurador1_nacionalidade: { type: Type.STRING },
                procurador1_profissao: { type: Type.STRING },
                procurador1_estado_civil: { type: Type.STRING },
                procurador1_endereco: { type: Type.STRING },
                
                procurador2_nome: { type: Type.STRING },
                procurador2_nacionalidade: { type: Type.STRING },
                procurador2_profissao: { type: Type.STRING },
                procurador2_estado_civil: { type: Type.STRING },
                procurador2_endereco: { type: Type.STRING },
                
                obra: { type: Type.STRING },
                cidade_emissao: { type: Type.STRING },
            },
            required: [
                'procurador1_nome', 'procurador1_nacionalidade', 'procurador1_profissao', 'procurador1_estado_civil', 'procurador1_endereco',
                'procurador2_nome', 'procurador2_nacionalidade', 'procurador2_profissao', 'procurador2_estado_civil', 'procurador2_endereco',
                'obra', 'cidade_emissao'
            ]
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

        // Merge corrected values back into the original data object
        const newData = { ...data };
        
        // Helper to update only if new value is valid string
        const updateIfValid = (key: string) => {
            if (correctedValues[key] !== undefined && correctedValues[key] !== null) {
                newData[key] = correctedValues[key];
            }
        };

        updateIfValid('procurador1_nome');
        updateIfValid('procurador1_nacionalidade');
        updateIfValid('procurador1_profissao');
        updateIfValid('procurador1_estado_civil');
        updateIfValid('procurador1_endereco');
        
        updateIfValid('procurador2_nome');
        updateIfValid('procurador2_nacionalidade');
        updateIfValid('procurador2_profissao');
        updateIfValid('procurador2_estado_civil');
        updateIfValid('procurador2_endereco');

        updateIfValid('obra');
        updateIfValid('cidade_emissao');

        return newData;

    } catch (error) {
        console.error("Error calling Gemini API for data correction:", error);
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
