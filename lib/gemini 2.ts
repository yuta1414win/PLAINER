import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const generationConfig = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};

export const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

export const getGeminiModel = () => {
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig,
    safetySettings,
  });
};

export const processImageForGemini = async (imageBase64: string) => {
  // Remove data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  return {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Data,
    },
  };
};

export const generateContentFromImage = async (
  imageBase64: string,
  prompt: string
) => {
  const model = getGeminiModel();
  const imagePart = await processImageForGemini(imageBase64);

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  return response.text();
};
