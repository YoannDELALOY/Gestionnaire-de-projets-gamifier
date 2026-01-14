export type NodeType = 'category' | 'project' | 'task' | 'subtask';
export type NodeStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface QuestNode {
  id: string;
  title: string;
  type: NodeType;
  status: NodeStatus;
  totalTimeSeconds: number; // Time actually spent
  children?: QuestNode[];
  expanded?: boolean;
  competencies?: string[]; 
  description?: string; 
  summary?: string; 
  history?: Record<string, number>;
  
  // New Fields
  deadline?: string; // ISO Date YYYY-MM-DD
  estimatedTimeSeconds?: number; // Estimated duration in seconds
  
  // Deprecated field for migration purposes
  competency?: string; 
}

export interface UserProfile {
  name: string;
  location: string;
  birthDate: string;
  globalXP: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  sender: 'SYSTEM' | 'CORE' | 'USER';
  message: string;
}

// AI Tool Response Types
export interface AICommand {
  action: 'CREATE_NODE' | 'DELETE_NODE' | 'UPDATE_NODE';
  data: any;
}

// XP System Constants
export const XP_PER_MINUTE = 1;