"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCommands = setupCommands;
const basic_commands_1 = require("./basic.commands");
const project_commands_1 = require("./project.commands");
const standup_commands_1 = require("./standup.commands");
const ai_commands_1 = require("./ai.commands");
const admin_commands_1 = require("./admin.commands");
const subscription_commands_1 = require("./subscription.commands");
function setupCommands(bot, services) {
    // Базовые команды
    (0, basic_commands_1.setupBasicCommands)(bot, services);
    // Команды для работы с проектами
    (0, project_commands_1.setupProjectCommands)(bot, services);
    // Команды для standup
    (0, standup_commands_1.setupStandupCommands)(bot, services);
    // AI команды
    (0, ai_commands_1.setupAICommands)(bot, services);
    // Admin команды
    (0, admin_commands_1.setupAdminCommands)(bot, services);
    // Команды подписки и оплаты
    (0, subscription_commands_1.setupSubscriptionCommands)(bot, services);
}
//# sourceMappingURL=index.js.map