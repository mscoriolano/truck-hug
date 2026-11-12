export function xmlValue(xml: string, tag: string): string | null {
  const value = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i').exec(xml)?.[1]?.trim();
  if (!value) return null;
  return value.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1')
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

export function parseDescriptions(xml: string): Map<string, string> {
  const descriptions = new Map<string, string>();
  for (const match of xml.matchAll(/<DescricaoAlertas(?:\s[^>]*)?>([\s\S]*?)<\/DescricaoAlertas>/gi)) {
    const id = xmlValue(match[1], 'tdeID'), name = xmlValue(match[1], 'Descricao');
    if (id && name) descriptions.set(id, name);
  }
  return descriptions;
}