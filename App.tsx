import React, { useState, useEffect, useReducer, useMemo } from 'react';
import { INITIAL_QUEST_TREE } from './constants';
import { QuestNode, UserProfile, LogEntry, NodeType, AICommand } from './types';
import QuestTree from './components/QuestTree';
import Terminal from './components/Terminal';
import NodeDetailModal from './components/NodeDetailModal';
import ProfileDetailModal from './components/ProfileDetailModal';
import { calculateLevelFromXP, getRankTitle, calculateProgressToNextLevel, formatTime, calculateGlobalStats, getDominantCompetency, migrateNodes, calculateNodeProgress } from './utils/xpSystem';
import { Shield, Target, Cpu, MapPin, Briefcase, User, Star, Trophy, List, Grid, Calendar, Plus, Clock } from 'lucide-react';

// --- State Actions ---
type Action = 
  | { type: 'TOGGLE_EXPAND'; id: string }
  | { type: 'SET_STATUS'; id: string; status: 'running' | 'paused' | 'completed' }
  | { type: 'TICK' }
  | { type: 'ADD_LOG'; log: LogEntry }
  | { type: 'CREATE_NODE'; parentId: string; newNode: QuestNode }
  | { type: 'UPDATE_NODE'; id: string; updates: Partial<QuestNode> }
  | { type: 'DELETE_NODE'; id: string }
  | { type: 'INIT_STATE'; state: State };

interface State {
  nodes: QuestNode[];
  user: UserProfile;
  runningIds: string[]; // Supports multiple tasks
  sessionStartTimes: Record<string, number>; // Maps ID -> timestamp (ms) when started
  logs: LogEntry[];
}

// --- Reducer Helpers ---
const updateNodeById = (nodes: QuestNode[], id: string, updateFn: (node: QuestNode) => Partial<QuestNode>): QuestNode[] => {
  return nodes.map(node => {
    if (node.id === id) {
      return { ...node, ...updateFn(node) };
    }
    if (node.children) {
      return { ...node, children: updateNodeById(node.children, id, updateFn) };
    }
    return node;
  });
};

const addChildToNode = (nodes: QuestNode[], parentId: string, newNode: QuestNode): QuestNode[] => {
    return nodes.map(node => {
        if (node.id === parentId) {
            return {
                ...node,
                children: [...(node.children || []), newNode],
                expanded: true
            };
        }
        if (node.children) {
            return { ...node, children: addChildToNode(node.children, parentId, newNode) };
        }
        return node;
    });
};

const deleteNodeById = (nodes: QuestNode[], id: string): QuestNode[] => {
    return nodes.filter(node => node.id !== id).map(node => {
        if (node.children) {
            return { ...node, children: deleteNodeById(node.children, id) };
        }
        return node;
    });
};

const findNodePath = (nodes: QuestNode[], targetId: string, path: string[] = []): string[] | null => {
    for (const node of nodes) {
        if (node.id === targetId) return [...path, node.id];
        if (node.children) {
            const result = findNodePath(node.children, targetId, [...path, node.id]);
            if (result) return result;
        }
    }
    return null;
};

