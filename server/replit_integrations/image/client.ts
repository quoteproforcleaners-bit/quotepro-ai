// OpenAI SDK removed — image generation integration is disabled.
// These exports are stubbed to maintain the module shape without the dependency.
import fs from "node:fs";
import { Buffer } from "node:buffer";

export const openai: any = null; // OpenAI removed

/**
 * @deprecated OpenAI removed. This function is disabled.
 */
export async function generateImageBuffer(
  _prompt: string,
  _size: "1024x1024" | "512x512" | "256x256" = "1024x1024"
): Promise<Buffer> {
  throw new Error("Image generation is not available: OpenAI SDK removed.");
}

/**
 * @deprecated OpenAI removed. This function is disabled.
 */
export async function editImages(
  _imageFiles: string[],
  _prompt: string,
  _outputPath?: string
): Promise<Buffer> {
  throw new Error("Image editing is not available: OpenAI SDK removed.");
}
