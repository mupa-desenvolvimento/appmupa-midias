import React from 'react';

// Função para separar sílabas (simples, não perfeita para todos os casos)
function splitSyllables(text: string): string[] {
  // Regex simples para separar sílabas em português
  // Divide após cada vogal seguida de consoante ou fim de palavra
  return text.match(/[^aeiouáéíóúãõâêîôûàèìòùäëïöü]*[aeiouáéíóúãõâêîôûàèìòùäëïöü]+(?:[^aeiouáéíóúãõâêîôûàèìòùäëïöü]*)/gi) || [text];
}

// Estiliza a descrição: 3 primeiras sílabas em bold, o resto normal/fino
export function stylizeDescriptionSyllables(description: string): React.ReactNode {
  if (!description) return null;
  const syllables = splitSyllables(description);
  const first = syllables.slice(0, 3).join('');
  const rest = syllables.slice(3).join('');
  return (
    <span>
      <span className="font-bold text-gray-900">{first}</span>
      {rest && <span className="font-light text-gray-700">{rest}</span>}
    </span>
  );
}

// Estiliza a descrição: 3 primeiras palavras em bold, o resto normal/fino
export function stylizeDescription(description: string): React.ReactNode {
  if (!description) return null;
  const words = description.split(' ');
  const first = words.slice(0, 3).join(' ');
  const rest = words.slice(3).join(' ');
  return (
    <span>
      <span className="font-bold text-gray-900">{first}</span>
      {rest && <span className="font-light text-gray-700"> {rest}</span>}
    </span>
  );
} 