// Updates time AND history
const incrementTimeForPaths = (nodes: QuestNode[], allPathIds: string[]): { newNodes: QuestNode[] } => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    return {
        newNodes: nodes.map(node => {
            if (allPathIds.includes(node.id)) {
                // Update history
                const currentHistory = node.history || {};
                const todaySeconds = (currentHistory[today] || 0) + 1;
                
                return {
                    ...node,
                    totalTimeSeconds: node.totalTimeSeconds + 1,
                    history: {
                        ...currentHistory,
                        [today]: todaySeconds
                    },
                    children: node.children ? incrementTimeForPaths(node.children, allPathIds).newNodes : undefined
                };
            }
            return node;
        })
    };
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'INIT_STATE':
        return action.state;
    
    case 'TOGGLE_EXPAND':
      return {
        ...state,
        nodes: updateNodeById(state.nodes, action.id, (n) => ({ expanded: !n.expanded }))
      };
    
    case 'SET_STATUS':
      // Multi-tasking logic
      let newRunningIds = [...state.runningIds];
      let newSessionStartTimes = { ...state.sessionStartTimes };

      if (action.status === 'running') {
          if (!newRunningIds.includes(action.id)) {
              newRunningIds.push(action.id);
              newSessionStartTimes[action.id] = Date.now();
          }
      } else {
          // Pause or Complete
          newRunningIds = newRunningIds.filter(id => id !== action.id);
          delete newSessionStartTimes[action.id];
      }

      return {
          ...state,
          runningIds: newRunningIds,
          sessionStartTimes: newSessionStartTimes,
          nodes: updateNodeById(state.nodes, action.id, () => ({ status: action.status }))
      };

    case 'TICK':
      if (state.runningIds.length === 0) return state;
      
      // Find paths for ALL running nodes
      let allPathIds: string[] = [];
      state.runningIds.forEach(id => {
          const p = findNodePath(state.nodes, id);
          if (p) allPathIds = [...allPathIds, ...p];
      });
      // De-duplicate
      allPathIds = [...new Set(allPathIds)];

      const { newNodes } = incrementTimeForPaths(state.nodes, allPathIds);
      
      const xpGained = (state.runningIds.length) / 60;

      return {
          ...state,
          nodes: newNodes,
          user: {
              ...state.user,
              globalXP: state.user.globalXP + xpGained
          }
      };

    case 'ADD_LOG':
        return { ...state, logs: [...state.logs, action.log] };

    case 'CREATE_NODE':
        return {
            ...state,
            nodes: addChildToNode(state.nodes, action.parentId, action.newNode)
        };

    case 'UPDATE_NODE':
        return {
            ...state,
            nodes: updateNodeById(state.nodes, action.id, () => action.updates)
        };

    case 'DELETE_NODE':
        return {
            ...state,
            nodes: deleteNodeById(state.nodes, action.id),
            runningIds: state.runningIds.filter(id => id !== action.id)
        };

    default:
      return state;
  }
};

