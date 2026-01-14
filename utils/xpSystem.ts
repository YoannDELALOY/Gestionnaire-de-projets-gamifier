import { QuestNode } from '../types';

/**
 * Formule : XP Totale(L) = 60 * L²
 * Inverse : L = sqrt(XP / 60)
 */

export const calculateLevelFromXP = (xp: number): number => {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 60));
};

export const calculateXPForNextLevel = (currentLevel: number): number => {
  const nextLevel = currentLevel + 1;
  // Total XP required for next level
  return 60 * (nextLevel * nextLevel);
};

export const calculateProgressToNextLevel = (xp: number): number => {
  const currentLevel = calculateLevelFromXP(xp);
  const currentLevelXP = 60 * (currentLevel * currentLevel);
  const nextLevelXP = calculateXPForNextLevel(currentLevel);
  
  const xpInCurrentLevel = xp - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  
  if (xpNeededForLevel === 0) return 100;
  
  return (xpInCurrentLevel / xpNeededForLevel) * 100;
};

export const getRankTitle = (level: number): string => {
  if (level <= 20) return "Néophyte";
  if (level <= 50) return "Compagnon";
  if (level <= 80) return "Expert";
  if (level <= 100) return "Maître";
  return "Légende";
};

export const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// --- Statistics Helpers ---

export interface GlobalStats {
    proTime: number;
    persoTime: number;
    proXP: number;
    persoXP: number;
}

export interface CompetencyStat {
    name: string;
    totalXP: number; // For Level
    level: number;
    periodXP: number; // XP gained in the specific period
    periodTime: number; // Added: Raw seconds for period
}

export interface NodeStat {
    id: string;
    title: string;
    type: string;
    periodTime: number;
}

export type TimeRange = 'day' | 'week' | 'month' | 'quarter' | 'semester' | 'year';

export const calculateGlobalStats = (nodes: QuestNode[]): GlobalStats => {
    let proTime = 0;
    let persoTime = 0;

    // Explicit check on root nodes provided to the function
    nodes.forEach(node => {
        if (node.id === 'cat-1' || node.id === 'cat-2') proTime += node.totalTimeSeconds;
        if (node.id === 'cat-3') persoTime += node.totalTimeSeconds;
    });

    return { 
        proTime, 
        persoTime,
        proXP: Math.floor(proTime / 60),
        persoXP: Math.floor(persoTime / 60)
    };
};

const isDateInRange = (dateStr: string, range: TimeRange): boolean => {
    const today = new Date();
    const d = new Date(dateStr);
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime(); // Midnight today
    const check = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); // Midnight checked date

    if (range === 'day') {
        return t === check;
    }
    
    let daysToSubtract = 0;
    switch (range) {
        case 'week': daysToSubtract = 7; break;
        case 'month': daysToSubtract = 30; break;
        case 'quarter': daysToSubtract = 90; break;
        case 'semester': daysToSubtract = 180; break;
        case 'year': daysToSubtract = 360; break;
    }
    
    const pastLimit = t - (daysToSubtract * 24 * 60 * 60 * 1000);
    return check >= pastLimit && check <= t;
};

export const getDominantCompetency = (nodes: QuestNode[], range: TimeRange): CompetencyStat | null => {
    const competencyMap: Record<string, { totalTime: number, periodTime: number }> = {};

    const traverse = (node: QuestNode) => {
        let comps: string[] = [];
        if (node.competencies && Array.isArray(node.competencies)) {
            comps = [...node.competencies];
        } else if (node.competency) {
            comps = [node.competency];
        }

        comps.forEach(comp => {
            const cleanComp = comp.trim();
            if (!cleanComp) return;

            if (!competencyMap[cleanComp]) {
                competencyMap[cleanComp] = { totalTime: 0, periodTime: 0 };
            }

            competencyMap[cleanComp].totalTime += node.totalTimeSeconds;

            if (node.history) {
                Object.entries(node.history).forEach(([dateStr, seconds]) => {
                    if (isDateInRange(dateStr, range)) {
                        competencyMap[cleanComp].periodTime += seconds;
                    }
                });
            }
        });

        if (node.children) node.children.forEach(traverse);
    };

    nodes.forEach(traverse);

    let maxStat: CompetencyStat | null = null;
    let maxPeriodTime = -1;

    Object.entries(competencyMap).forEach(([name, data]) => {
        if (data.periodTime > maxPeriodTime) {
            maxPeriodTime = data.periodTime;
            const totalXP = Math.floor(data.totalTime / 60);
            maxStat = {
                name,
                totalXP,
                level: calculateLevelFromXP(totalXP),
                periodXP: Math.floor(data.periodTime / 60),
                periodTime: data.periodTime
            };
        }
    });

    if (maxPeriodTime <= 0) return null;
    return maxStat;
};

