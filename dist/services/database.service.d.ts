export interface User {
    id: number;
    telegram_id: string;
    name: string;
    username?: string;
    role: string;
    timezone: string;
    preferences: string;
    created_at: string;
}
export interface Project {
    id: number;
    name: string;
    description: string;
    status: string;
    created_at: string;
}
export interface Sprint {
    id: number;
    project_id: number;
    name: string;
    goal?: string;
    hypothesis?: string;
    target_audience?: string;
    start_date: string;
    end_date: string;
    status: string;
}
export interface Task {
    id: number;
    sprint_id: number;
    assignee_id: number;
    title: string;
    description: string;
    zone: string;
    status: string;
    priority: string;
    estimated_hours: number;
}
export interface DailyStatus {
    id: number;
    user_id: number;
    date: string;
    yesterday: string;
    today: string;
    blockers: string;
    mood_score: number;
}
export declare class DatabaseService {
    private db;
    private dbPath;
    constructor();
    connect(): Promise<void>;
    private initializeTables;
    private runMigrations;
    createUser(telegramId: string, name: string, username?: string, role?: string): Promise<User>;
    getUserByTelegramId(telegramId: string): Promise<User | null>;
    getAllUsers(): Promise<User[]>;
    updateUserRole(telegramId: string, newRole: string): Promise<User | null>;
    createProject(name: string, description: string): Promise<Project>;
    getActiveProjects(): Promise<Project[]>;
    saveDailyStatus(userId: number, yesterday: string, today: string, blockers: string, moodScore?: number): Promise<DailyStatus>;
    getDailyStatusByDate(date: string): Promise<any[]>;
    close(): Promise<void>;
    createSprint(name: string, startDate: Date, endDate: Date): Promise<Sprint>;
    getAllSprints(): Promise<Sprint[]>;
    getCurrentSprint(): Promise<Sprint | null>;
    updateSprintGoal(sprintId: number, goal: string, hypothesis: string, targetAudience: string): Promise<Sprint | null>;
    addSprintTask(sprintId: number, title: string, zone: string): Promise<Task>;
    getSprintTasks(sprintId: number): Promise<Task[]>;
    updateTaskStatus(taskId: number, status: 'pending' | 'in_progress' | 'completed'): Promise<Task | null>;
}
//# sourceMappingURL=database.service.d.ts.map