/**
 * Экранирует спецсимволы MarkdownV2/Telegram Markdown.
 * Нужно для безопасной вставки пользовательских имен, ников и названий.
 */
export function escapeMarkdown(text: string): string {
  if (!text) return '';
  // Экранируем символы, которые используются в Markdown: _ * [ ] ( ) ~ ` > # + - = | { } . !
  return text.replace(/([_\*\[\]\(\)~`>\#\+\-=\|\{\}\.!])/g, '\\$1');
}
