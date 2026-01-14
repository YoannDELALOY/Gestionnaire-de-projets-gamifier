import React, { useState, useEffect } from 'react';
import { QuestNode } from '../types';
import { X, Save, Clock, Trash2, Calendar, Timer } from 'lucide-react';
import { formatTime } from '../utils/xpSystem';

interface NodeDetailModalProps {
    node: QuestNode;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, updates: Partial<QuestNode>) => void;
    onDelete: (id: string) => void;
}

const NodeDetailModal: React.FC<NodeDetailModalProps> = ({ node, isOpen, onClose, onSave, onDelete }) => {
    const [title, setTitle] = useState(node.title);
    const [summary, setSummary] = useState(node.summary || '');
    const [description, setDescription] = useState(node.description || '');
    const [competenciesStr, setCompetenciesStr] = useState('');
    const [deadline, setDeadline] = useState(node.deadline || '');
    const [estimatedHours, setEstimatedHours] = useState(node.estimatedTimeSeconds ? node.estimatedTimeSeconds / 3600 : 0);

    useEffect(() => {
        if (isOpen) {
            setTitle(node.title);
            setSummary(node.summary || '');
            setDescription(node.description || '');
            setDeadline(node.deadline || '');
            setEstimatedHours(node.estimatedTimeSeconds ? Math.round((node.estimatedTimeSeconds / 3600) * 100) / 100 : 0);
            
            if (node.competencies) {
                setCompetenciesStr(node.competencies.join(', '));
            } else if (node.competency) {
                setCompetenciesStr(node.competency);
            } else {
                setCompetenciesStr('');
            }
        }
    }, [isOpen, node]);

    const handleSave = () => {
        const competencies = competenciesStr
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        onSave(node.id, { 
            title, 
            summary, 
            description, 
            competencies,
            deadline,
            estimatedTimeSeconds: estimatedHours * 3600,
            competency: undefined 
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-void-panel w-full max-w-2xl max-h-[90vh] rounded-lg border border-slate-700 shadow-2xl flex flex-col relative overflow-hidden">
                
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-neon-blue/5 to-transparent animate-scanline opacity-20 z-0"></div>

                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50 z-10">
                    <div className="flex items-center gap-2">
                         <span className="text-xs font-mono text-neon-blue uppercase px-2 py-1 bg-neon-blue/10 rounded border border-neon-blue/20">
                             {node.type}
                         </span>
                         {node.status === 'running' && (
                             <span className="text-xs font-mono text-neon-gold animate-pulse">● LIVE</span>
                         )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                             onClick={() => {
                                 if(confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
                                     onDelete(node.id);
                                     onClose();
                                 }
                             }}
                             className="p-2 hover:bg-red-900/20 text-slate-500 hover:text-red-500 rounded transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 rounded transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar z-10">
                    
                    {/* Title Input */}
                    <div>
                        <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-transparent text-3xl font-display font-bold text-white placeholder-slate-600 focus:outline-none border-b border-transparent focus:border-neon-blue/50 transition-colors pb-2"
                            placeholder="Titre de la quête..."
                        />
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        
                        {/* Row 1: Competencies & Time Spent */}
                        <div className="flex flex-col gap-1">
                            <label className="text-slate-500 font-mono text-xs uppercase">Compétences</label>
                            <input 
                                type="text" 
                                value={competenciesStr}
                                onChange={(e) => setCompetenciesStr(e.target.value)}
                                className="bg-slate-900/50 border border-slate-700 rounded p-2 text-slate-200 focus:border-neon-purple outline-none"
                                placeholder="ex: No-code, Design"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-slate-500 font-mono text-xs uppercase">Temps Passé</label>
                            <div className="flex items-center gap-2 text-neon-gold font-mono p-2 bg-slate-900/30 rounded border border-slate-800">
                                <Clock size={16} />
                                {formatTime(node.totalTimeSeconds)}
                            </div>
                        </div>

                        {/* Row 2: Deadline & Estimation */}
                        <div className="flex flex-col gap-1">
                            <label className="text-slate-500 font-mono text-xs uppercase flex items-center gap-1">
                                <Calendar size={12} /> Deadline
                            </label>
                            <input 
                                type="date" 
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                                className="bg-slate-900/50 border border-slate-700 rounded p-2 text-slate-200 focus:border-neon-blue outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-slate-500 font-mono text-xs uppercase flex items-center gap-1">
                                <Timer size={12} /> Estimation (Heures)
                            </label>
                            <input 
                                type="number" 
                                value={estimatedHours}
                                onChange={(e) => setEstimatedHours(parseFloat(e.target.value))}
                                className="bg-slate-900/50 border border-slate-700 rounded p-2 text-slate-200 focus:border-neon-blue outline-none"
                                placeholder="0"
                                min="0"
                                step="0.5"
                            />
                        </div>

                    </div>

                    {/* Summary */}
                    <div className="space-y-2">
                        <label className="text-slate-500 font-mono text-xs uppercase">Briefing (Résumé)</label>
                        <textarea 
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            rows={2}
                            className="w-full bg-slate-900/30 border border-slate-700 rounded p-3 text-slate-300 focus:border-neon-blue outline-none resize-none"
                            placeholder="Résumé court de la tâche..."
                        />
                    </div>

                    {/* Full Description */}
                    <div className="space-y-2 h-full">
                         <label className="text-slate-500 font-mono text-xs uppercase">Données de Mission (Description)</label>
                         <textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full min-h-[200px] bg-transparent border-l-2 border-slate-800 pl-4 text-slate-300 focus:border-neon-purple outline-none resize-none"
                            placeholder="Détails complets, notes, liens..."
                        />
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end z-10">
                    <button 
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue border border-neon-blue/50 px-6 py-2 rounded transition-all shadow-[0_0_10px_rgba(0,243,255,0.1)] hover:shadow-[0_0_15px_rgba(0,243,255,0.3)]"
                    >
                        <Save size={18} />
                        <span>SAUVEGARDER</span>
                    </button>
                </div>

            </div>
        </div>
    );
};

export default NodeDetailModal;