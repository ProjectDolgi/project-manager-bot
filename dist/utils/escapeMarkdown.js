"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeMarkdown = escapeMarkdown;
/**
 * Экранирует спецсимволы MarkdownV2/Telegram Markdown.
 * Нужно для безопасной вставки пользовательских имен, ников и названий.
 */
function escapeMarkdown(text) {
    if (!text)
        return '';
    // Экранируем символы, которые используются в Markdown: _ * [ ] ( ) ~ ` > # + - = | { } . !
    return text.replace(/([_\*\[\]\(\)~`>\#\+\-=\|\{\}\.!])/g, '\\$1');
}
//# sourceMappingURL=escapeMarkdown.js.map