import { Telegraf } from 'telegraf';
import { BotContext } from '../index';
import { DatabaseService } from '../services/database.service';
import { AIService } from '../services/ai.service';
import { ProjectService } from '../services/project.service';
import { VoiceService } from '../services/voice.service';
export interface Services {
    dbService: DatabaseService;
    aiService: AIService;
    projectService: ProjectService;
    voiceService: VoiceService;
}
export declare function setupCommands(bot: Telegraf<BotContext>, services: Services): void;
//# sourceMappingURL=index.d.ts.map