
import { GoogleGenAI, Type } from "@google/genai";
import { QuizConfig, Question } from "./types";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const safeJsonParse = (text: string | undefined): any => {
  if (!text) return [];
  const trimmed = text.trim();
  try {
    const jsonStr = trimmed.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("JSON parse error:", e);
    const match = trimmed.match(/\[\s*\{.*\}\s*\]/s);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return []; }
    }
    return [];
  }
};

const questionSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING },
      options: { type: Type.ARRAY, items: { type: Type.STRING } },
      correctAnswerIndex: { type: Type.INTEGER },
      explanation: { type: Type.STRING }
    },
    required: ["text", "options", "correctAnswerIndex", "explanation"]
  }
};

const DEFAULT_MODEL = "gemini-3-flash-preview";

export const generateQuizQuestions = async (config: QuizConfig, retries = 2): Promise<Question[]> => {

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const prompt = `Dostonbek Academy professional test savollari generatori.
    Fan: ${config.category}
    Mavzu: ${config.category} - ${config.topic} - ${config.subTopic}
    Daraja: ${config.difficulty}
    Soni: ${config.questionCount} ta savol.
    Til: O'zbek tili.
    Faqat JSON formatida qaytar. Har bir savolda 4 ta variant bo'lsin.`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
        temperature: 0.8
      }
    });

    const questions = safeJsonParse(response.text);
    if (!questions || questions.length === 0) throw new Error("Savollar generatsiya qilinmadi.");

    return questions.map((q: any, i: number) => ({
      ...q,
      id: Date.now() + i
    }));
  } catch (error: any) {
    if (retries > 0 && (error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("exhausted"))) {
      console.log(`Limitga urildi. Qayta urinish: ${retries}...`);
      await delay(2000); // 2 soniya kutish
      return generateQuizQuestions(config, retries - 1);
    }
    console.error("AI Generation Error:", error);
    throw error;
  }
};

export const parseQuestionsFromText = async (rawText: string, count: number = 10): Promise<Question[]> => {

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const safeText = rawText.length > 15000 ? rawText.substring(0, 15000) + "..." : rawText;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Quyidagi matndan roppa-rosa ${count} ta test savolini ajratib ol: ${safeText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
        temperature: 0.1
      }
    });

    const questions = safeJsonParse(response.text);
    return (questions || []).map((q: any, i: number) => ({
      ...q,
      id: Date.now() + i
    }));
  } catch (error: any) {
    console.error("Parse Error:", error);
    throw error;
  }
};

export const analyzePerformance = async (results: any): Promise<string> => {

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `O'quvchi natijasi: ${results.score}/${results.totalQuestions}. Fan: ${results.category}. Juda qisqa rag'batlantiruvchi tahlil yoz.`
    });
    return response.text || "Ajoyib natija!";
  } catch (e) {
    return "Muvaffaqiyatli yakunladingiz!";
  }
};
