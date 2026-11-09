import { DatabaseService, User, Project, Sprint, Task, DailyStatus } from './database.service';
export declare class ProjectService {
    private dbService;
    constructor(dbService: DatabaseService);
    createProject(name: string, description: string): Promise<Project>;
    getActiveProjects(): Promise<Project[]>;
    registerUser(telegramId: string, name: string, username?: string, role?: string): Promise<User>;
    getUserByTelegramId(telegramId: string): Promise<User | null>;
    getAllUsers(): Promise<User[]>;
    updateUserRole(telegramId: string, newRole: string): Promise<User | null>;
    saveDailyStatus(userId: number, yesterday: string, today: string, blockers: string, moodScore?: number): Promise<DailyStatus>;
    getTodayStatuses(): Promise<DailyStatus[]>;
    getStatusesByDate(date: string): Promise<any[]>;
    getTeamSummary(): Promise<any>;
    formatDailyStatusMessage(statuses: DailyStatus[]): string;
    private getMoodEmoji;
    formatTeamSummary(summary: any): string;
    createSprint(name: string): Promise<Sprint>;
    getAllSprints(): Promise<Sprint[]>;
    getCurrentSprint(): Promise<Sprint | null>;
    getSprintTasks(sprintId: number): Promise<Task[]>;
    addSprintTask(sprintId: number, title: string, zone: string): Promise<Task>;
    updateSprintGoal(sprintId: number, goal: string, hypothesis: string, targetAudience: string): Promise<Sprint | null>;
    updateTaskStatus(taskId: number, status: 'pending' | 'in_progress' | 'completed'): Promise<Task | null>;
    getSprintProgress(sprintId: number): Promise<any>;
}
//# sourceMappingURL=project.service.d.ts.map