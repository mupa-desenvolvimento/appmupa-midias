import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Extrai a marca do produto do nome/descrição (heurística simples)
export function extractBrand(text: string): string | null {
  if (!text) return null;
  // Exemplo: pega a primeira palavra em maiúsculo ou até o primeiro espaço
  const match = text.match(/^[A-Z0-9\-]+/);
  if (match) return match[0];
  // Alternativamente, pega a primeira palavra
  const firstWord = text.split(' ')[0];
  return firstWord || null;
}