export const getDominantNode = (nodes: QuestNode[], range: TimeRange): NodeStat | null => {
    let maxNode: NodeStat | null = null;
    let maxTime = -1;

    const traverse = (node: QuestNode) => {
        // Skip categories for "Dominant Task/Project"
        if (node.type !== 'category') {
            let periodTime = 0;
            if (node.history) {
                Object.entries(node.history).forEach(([dateStr, seconds]) => {
                    if (isDateInRange(dateStr, range)) {
                        periodTime += seconds;
                    }
                });
            }

            if (periodTime > maxTime) {
                maxTime = periodTime;
                maxNode = {
                    id: node.id,
                    title: node.title,
                    type: node.type,
                    periodTime
                };
            }
        }
        if (node.children) node.children.forEach(traverse);
    };

    nodes.forEach(traverse);

    if (maxTime <= 0) return null;
    return maxNode;
};

export const getAllCompetenciesStats = (nodes: QuestNode[]): CompetencyStat[] => {
    const competencyMap: Record<string, number> = {}; 

    const traverse = (node: QuestNode) => {
        let comps: string[] = [];
        if (node.competencies) comps = [...node.competencies];
        else if (node.competency) comps = [node.competency];

        comps.forEach(comp => {
            const clean = comp.trim();
            if(!clean) return;
            competencyMap[clean] = (competencyMap[clean] || 0) + node.totalTimeSeconds;
        });

        if (node.children) node.children.forEach(traverse);
    };

    nodes.forEach(traverse);

    return Object.entries(competencyMap)
        .map(([name, seconds]) => {
            const totalXP = Math.floor(seconds / 60);
            return {
                name,
                totalXP,
                level: calculateLevelFromXP(totalXP),
                periodXP: 0,
                periodTime: seconds
            };
        })
        .sort((a, b) => b.totalXP - a.totalXP);
};

export const migrateNodes = (nodes: QuestNode[]): QuestNode[] => {
    return nodes.map(node => {
        const newNode = { ...node };
        if (newNode.competency && (!newNode.competencies || newNode.competencies.length === 0)) {
            newNode.competencies = [newNode.competency];
            delete newNode.competency;
        }
        if (newNode.children) {
            newNode.children = migrateNodes(newNode.children);
        }
        return newNode;
    });
};

// --- New Progress Calculations ---

export interface NodeProgress {
    estimate: number;
    spent: number;
    percent: number;
}

export const calculateNodeProgress = (node: QuestNode): NodeProgress => {
    // If it has children, calculate recursive stats
    if (node.children && node.children.length > 0) {
        let totalEstimate = 0;
        let totalSpent = 0;
        
        // Helper to dive deep
        const sumChildren = (n: QuestNode) => {
            const p = calculateNodeProgress(n);
            // We sum the TOP LEVEL return of the children
            // Actually, we need to sum the leaves or just direct children logic?
            // "The time of projects is the total estimated time of tasks"
            // Recursive approach:
        }

        // Simpler recursive approach:
        // 1. If it's a leaf (task/subtask with no children), use its own fields.
        // 2. If it has children, sum children's effective estimate and effective spent.
        
        let childrenEstimate = 0;
        let childrenSpent = 0;
        
        node.children.forEach(child => {
            const childStats = calculateNodeProgress(child);
            childrenEstimate += childStats.estimate;
            childrenSpent += childStats.spent; // Recursive spent ensures we capture all sub-time
        });
        
        // If the node itself has spent time recorded directly (rare if it's a folder, but possible), add it?
        // Usually Category/Project time is just sum of children. Let's assume strict sum.
        // Note: Our data model stores `totalTimeSeconds` on the node itself as it runs.
        // If I run a Project, does it increment Project time OR child time?
        // In `App.tsx`, we increment time for the whole path. So `node.totalTimeSeconds` IS the correct total spent for that node including its children activity context.
        // However, for ESTIMATES, we must sum children if specific estimates aren't on the parent.
        
        const effectiveEstimate = childrenEstimate > 0 ? childrenEstimate : (node.estimatedTimeSeconds || 0);
        // Use the node's tracked time which includes children accumulation from Tick logic
        const effectiveSpent = node.totalTimeSeconds; 
        
        return {
            estimate: effectiveEstimate,
            spent: effectiveSpent,
            percent: effectiveEstimate > 0 ? Math.min(100, Math.round((effectiveSpent / effectiveEstimate) * 100)) : 0
        };
    } else {
        // Leaf node
        const est = node.estimatedTimeSeconds || 0;
        const spent = node.totalTimeSeconds;
        return {
            estimate: est,
            spent: spent,
            percent: est > 0 ? Math.min(100, Math.round((spent / est) * 100)) : 0
        };
    }
};
