/**
 * Utilitários para processamento de texto
 * Normalização, limpeza e extração de entidades
 */

/**
 * Normaliza uma descrição de transação
 * Remove caracteres especiais, números isolados, converte em minúsculas
 */
export function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .trim()
    // Remove números no início (códigos de banco)
    .replace(/^\d+\s*[-:]?\s*/g, '')
    // Remove caracteres especiais mantendo apenas letras e números
    .replace(/[^\w\s]/g, ' ')
    // Remove espaços múltiplos
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extrai palavras-chave importantes da descrição
 * Remove stopwords comuns em português
 */
export function extractKeywords(description: string): string[] {
  const stopwords = new Set([
    'o', 'a', 'de', 'da', 'do', 'e', 'é', 'em', 'para', 'por', 'com',
    'um', 'uma', 'ao', 'os', 'as', 'dos', 'das', 'à', 'às', 'esse',
    'esse', 'aquele', 'qual', 'quando', 'muito', 'nos', 'já', 'que',
    'seja', 'sem', 'será', 'entre', 'era', 'após', 'mas', 'está',
  ])

  return description
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopwords.has(word))
    .filter((word, index, arr) => arr.indexOf(word) === index) // Remove duplicatas
}

/**
 * Calcula similaridade entre duas strings (Levenshtein simplificado)
 * Retorna score de 0 a 1, onde 1 é idêntico
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeDescription(str1)
  const norm2 = normalizeDescription(str2)

  if (norm1 === norm2) return 1
  if (norm1.length === 0 || norm2.length === 0) return 0

  // Verifica se uma string contém a outra
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 0.8
  }

  // Verifica sobreposição de palavras-chave
  const keywords1 = new Set(extractKeywords(norm1))
  const keywords2 = new Set(extractKeywords(norm2))

  const intersection = new Set([...keywords1].filter((x) => keywords2.has(x)))
  const union = new Set([...keywords1, ...keywords2])

  if (union.size === 0) return 0
  return intersection.size / union.size
}

/**
 * Detecta tipo de transação pela descrição
 * PIX, TED, Débito, Crédito, Boleto, etc
 */
export function detectTransactionType(description: string): 'pix' | 'ted' | 'doc' | 'boleto' | 'debit' | 'credit' | 'transfer' | null {
  const norm = description.toLowerCase()

  if (norm.includes('pix')) return 'pix'
  if (norm.includes('ted') || norm.includes('transferência eletrônica')) return 'ted'
  if (norm.includes('doc') || norm.includes('documento')) return 'doc'
  if (norm.includes('boleto')) return 'boleto'
  if (norm.includes('débito') || norm.includes('saque')) return 'debit'
  if (norm.includes('crédito') || norm.includes('compra')) return 'credit'
  if (norm.includes('transfer')) return 'transfer'

  return null
}

/**
 * Extrai valor monetário da descrição (se houver)
 */
export function extractAmount(description: string): number | null {
  const match = description.match(/[Rr]\$?\s*([\d.,]+)/);
  if (!match) return null

  const value = match[1].replace('.', '').replace(',', '.')
  const amount = parseFloat(value)
  return isNaN(amount) ? null : amount
}

/**
 * Detecta estabelecimento / merchant da descrição
 */
export function extractMerchant(description: string): string | null {
  const merchants: { [key: string]: string } = {
    // Supermercados
    'carrefour': 'Carrefour',
    'extra': 'Extra',
    'pão de açúcar': 'Pão de Açúcar',
    'prezunic': 'Prezunic',
    'comper': 'Comper',

    // Farmácias
    'drogasil': 'Drogasil',
    'raia': 'Raia',
    'pacheco': 'Pacheco',
    'droga raia': 'Drogaria Raia',

    // Combustível
    'shell': 'Shell',
    'petrobras': 'Petrobras',
    'ipiranga': 'Ipiranga',
    'br': 'BR Distribuidora',

    // Fast Food
    'mcdonalds': "McDonald's",
    'burger king': 'Burger King',
    'subway': 'Subway',
    'pizza hut': 'Pizza Hut',

    // Bancos
    'itaú': 'Itaú',
    'bradesco': 'Bradesco',
    'santander': 'Santander',
    'caixa': 'Caixa Econômica',
  }

  const norm = description.toLowerCase()
  for (const [key, merchant] of Object.entries(merchants)) {
    if (norm.includes(key)) {
      return merchant
    }
  }

  return null
}
