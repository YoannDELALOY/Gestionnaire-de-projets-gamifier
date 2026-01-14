import React, { useMemo } from 'react';
import { UserProfile, QuestNode } from '../types';
import { X, Trophy, Star, Activity, Briefcase, User, Calendar } from 'lucide-react';
import { calculateLevelFromXP, getRankTitle, calculateProgressToNextLevel, getAllCompetenciesStats, getDominantCompetency, getDominantNode, TimeRange, formatTime, CompetencyStat, NodeStat } from '../utils/xpSystem';

interface ProfileDetailModalProps {
    user: UserProfile;
    nodes: QuestNode[];
    isOpen: boolean;
    onClose: () => void;
}

const ProfileDetailModal: React.FC<ProfileDetailModalProps> = ({ user, nodes, isOpen, onClose }) => {
    
    const level = calculateLevelFromXP(user.globalXP);
    const rank = getRankTitle(level);
    const progress = calculateProgressToNextLevel(user.globalXP);
    
    // Memoize heavy calculations
    const allCompetencies = useMemo(() => getAllCompetenciesStats(nodes), [nodes]);
    
    const ranges: { label: string, key: TimeRange }[] = [
        { label: '24H', key: 'day' },
        { label: '7J', key: 'week' },
        { label: '30J', key: 'month' },
        { label: '90J', key: 'quarter' },
        { label: '180J', key: 'semester' },
        { label: '360J', key: 'year' },
    ];

    const analysisData = useMemo(() => {
        return ranges.map(r => ({
            label: r.label,
            competency: getDominantCompetency(nodes, r.key),
            node: getDominantNode(nodes, r.key)
        }));
    }, [nodes]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-void-panel w-full max-w-5xl max-h-[90vh] rounded-lg border border-slate-700 shadow-2xl flex flex-col relative overflow-hidden">
                
                {/* Background Decor */}
                <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 z-0"></div>
                
                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-slate-900/80 z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg bg-slate-800 border border-neon-blue/50 flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.3)]">
                             <User className="text-neon-blue" size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-white font-display tracking-wider uppercase">{user.name}</h2>
                            <div className="flex items-center gap-3 text-sm font-mono">
                                <span className="text-neon-purple">LVL {level}</span>
                                <span className="text-slate-500">|</span>
                                <span className="text-neon-gold">{rank}</span>
                                <span className="text-slate-500">|</span>
                                <span className="text-slate-400">XP Globale: {Math.floor(user.globalXP)}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 rounded transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar z-10">
                    
                    {/* XP Progress Section */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs uppercase font-mono text-slate-500">
                            <span>Progression vers niveau {level + 1}</span>
                            <span>{Math.floor(progress)}%</span>
                        </div>
                        <div className="w-full h-4 bg-slate-900 rounded-full border border-slate-700 overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-neon-blue via-neon-purple to-neon-blue w-[var(--progress)] transition-all duration-1000"
                                style={{ '--progress': `${progress}%` } as React.CSSProperties}
                            ></div>
                        </div>
                    </div>

                    {/* Competency Matrix */}
                    <section>
                         <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                             <Briefcase className="text-neon-purple" size={20} />
                             <span className="uppercase tracking-widest">Matrice de Compétences</span>
                         </h3>
                         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                             {allCompetencies.map((comp, idx) => (
                                 <div key={idx} className="bg-slate-800/50 border border-slate-700 p-3 rounded hover:border-neon-blue/50 transition-colors group">
                                     <div className="text-xs text-slate-400 uppercase font-mono truncate mb-1" title={comp.name}>{comp.name}</div>
                                     <div className="flex justify-between items-end">
                                         <span className="text-2xl font-bold text-white group-hover:text-neon-blue">{comp.level}</span>
                                         <span className="text-[10px] text-slate-500 font-mono">{comp.totalXP} XP</span>
                                     </div>
                                 </div>
                             ))}
                             {allCompetencies.length === 0 && (
                                 <div className="col-span-full text-center py-4 text-slate-500 italic">Aucune donnée de compétence...</div>
                             )}
                         </div>
                    </section>

                    {/* Temporal Analysis Grid */}
                    <section>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                             <Activity className="text-neon-gold" size={20} />
                             <span className="uppercase tracking-widest">Analyse Temporelle</span>
                        </h3>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-700 text-left">
                                        <th className="p-3 text-slate-500 font-mono text-xs uppercase w-24">Période</th>
                                        <th className="p-3 text-slate-500 font-mono text-xs uppercase">Compétence Dominante</th>
                                        <th className="p-3 text-slate-500 font-mono text-xs uppercase">Focus Dominant (Projet/Tâche)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analysisData.map((row, idx) => (
                                        <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/30">
                                            <td className="p-3 font-mono text-neon-blue font-bold">{row.label}</td>
                                            <td className="p-3">
                                                {row.competency ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-white font-bold">{row.competency.name}</span>
                                                        <span className="text-xs text-neon-gold font-mono">
                                                            +{row.competency.periodXP} XP (Lvl {row.competency.level})
                                                        </span>
                                                    </div>
                                                ) : <span className="text-slate-600">-</span>}
                                            </td>
                                            <td className="p-3">
                                                {row.node ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-white font-bold truncate max-w-[200px]">{row.node.title}</span>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="text-slate-400 font-mono uppercase bg-slate-800 px-1 rounded">{row.node.type}</span>
                                                            <span className="text-slate-400 font-mono">{formatTime(row.node.periodTime)}</span>
                                                        </div>
                                                    </div>
                                                ) : <span className="text-slate-600">-</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default ProfileDetailModal;