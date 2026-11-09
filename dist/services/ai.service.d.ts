export interface AIAnalysis {
    summary: string;
    recommendations: string[];
    risks: string[];
    mood: 'positive' | 'neutral' | 'negative';
}
export declare class AIService {
    private openai;
    constructor();
    private createBotContext;
    private getRoleEmoji;
    processQuestionWithContext(question: string, projectService?: any): Promise<string>;
    analyzeTeamStatus(dailyStatuses: any[], projectService?: any): Promise<AIAnalysis>;
    processVoiceCommand(text: string): Promise<string>;
    generateSummary(data: any, projectService?: any): Promise<string>;
    private buildAnalysisPrompt;
    private parseAIResponse;
}
//# sourceMappingURL=ai.service.d.ts.map