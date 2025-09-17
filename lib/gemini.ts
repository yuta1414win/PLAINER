import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google/generative-ai';

// Minimal mock toggle: if MOCK_AI=true or no GEMINI_API_KEY is set, return
// a fake model with deterministic responses so local dev runs without network.
const MOCK_AI = String(process.env.MOCK_AI || '').toLowerCase() === 'true' || !process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

type FakeGenerateResult = {
  response: { text: () => Promise<string> };
};

const fakeModel = {
  generateContent: async (input: unknown): Promise<FakeGenerateResult> => {
    const make = (text: string): FakeGenerateResult => ({ response: { text: async () => text } });

    // If prompt is an array [prompt, imagePart] => complete step or alt text
    if (Array.isArray(input)) {
      return make(
        [
          'TITLE: Example Step',
          'DESCRIPTION: This is a mocked description for local development without a real AI key. It explains the action the user should take in simple, helpful language.',
          'ANNOTATIONS: button: Click here | input: Enter your name',
          'DETECTED_ELEMENTS: button, input, link',
        ].join('\n')
      );
    }

    const prompt = String(input || '').toLowerCase();
    if (prompt.includes('call-to-action')) return make('Continue');
    if (prompt.includes('return only the title')) return make('Getting Started');
    if (prompt.includes('return only the description')) return make('This is a concise, clear mocked description for local testing. It guides users through the next action.');
    if (prompt.includes('return only the tooltip')) return make('Opens the settings panel for this feature.');
    if (prompt.includes('alt text')) return make('Screenshot of an app interface with a button and input field.');
    if (prompt.includes('return only the alternatives')) return make('Option A\nOption B\nOption C');

    // Default: provide step optimizer style suggestion lines
    return make(
      [
        'SUGGESTION: Improve step order | Reorder to reduce cognitive load | high impact, low effort',
        'SUGGESTION: Clarify button label | Make the primary action more explicit | medium impact, low effort',
      ].join('\n')
    );
  },
};

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
  if (MOCK_AI) return fakeModel as any;
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig,
    safetySettings,
  });
};

export type ModelProfile = 'fast' | 'balanced' | 'quality';

export const getGeminiModelForTask = (profile: ModelProfile = 'balanced') => {
  if (MOCK_AI) return fakeModel as any;
  const override = process.env.GEMINI_MODEL;
  const modelName = override ||
    (profile === 'fast'
      ? (process.env.GEMINI_MODEL_FAST || 'gemini-2.0-flash')
      : profile === 'quality'
      ? (process.env.GEMINI_MODEL_QUALITY || 'gemini-2.5-pro')
      : (process.env.GEMINI_MODEL_BALANCED || 'gemini-1.5-pro'));
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
