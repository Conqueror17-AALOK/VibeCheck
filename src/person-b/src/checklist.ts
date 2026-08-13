import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

export interface GenerateChecklistOptions {
  prompt: string;
  image?: {
    inlineData: {
      data: string; // Base64 string
      mimeType: string;
    };
  };
  apiKey?: string;
  modelName?: string;
}

export interface VibeCheckElement {
  id: string;
  type: string;
  text?: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  relative_position?: {
    below?: string;
    above?: string;
    left_of?: string;
    right_of?: string;
    alignment?: 'centered' | 'left-aligned' | 'right-aligned' | 'justified';
  };
  style?: {
    color?: string;
    background_color?: string;
    font_size?: number;
    font_weight?: string;
    border_radius?: number;
    padding?: string;
    opacity?: number;
  };
  required?: boolean;
  visibility?: 'visible' | 'hidden' | 'off-screen';
}

export interface VibeCheckData {
  elements: VibeCheckElement[];
  layout?: {
    container_alignment?: 'centered' | 'left-aligned' | 'right-aligned' | 'full-width';
    total_elements_expected?: number;
    viewport_width?: number;
    viewport_height?: number;
  };
  metadata?: {
    source?: 'extracted' | 'generated' | 'manual';
    timestamp?: string;
    url?: string;
  };
}

// JSON Schema definition for Gemini structured outputs
const vibeCheckResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    elements: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          type: { type: SchemaType.STRING },
          text: { type: SchemaType.STRING },
          position: {
            type: SchemaType.OBJECT,
            properties: {
              x: { type: SchemaType.NUMBER },
              y: { type: SchemaType.NUMBER },
              width: { type: SchemaType.NUMBER },
              height: { type: SchemaType.NUMBER }
            },
            required: ['x', 'y', 'width', 'height']
          },
          style: {
            type: SchemaType.OBJECT,
            properties: {
              color: { type: SchemaType.STRING },
              background_color: { type: SchemaType.STRING },
              font_size: { type: SchemaType.NUMBER },
              font_weight: { type: SchemaType.STRING },
              border_radius: { type: SchemaType.NUMBER },
              opacity: { type: SchemaType.NUMBER }
            }
          },
          required: { type: SchemaType.BOOLEAN },
          visibility: { type: SchemaType.STRING }
        },
        required: ['id', 'type', 'position']
      }
    },
    layout: {
      type: SchemaType.OBJECT,
      properties: {
        container_alignment: { type: SchemaType.STRING },
        total_elements_expected: { type: SchemaType.NUMBER },
        viewport_width: { type: SchemaType.NUMBER },
        viewport_height: { type: SchemaType.NUMBER }
      }
    }
  },
  required: ['elements']
};

const SYSTEM_INSTRUCTION = `You are VibeCheck AI, an expert frontend UX/UI layout analyzer.
Given a design prompt or wireframe image, break it down into a structured list of expected UI elements according to the VibeCheck JSON Schema contract.
Assign stable IDs (e.g., 'submit_button', 'email_input', 'hero_heading'), exact or estimated bounding positions (viewport 1280x720 default), and visual styles (hex colors, font sizes, border radiuses).
Always mark core functional components as required: true.`;

/**
 * Generate a VibeCheck element checklist using Google Gemini API
 */
export async function generateChecklist(options: GenerateChecklistOptions): Promise<VibeCheckData> {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable or apiKey option is required.');
  }

  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({
    model: options.modelName || 'gemini-1.5-flash',
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: vibeCheckResponseSchema
    }
  });

  const promptParts: any[] = [
    `Analyze this UI design / requirement and generate the expected element checklist:\n\n${options.prompt}`
  ];

  if (options.image) {
    promptParts.push(options.image);
  }

  const response = await model.generateContent(promptParts);
  const text = response.response.text();

  let parsed: VibeCheckData;
  try {
    parsed = JSON.parse(text);
  } catch (err: any) {
    throw new Error(`Failed to parse Gemini response as JSON: ${err.message}`);
  }

  parsed.metadata = {
    source: 'generated',
    timestamp: new Date().toISOString(),
    url: options.prompt.substring(0, 100)
  };

  return parsed;
}
