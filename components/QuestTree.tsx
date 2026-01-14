import React from 'react';
import { QuestNode, NodeType } from '../types';
import { ChevronDown, ChevronRight, Play, Pause, CheckSquare, Square, Folder, FileText, Activity, Plus, MoreHorizontal, Pencil, AlertCircle } from 'lucide-react';
import { formatTime, calculateNodeProgress } from '../utils/xpSystem';

interface QuestTreeProps {
  nodes: QuestNode[];
  onToggleExpand: (id: string) => void;
  onStatusChange: (id: string, status: 'running' | 'paused' | 'completed') => void;
  onOpenDetail: (node: QuestNode) => void;
  onAddChild: (parentId: string, type: NodeType) => void;
  runningIds: string[];
  depth?: number;
}

const QuestTree: React.FC<QuestTreeProps> = ({ nodes, onToggleExpand, onStatusChange, onOpenDetail, onAddChild, runningIds, depth = 0 }) => {
  
  const getNextType = (currentType: NodeType): NodeType => {
      if (currentType === 'category') return 'project';
      if (currentType === 'project') return 'task';
      return 'subtask';
  };

  const getProgressColor = (percent: number) => {
      if (percent >= 100) return 'bg-green-500';
      if (percent > 60) return 'bg-neon-blue';
      if (percent > 30) return 'bg-neon-gold';
      return 'bg-slate-600';
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {nodes.map((node) => {
        const isRunning = runningIds.includes(node.id) || (node.status === 'running' && runningIds.length === 0);
        
        const hasRunningChild = (n: QuestNode): boolean => {
             if (runningIds.includes(n.id)) return true;
             return n.children ? n.children.some(hasRunningChild) : false;
        }
        const isActiveContext = hasRunningChild(node);
        
        const displayCompetencies = node.competencies || (node.competency ? [node.competency] : []);
        const progressStats = calculateNodeProgress(node);
        const hasProgress = progressStats.estimate > 0;

        // Deadline Warning
        const today = new Date().toISOString().split('T')[0];
        const isLate = node.deadline && node.deadline < today && node.status !== 'completed';
        const isToday = node.deadline === today && node.status !== 'completed';

        return (
          <div key={node.id} className="w-full group">
            <div 
              className={`
                flex flex-col p-2 rounded-md transition-all duration-300 border border-transparent relative
                ${isActiveContext ? 'border-neon-blue/30 bg-neon-blue/5' : 'hover:bg-slate-800/50'}
                ${node.status === 'completed' ? 'opacity-50 grayscale' : ''}
              `}
              style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
            >
              {/* Main Row */}
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Expand Toggle */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id); }}
                      className={`text-slate-400 hover:text-neon-blue transition-colors ${!node.children?.length ? 'opacity-20' : ''}`}
                    >
                      {node.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    {/* Icon */}
                    <span className={`${isActiveContext ? 'text-neon-blue animate-pulse' : 'text-slate-500'}`}>
                        {node.type === 'category' && <Folder size={18} />}
                        {node.type === 'project' && <Activity size={18} />}
                        {node.type === 'task' && <FileText size={18} />}
                        {node.type === 'subtask' && <div className="w-2 h-2 rounded-full bg-slate-600" />}
                    </span>

                    {/* Title & Metadata */}
                    <div 
                        className="flex flex-col min-w-0 cursor-pointer hover:text-neon-blue transition-colors flex-1"
                        onClick={() => onOpenDetail(node)}
                    >
                        <div className="flex items-center gap-2">
                            <span className={`truncate font-display tracking-wide ${isActiveContext ? 'text-neon-blue' : 'text-slate-200'}`}>
                                {node.title}
                            </span>
                            {isLate && <AlertCircle size={12} className="text-red-500 animate-pulse" title="Deadline dépassée" />}
                            {isToday && <AlertCircle size={12} className="text-neon-gold" title="Pour aujourd'hui" />}
                        </div>
                        
                        {(displayCompetencies.length > 0 || node.summary || node.deadline) && (
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap mt-0.5">
                                 {node.deadline && (
                                     <span className={`font-mono ${isLate ? 'text-red-400' : isToday ? 'text-neon-gold' : 'text-slate-500'}`}>
                                         {new Date(node.deadline).toLocaleDateString()}
                                     </span>
                                 )}
                                 {displayCompetencies.map((comp, i) => (
                                     <span key={i} className="uppercase tracking-wider border border-slate-700 px-1 rounded bg-slate-900/50">
                                         {comp}
                                     </span>
                                 ))}
                                 {node.summary && <span className="italic truncate max-w-[200px] opacity-70">- {node.summary}</span>}
                            </div>
                        )}
                    </div>
                  </div>

                  {/* Stats & Controls */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className={`font-mono text-sm ${isActiveContext ? 'text-neon-gold' : 'text-slate-400'}`}>
                          {formatTime(node.totalTimeSeconds)}
                        </span>
                        {hasProgress && (
                            <div className="text-[9px] font-mono text-slate-600">
                                / {formatTime(progressStats.estimate)}
                            </div>
                        )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                       {node.type !== 'subtask' && (
                           <button 
                                onClick={(e) => { e.stopPropagation(); onAddChild(node.id, getNextType(node.type)); }}
                                className="p-1.5 rounded text-slate-500 hover:text-neon-purple hover:bg-neon-purple/10"
                           >
                               <Plus size={14} />
                           </button>
                       )}
                       <button 
                            onClick={(e) => { e.stopPropagation(); onOpenDetail(node); }}
                            className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-slate-700"
                       >
                           <Pencil size={14} />
                       </button>
                       {node.status !== 'completed' && node.type !== 'category' && (
                           <>
                            {isRunning ? (
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); onStatusChange(node.id, 'paused'); }}
                                    className="p-1.5 rounded-md text-slate-900 bg-neon-blue hover:bg-white"
                                 >
                                    <Pause size={14} fill="currentColor" />
                                 </button>
                            ) : (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onStatusChange(node.id, 'running'); }}
                                    className="p-1.5 rounded-md transition-colors border border-slate-700 text-neon-blue hover:bg-neon-blue/10"
                                >
                                    <Play size={14} />
                                </button>
                            )}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onStatusChange(node.id, 'completed'); }}
                                className="p-1.5 rounded-md text-slate-500 hover:text-green-400 hover:bg-green-400/10"
                            >
                                <Square size={14} />
                            </button>
                           </>
                       )}
                    </div>
                    {node.status === 'completed' && <CheckSquare size={16} className="text-green-500" />}
                  </div>
              </div>

              {/* Progress Bar (Visible if estimated time exists) */}
              {hasProgress && node.status !== 'completed' && (
                  <div className="mt-1 ml-9 mr-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getProgressColor(progressStats.percent)} transition-all duration-500`} 
                        style={{ width: `${progressStats.percent}%` }}
                      ></div>
                  </div>
              )}
            </div>

            {/* Recursion */}
            {node.children && node.expanded && (
              <QuestTree 
                nodes={node.children} 
                onToggleExpand={onToggleExpand} 
                onStatusChange={onStatusChange}
                onOpenDetail={onOpenDetail}
                onAddChild={onAddChild}
                runningIds={runningIds}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default QuestTree;