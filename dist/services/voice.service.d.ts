export declare class VoiceService {
    private openai;
    private downloadsDir;
    constructor();
    processVoiceMessage(ctx: any): Promise<{
        text: string;
        analysis?: any;
    }>;
    processVoiceStandup(ctx: any): Promise<{
        yesterday: string;
        today: string;
        blockers: string;
        mood: number;
    }>;
}
//# sourceMappingURL=voice.service.d.ts.map