const App: React.FC = () => {
  const loadState = (): State => {
      const saved = localStorage.getItem('veanare-state-v2'); 
      if (saved) {
          const parsed = JSON.parse(saved);
          parsed.logs = parsed.logs.map((l: any) => ({ ...l, timestamp: new Date(l.timestamp) }));
          if (parsed.nodes) parsed.nodes = migrateNodes(parsed.nodes);
          if (!parsed.runningIds) parsed.runningIds = [];
          if (!parsed.sessionStartTimes) parsed.sessionStartTimes = {};
          return parsed;
      }
      return {
        nodes: INITIAL_QUEST_TREE,
        user: {
          name: 'Yoann DELALOY',
          location: 'Châteauneuf-sur-Loire',
          birthDate: '1992-04-12',
          globalXP: 0
        },
        runningIds: [],
        sessionStartTimes: {},
        logs: [{
            id: 'init-1',
            timestamp: new Date(),
            sender: 'SYSTEM',
            message: 'Vëanarë-OS v3.3 Matrix-Link. Ready.'
        }]
      };
  };

  const [state, dispatch] = useReducer(reducer, null, loadState);

  useEffect(() => {
      localStorage.setItem('veanare-state-v2', JSON.stringify(state));
  }, [state]);

  const [modalNode, setModalNode] = useState<QuestNode | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [questView, setQuestView] = useState<'tree' | 'daily' | 'matrix'>('tree');

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (state.runningIds.length > 0) {
      interval = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state.runningIds.length]);

  // Derived Stats
  const level = calculateLevelFromXP(state.user.globalXP);
  const rank = getRankTitle(level);
  const progress = calculateProgressToNextLevel(state.user.globalXP);
  const globalStats = useMemo(() => calculateGlobalStats(state.nodes), [state.nodes]);

  // Competencies Stats
  const domDay = useMemo(() => getDominantCompetency(state.nodes, 'day'), [state.nodes]);
  const domWeek = useMemo(() => getDominantCompetency(state.nodes, 'week'), [state.nodes]);
  const domMonth = useMemo(() => getDominantCompetency(state.nodes, 'month'), [state.nodes]);
  const domQuarter = useMemo(() => getDominantCompetency(state.nodes, 'quarter'), [state.nodes]);
  const domSemester = useMemo(() => getDominantCompetency(state.nodes, 'semester'), [state.nodes]);
  const domYear = useMemo(() => getDominantCompetency(state.nodes, 'year'), [state.nodes]);

  const runningTasksData = useMemo(() => {
      return state.runningIds.map(id => {
          const find = (nodes: QuestNode[]): QuestNode | null => {
              for (const n of nodes) {
                  if (n.id === id) return n;
                  if (n.children) {
                      const res = find(n.children);
                      if (res) return res;
                  }
              }
              return null;
          }
          const node = find(state.nodes);
          const startTime = state.sessionStartTimes[id];
          const sessionSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
          
          return {
              id,
              title: node?.title || "Unknown",
              sessionSeconds,
              sessionXP: Math.floor(sessionSeconds / 60)
          };
      });
  }, [state.runningIds, state.nodes, state.sessionStartTimes, state.user.globalXP]); 

  // --- Flatten nodes for specific views ---
  const getAllNodesFlat = (nodes: QuestNode[]): QuestNode[] => {
      let flat: QuestNode[] = [];
      nodes.forEach(n => {
          flat.push(n);
          if (n.children) flat = [...flat, ...getAllNodesFlat(n.children)];
      });
      return flat;
  };
  
  const allNodes = useMemo(() => getAllNodesFlat(state.nodes), [state.nodes]);

  // Daily View Data: Tasks/Subtasks with deadline TODAY or running
  const dailyNodes = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      return allNodes.filter(n => {
          if (n.type === 'category') return false;
          if (state.runningIds.includes(n.id)) return true;
          if (n.deadline === today && n.status !== 'completed') return true;
          return false;
      });
  }, [allNodes, state.runningIds]);

  // Matrix View Data: Projects only
  const matrixNodes = useMemo(() => {
      return allNodes.filter(n => n.type === 'project').map(n => ({
          ...n,
          stats: calculateNodeProgress(n)
      })).sort((a, b) => (a.deadline || '9999') > (b.deadline || '9999') ? 1 : -1);
  }, [allNodes]);

  const nodesListString = useMemo(() => {
      // Simplified list for AI
      return allNodes.map(n => `- ${n.type}: ${n.title} (ID: ${n.id})`).join('\n');
  }, [allNodes]);

  // Handlers
  const handleToggle = (id: string) => dispatch({ type: 'TOGGLE_EXPAND', id });
  const handleStatus = (id: string, status: 'running' | 'paused' | 'completed') => dispatch({ type: 'SET_STATUS', id, status });
  const handleNewLog = (log: LogEntry) => dispatch({ type: 'ADD_LOG', log });
  
  const handleAddChild = (parentId: string, type: NodeType) => {
      const newNode: QuestNode = {
          id: `node-${Date.now()}`,
          title: 'Nouvelle Quête',
          type,
          status: 'idle',
          totalTimeSeconds: 0,
          children: []
      };
      dispatch({ type: 'CREATE_NODE', parentId, newNode });
      setModalNode(newNode); 
  };

  const handleUpdateNode = (id: string, updates: Partial<QuestNode>) => {
      dispatch({ type: 'UPDATE_NODE', id, updates });
  };

  const handleDeleteNode = (id: string) => {
      dispatch({ type: 'DELETE_NODE', id });
  };

  const handleAICommand = (cmd: AICommand) => {
      if (cmd.action === 'CREATE_NODE' && cmd.data) {
          dispatch({
              type: 'CREATE_NODE',
              parentId: cmd.data.parentId,
              newNode: {
                  id: `ai-${Date.now()}`,
                  title: cmd.data.title,
                  type: cmd.data.type || 'task',
                  status: 'idle',
                  totalTimeSeconds: 0,
                  children: []
              }
          });
      }
  };

  // Quick Create Functions (Manual Buttons)
  const handleQuickCreate = (type: NodeType) => {
      // Default to adding to first Category if specific parent not found logic complexity skipped for now
      // Let's add to first category found for safety, or root if user selects later?
      // For UX, let's just add to the first Category (usually Entrepreneurship) and let user move/edit, 
      // OR open modal to let user "know" it's created and maybe we implement drag-drop later.
      // Simple approach: Add to "cat-1" (Entrepreneuriat) as default inbox.
      handleAddChild('cat-1', type);
  };

  return (
    <div className="min-h-screen bg-void-dark text-slate-200 p-4 lg:p-8 flex flex-col gap-6 font-display selection:bg-neon-blue selection:text-black">
      
      {modalNode && (
          <NodeDetailModal 
            node={modalNode}
            isOpen={!!modalNode}
            onClose={() => setModalNode(null)}
            onSave={handleUpdateNode}
            onDelete={handleDeleteNode}
          />
      )}

      {isProfileOpen && (
          <ProfileDetailModal 
            user={state.user}
            nodes={state.nodes}
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
          />
      )}

      {/* HEADER / HUD */}
      <header className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Profile Card */}
        <div 
            onClick={() => setIsProfileOpen(true)}
            className="lg:col-span-1 bg-void-panel border border-slate-800 rounded-lg p-4 relative overflow-hidden group cursor-pointer hover:border-neon-blue/50 transition-colors"
        >
            <div className="absolute inset-0 bg-gradient-to-b from-neon-blue/5 to-transparent opacity-50 group-hover:opacity-80 transition-opacity"></div>
            <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center border border-neon-blue/30 shadow-[0_0_15px_rgba(0,243,255,0.2)]">
                        <Cpu className="text-neon-blue" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-widest">{state.user.name}</h1>
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                             <MapPin size={10} />
                             {state.user.location}
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-between items-end mt-2">
                    <span className="text-neon-purple font-mono text-sm">LVL {level}</span>
                    <span className="text-neon-gold font-bold tracking-widest text-lg">{rank.toUpperCase()}</span>
                </div>
                
                <div className="w-full h-2 bg-slate-900 rounded-full mt-1 overflow-hidden border border-slate-700">
                    <div 
                        className="h-full bg-gradient-to-r from-neon-blue via-neon-purple to-neon-blue w-[var(--progress)] transition-all duration-1000 ease-out"
                        style={{ '--progress': `${progress}%` } as React.CSSProperties}
                    ></div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>XP: {Math.floor(state.user.globalXP)}</span>
                    <span>NEXT: {Math.floor(calculateLevelFromXP(state.user.globalXP) + 1)}</span>
                </div>
            </div>
        </div>

        {/* Global Stats / Quick Actions */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
             {/* Widget 1: Focus Multi-Thread */}
             <div className="bg-void-panel border border-slate-800 rounded-lg p-4 flex flex-col gap-2 relative overflow-hidden h-32">
                 <div className="flex items-center gap-2 text-xs text-slate-500 uppercase font-mono z-10">
                     <Target size={14} className={runningTasksData.length > 0 ? "text-neon-blue animate-pulse" : ""} />
                     <span>Focus Actuel {runningTasksData.length > 0 ? `(${runningTasksData.length})` : ""}</span>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto custom-scrollbar z-10 space-y-2">
                     {runningTasksData.length > 0 ? (
                         runningTasksData.map(task => (
                             <div key={task.id} className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-700">
                                 <span className="text-sm text-white truncate max-w-[40%]">{task.title}</span>
                                 <div className="flex items-center gap-3">
                                     <span className="text-xs font-mono text-slate-300">{formatTime(task.sessionSeconds)}</span>
                                     <span className="text-xs font-mono text-neon-gold">+{task.sessionXP} XP</span>
                                 </div>
                             </div>
                         ))
                     ) : (
                         <div className="h-full flex items-center justify-center text-slate-600 italic text-sm">EN ATTENTE</div>
                     )}
                 </div>
             </div>

             {/* Widget 2: Pro vs Perso Time + XP */}
             <div className="bg-void-panel border border-slate-800 rounded-lg p-4 flex flex-col justify-center gap-3">
                 <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-mono border-b border-slate-800 pb-1">
                     <span>Répartition</span>
                     <Shield size={14} />
                 </div>
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Briefcase size={16} className="text-neon-purple" />
                        <span className="text-sm font-bold text-white">PRO</span>
                    </div>
                    <div className="text-right">
                        <div className="font-mono text-xs text-slate-300">{formatTime(globalStats.proTime)}</div>
                        <div className="font-mono text-[10px] text-neon-purple">{globalStats.proXP} XP</div>
                    </div>
                 </div>
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <User size={16} className="text-green-400" />
                        <span className="text-sm font-bold text-white">PERSO</span>
                    </div>
                    <div className="text-right">
                        <div className="font-mono text-xs text-slate-300">{formatTime(globalStats.persoTime)}</div>
                        <div className="font-mono text-[10px] text-green-400">{globalStats.persoXP} XP</div>
                    </div>
                 </div>
             </div>

             {/* Widget 3: Dominant Competencies (All Timeframes) */}
             <div className="bg-void-panel border border-slate-800 rounded-lg p-4 flex flex-col gap-2 h-32">
                 <div className="flex items-center gap-2 text-xs text-slate-500 uppercase font-mono border-b border-slate-800 pb-1">
                     <Star size={14} className="text-neon-gold" />
                     <span>Compétences Dominantes</span>
                 </div>
                 <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                     {[
                         { label: '24H', data: domDay, color: 'text-neon-gold' },
                         { label: '7J', data: domWeek, color: 'text-neon-blue' },
                         { label: '30J', data: domMonth, color: 'text-neon-purple' },
                         { label: '90J', data: domQuarter, color: 'text-white' },
                         { label: '180J', data: domSemester, color: 'text-slate-300' },
                         { label: '360J', data: domYear, color: 'text-slate-400' },
                     ].map((row, i) => (
                         <div key={i} className="flex justify-between items-center text-[10px] hover:bg-slate-800/50 rounded px-1">
                             <span className="text-slate-500 w-8">{row.label}</span>
                             <span className="text-white truncate flex-1 px-2">{row.data ? row.data.name : '-'}</span>
                             <div className="flex gap-2">
                                <span className={`font-mono ${row.color}`}>{row.data ? `L${row.data.level}` : ''}</span>
                                <span className="font-mono text-slate-400">{row.data ? formatTime(row.data.periodTime) : ''}</span>
                                <span className={`font-mono ${row.color}`}>{row.data ? `+${row.data.periodXP}XP` : ''}</span>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
        </div>

      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
          
          {/* Left: Quest Log */}
          <section className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-neon-blue flex items-center gap-2">
                      <span className="w-2 h-6 bg-neon-blue rounded-sm"></span>
                      JOURNAL DE QUÊTES
                  </h2>
                  
                  {/* Controls */}
                  <div className="flex items-center gap-4">
                      {/* View Switcher */}
                      <div className="flex bg-slate-900 rounded p-1 border border-slate-800">
                          <button onClick={() => setQuestView('tree')} className={`p-2 rounded ${questView === 'tree' ? 'bg-slate-800 text-neon-blue' : 'text-slate-500'}`} title="Vue Arbre"><List size={16}/></button>
                          <button onClick={() => setQuestView('daily')} className={`p-2 rounded ${questView === 'daily' ? 'bg-slate-800 text-neon-gold' : 'text-slate-500'}`} title="Vue Focus Jour"><Calendar size={16}/></button>
                          <button onClick={() => setQuestView('matrix')} className={`p-2 rounded ${questView === 'matrix' ? 'bg-slate-800 text-neon-purple' : 'text-slate-500'}`} title="Vue Matrice Projets"><Grid size={16}/></button>
                      </div>
                      
                      {/* Create Buttons */}
                      <div className="flex gap-2">
                          <button onClick={() => handleQuickCreate('task')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-neon-blue hover:text-neon-blue rounded text-xs transition-colors">
                              <Plus size={14} />
                              <span>TÂCHE</span>
                          </button>
                          <button onClick={() => handleQuickCreate('project')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-neon-purple hover:text-neon-purple rounded text-xs transition-colors">
                              <Plus size={14} />
                              <span>PROJET</span>
                          </button>
                      </div>
                  </div>
              </div>
              
              <div className="flex-1 bg-void-panel rounded-lg border border-slate-800 p-4 overflow-y-auto shadow-inner custom-scrollbar relative">
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
                  
                  {questView === 'tree' && (
                      <QuestTree 
                        nodes={state.nodes} 
                        onToggleExpand={handleToggle}
                        onStatusChange={handleStatus}
                        onOpenDetail={setModalNode}
                        onAddChild={handleAddChild}
                        runningIds={state.runningIds}
                      />
                  )}

                  {questView === 'daily' && (
                      <div className="flex flex-col gap-2">
                          <div className="text-xs text-slate-500 font-mono uppercase mb-2">Quêtes du jour & Actives</div>
                          {dailyNodes.length > 0 ? dailyNodes.map(node => (
                               <div key={node.id} className="bg-slate-900/50 p-3 rounded border border-slate-700 flex justify-between items-center group hover:border-neon-gold transition-colors cursor-pointer" onClick={() => setModalNode(node)}>
                                   <div className="flex flex-col">
                                       <span className="text-white font-bold">{node.title}</span>
                                       <div className="flex gap-2 text-[10px] text-slate-400">
                                           <span className="uppercase">{node.type}</span>
                                           <span>•</span>
                                           <span>{node.deadline ? 'Pour aujourd\'hui' : 'En cours'}</span>
                                       </div>
                                   </div>
                                   <div className="flex items-center gap-3">
                                       <span className="font-mono text-neon-gold">{formatTime(node.totalTimeSeconds)}</span>
                                       {state.runningIds.includes(node.id) ? (
                                           <button 
                                                onClick={(e) => { e.stopPropagation(); handleStatus(node.id, 'paused'); }}
                                                className="p-2 bg-neon-blue text-black rounded"
                                           ><Clock size={16}/></button>
                                       ) : (
                                           <button 
                                                onClick={(e) => { e.stopPropagation(); handleStatus(node.id, 'running'); }}
                                                className="p-2 border border-slate-600 rounded hover:border-neon-gold text-neon-gold"
                                           ><Clock size={16}/></button>
                                       )}
                                   </div>
                               </div>
                          )) : (
                              <div className="text-center text-slate-600 italic mt-10">Aucune quête urgente pour aujourd'hui.</div>
                          )}
                      </div>
                  )}

                  {questView === 'matrix' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {matrixNodes.map(node => (
                              <div key={node.id} className="bg-slate-900/80 p-4 rounded border border-slate-700 hover:border-neon-purple transition-all relative overflow-hidden cursor-pointer" onClick={() => setModalNode(node)}>
                                  <div className="absolute top-0 left-0 w-1 h-full bg-neon-purple/50"></div>
                                  <div className="flex justify-between items-start mb-2">
                                      <h3 className="font-bold text-white truncate max-w-[70%]">{node.title}</h3>
                                      <span className="text-[10px] font-mono text-slate-500">{node.deadline || 'No Date'}</span>
                                  </div>
                                  
                                  <div className="space-y-2">
                                      <div className="flex justify-between text-xs text-slate-400">
                                          <span>Progression</span>
                                          <span>{node.stats.percent}%</span>
                                      </div>
                                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                          <div className="h-full bg-neon-purple" style={{ width: `${node.stats.percent}%` }}></div>
                                      </div>
                                      <div className="flex justify-between text-[10px] font-mono mt-1">
                                          <span className="text-slate-500">Estimé: {formatTime(node.stats.estimate)}</span>
                                          <span className="text-neon-blue">Fait: {formatTime(node.stats.spent)}</span>
                                      </div>
                                  </div>
                              </div>
                          ))}
                          {matrixNodes.length === 0 && (
                              <div className="col-span-full text-center text-slate-600 italic mt-10">Aucun projet actif.</div>
                          )}
                      </div>
                  )}

              </div>
          </section>

          {/* Right: AI Core */}
          <section className="lg:col-span-1 flex flex-col gap-4 h-[600px] lg:h-auto">
             <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-neon-purple flex items-center gap-2">
                      <span className="w-2 h-6 bg-neon-purple rounded-sm"></span>
                      INTERFACE NEURONALE
                  </h2>
              </div>
              <div className="flex-1">
                  <Terminal 
                    logs={state.logs} 
                    onNewLog={handleNewLog}
                    onCommand={handleAICommand}
                    contextSummary={`User Level: ${level}. Running: ${state.runningIds.length} tasks.`}
                    nodesList={nodesListString}
                  />
              </div>
          </section>

      </main>
    </div>
  );
};

export default App;