/**
 * Padrões de categorização por contexto brasileiro
 * Palavras-chave e padrões para cada categoria
 */

export const categoryPatterns: Record<string, { keywords: string[]; merchants: string[] }> = {
  alimentacao: {
    keywords: [
      'restaurante', 'pizza', 'hamburgueria', 'lanchonete', 'café', 'bar',
      'açaí', 'sorveteria', 'confeitaria', 'padaria', 'supermercado',
      'mercado', 'feira', 'compras', 'alimentos', 'bebidas',
    ],
    merchants: [
      'McDonald\'s', 'Burger King', 'Subway', 'Pizza Hut', 'Domino\'s',
      'Carrefour', 'Extra', 'Pão de Açúcar', 'Comper', 'Prezunic',
    ],
  },
  transporte: {
    keywords: [
      'uber', 'taxi', 'táxi', 'ônibus', 'metro', 'trem', 'passagem',
      'combustível', 'gasolina', 'diesel', 'carro', 'moto', 'bicicleta',
      'estacionamento', 'pedágio', 'manutenção', 'combustível',
    ],
    merchants: ['Uber', 'Shell', 'Petrobras', 'Ipiranga', 'BR'],
  },
  saude: {
    keywords: [
      'farmácia', 'medicamento', 'remédio', 'médico', 'dentista',
      'hospital', 'clínica', 'psicólogo', 'nutricionista', 'consultório',
      'vacina', 'exame', 'cirurgia', 'consulta', 'saúde',
    ],
    merchants: ['Drogasil', 'Raia', 'Pacheco', 'Drogaria Raia'],
  },
  utilidades: {
    keywords: [
      'água', 'luz', 'gás', 'telefone', 'internet', 'conta', 'fatura',
      'energisa', 'copasa', 'saneago', 'nubank', 'itaú', 'bradesco',
    ],
    merchants: [],
  },
  educacao: {
    keywords: [
      'escola', 'universidade', 'cursos', 'aula', 'estudo', 'livros',
      'biblioteca', 'professor', 'educação', 'formação', 'treinamento',
    ],
    merchants: [],
  },
  diversao: {
    keywords: [
      'cinema', 'teatro', 'show', 'concert', 'jogo', 'game', 'streaming',
      'spotify', 'netflix', 'disney', 'viagem', 'hotel', 'turismo',
      'diversão', 'lazer',
    ],
    merchants: ['Netflix', 'Spotify', 'Disney+', 'YouTube'],
  },
  compras: {
    keywords: [
      'amazon', 'mercado livre', 'ebay', 'aliexpress', 'asos',
      'shein', 'loja', 'loja física', 'online', 'compra',
      'eletrônicos', 'roupas', 'sapatos', 'moveis',
    ],
    merchants: ['Amazon', 'Mercado Livre', 'AliExpress'],
  },
  moda: {
    keywords: [
      'loja', 'roupa', 'sapato', 'vestuário', 'moda', 'calcado',
      'bolsa', 'acessório', 'tênis', 'bota', 'blusa',
      'calça', 'jaqueta', 'vestido', 'terno',
    ],
    merchants: ['Renner', 'C&C', 'Zara', 'H&M'],
  },
  higiene: {
    keywords: [
      'xampu', 'sabonete', 'desodorante', 'pasta de dente', 'escova',
      'higiene', 'cosmético', 'beleza', 'cuidado', 'pessoal',
    ],
    merchants: ['Drogasil', 'Raia', 'Pacheco'],
  },
  trabalho: {
    keywords: [
      'fornecedor', 'cliente', 'empresa', 'negócio', 'vendedor',
      'comissão', 'honorário', 'consultoria', 'serviço',
    ],
    merchants: [],
  },
}

/**
 * Common Brazilian merchants by category
 */
export const commonMerchants: Record<string, string> = {
  // Supermercados
  'carrefour': 'alimentacao',
  'extra': 'alimentacao',
  'pão de açúcar': 'alimentacao',
  'comper': 'alimentacao',
  'prezunic': 'alimentacao',

  // Farmácias
  'drogasil': 'saude',
  'raia': 'saude',
  'pacheco': 'saude',

  // Combustível
  'shell': 'transporte',
  'petrobras': 'transporte',
  'ipiranga': 'transporte',
  'br': 'transporte',

  // Fast Food
  'mcdonalds': 'alimentacao',
  'burger king': 'alimentacao',
  'subway': 'alimentacao',

  // Streaming
  'netflix': 'diversao',
  'spotify': 'diversao',
  'youtube': 'diversao',

  // E-commerce
  'amazon': 'compras',
  'mercado livre': 'compras',
  'aliexpress': 'compras',
}

/**
 * Descrição de categorias em português
 */
export const categoryLabels: Record<string, string> = {
  alimentacao: '🍔 Alimentação',
  transporte: '🚗 Transporte',
  saude: '⚕️ Saúde',
  utilidades: '💡 Utilidades',
  educacao: '📚 Educação',
  diversao: '🎬 Diversão',
  compras: '🛍️ Compras',
  moda: '👗 Moda',
  higiene: '🧴 Higiene',
  trabalho: '💼 Trabalho',
}

/**
 * Detecta categoria por padrões
 */
export function detectCategoryByPattern(description: string): { category: string; confidence: number } | null {
  const norm = description.toLowerCase()
  let bestMatch = { category: '', confidence: 0 }

  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    // Verifica keywords
    for (const keyword of patterns.keywords) {
      if (norm.includes(keyword)) {
        const confidence = Math.min(100, bestMatch.confidence + 25)
        if (confidence > bestMatch.confidence) {
          bestMatch = { category, confidence }
        }
      }
    }

    // Verifica merchants
    for (const merchant of patterns.merchants) {
      if (norm.includes(merchant.toLowerCase())) {
        bestMatch = { category, confidence: 95 }
      }
    }
  }

  return bestMatch.confidence > 0 ? bestMatch : null
}
