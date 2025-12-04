import { GoogleGenAI, Modality, Part } from "@google/genai";

const fileToGenerativePart = async (file: File): Promise<Part> => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};

/**
 * Generates a textual description of an image's style using Gemini.
 * @param styleImage The image file to analyze.
 * @returns A promise that resolves to a string describing the image's style.
 */
export const describeImageStyle = async (styleImage: File): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const styleImagePart = await fileToGenerativePart(styleImage);
    const textPart: Part = { text: "Describe this image's visual style in detail. Focus on the lighting, color palette, mood, composition, texture, and overall aesthetic. Be descriptive and evocative. This description will be used as a prompt for an AI to generate a new product photograph in the same style." };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [styleImagePart, textPart] },
    });

    return response.text;
}

/**
 * Generates a new image by applying a textual style prompt to a product image.
 * @param productImage The original product image file.
 * @param prompt The detailed text prompt describing the desired style.
 * @returns A promise that resolves to a base64-encoded string of the generated image.
 */
export const generateStyledImage = async (
  productImage: File,
  prompt: string,
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const textPart: Part = { text: prompt };
  const productImagePart = await fileToGenerativePart(productImage);
  
  const parts: Part[] = [productImagePart, textPart];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: { parts: parts },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });
  
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const base64ImageBytes: string = part.inlineData.data;
      return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
    }
  }

  throw new Error("No image was generated. The model may have refused the request.");
};

/**
 * Generates a detailed style prompt from a short phrase or keywords.
 * @param keywords The user-provided keywords or short phrase.
 * @returns A promise that resolves to a detailed style prompt string.
 */
export const generatePromptFromKeywords = async (keywords: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const instruction = `Based on the following keywords, generate a detailed and evocative visual style description for an AI image generator. The description should be a single paragraph and focus on elements like lighting, color palette, mood, composition, texture, and overall aesthetic. Do not add any preamble like "Here is a description...". Just provide the description itself. Keywords: "${keywords}"`;
    
    const textPart: Part = { text: instruction };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart] },
    });

    return response.text;
}