import React, { useState, useEffect, useRef } from 'react';
import { Send, Terminal as TerminalIcon } from 'lucide-react';
import { LogEntry, AICommand } from '../types';
import { GoogleGenAI } from "@google/genai";

interface TerminalProps {
    logs: LogEntry[];
    onNewLog: (log: LogEntry) => void;
    onCommand: (cmd: AICommand) => void;
    contextSummary: string;
    nodesList: string; // Simplified list of projects for mapping
}

const Terminal: React.FC<TerminalProps> = ({ logs, onNewLog, onCommand, contextSummary, nodesList }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const handleSend = async () => {
        if (!input.trim()) return;

        // User Message
        const userMsg: LogEntry = {
            id: Date.now().toString(),
            timestamp: new Date(),
            sender: 'USER',
            message: input
        };
        onNewLog(userMsg);
        setInput('');
        setIsLoading(true);

        try {
            const apiKey = process.env.API_KEY;
            if (!apiKey) throw new Error("API_KEY not found");

            const ai = new GoogleGenAI({ apiKey });
            
            const systemPrompt = `
                Tu es "Vëanarë-OS", le noyau du système de Yoann Delaloy.
                
                CONTEXTE ACTUEL:
                ${contextSummary}
                
                ARBORESCENCE (Projets/Catégories disponibles):
                ${nodesList}

                INSTRUCTIONS:
                1. Si l'utilisateur veut CRÉER une tâche/projet :
                   Réponds UNIQUEMENT avec un JSON valide : { "action": "CREATE_NODE", "data": { "parentId": "ID_PARENT", "title": "TITRE", "type": "task|project" } }
                   Trouve l'ID parent le plus logique dans l'arborescence fournie. Si ambigu, demande précisions.
                2. Si l'utilisateur pose une question : Réponds en texte court, style Cyber-Fantasy.
                3. Ne sois pas bavard.
                4. N'utilise pas de Markdown (pas de \`\`\`json). Renvoie le JSON brut si c'est une commande.

                Input User: ${input}
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-latest',
                contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
            });

            const rawText = response.text || "";
            
            // Cleanup Markdown if present (often causes parse errors)
            const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            
            // Attempt to parse JSON command
            let isCommand = false;
            try {
                // Find potential JSON block
                const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const cmd = JSON.parse(jsonMatch[0]) as AICommand;
                    if (cmd.action && cmd.data) {
                        isCommand = true;
                        onCommand(cmd);
                        onNewLog({
                            id: Date.now().toString(),
                            timestamp: new Date(),
                            sender: 'CORE',
                            message: `COMMANDE REÇUE : Création de [${cmd.data.title}] dans le secteur [${cmd.data.parentId}]. Exécution...`
                        });
                    }
                }
            } catch (e) {
                // Ignore parse error, treat as text
            }

            if (!isCommand) {
                onNewLog({
                    id: (Date.now() + 1).toString(),
                    timestamp: new Date(),
                    sender: 'CORE',
                    message: cleanText
                });
            }

        } catch (error) {
            onNewLog({
                id: (Date.now() + 1).toString(),
                timestamp: new Date(),
                sender: 'SYSTEM',
                message: "ERREUR NEURONALE: Impossible de traiter la requête. Vérifiez la clé API."
            });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-void-panel rounded-lg border border-slate-800 overflow-hidden font-mono text-sm shadow-2xl">
            <div className="bg-slate-900/50 p-2 border-b border-slate-800 flex items-center gap-2">
                <TerminalIcon size={14} className="text-neon-purple" />
                <span className="text-slate-400 text-xs tracking-widest">COM_LINK_V2.1 // ONLINE</span>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {logs.map((log) => (
                    <div key={log.id} className={`flex flex-col ${log.sender === 'USER' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-md ${
                            log.sender === 'USER' 
                                ? 'bg-slate-800 text-slate-200 border border-slate-700' 
                                : log.sender === 'SYSTEM'
                                ? 'bg-red-900/20 text-red-400 border border-red-900/50'
                                : 'bg-neon-blue/10 text-neon-blue border border-neon-blue/20 shadow-[0_0_10px_rgba(0,243,255,0.1)]'
                        }`}>
                            <div className="flex items-center gap-2 mb-1 border-b border-white/5 pb-1">
                                <span className={`text-[10px] font-bold tracking-wider ${
                                    log.sender === 'CORE' ? 'text-neon-purple' : 'text-slate-500'
                                }`}>
                                    [{log.sender}]
                                </span>
                                <span className="text-[10px] text-slate-600">
                                    {log.timestamp.toLocaleTimeString()}
                                </span>
                            </div>
                            <p className="whitespace-pre-wrap leading-relaxed">{log.message}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-center gap-2 text-neon-purple animate-pulse">
                        <div className="w-2 h-2 bg-neon-purple rounded-full"></div>
                        <span className="text-xs">CALCUL PROBABILISTE...</span>
                    </div>
                )}
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800">
                <div className="flex items-center gap-2 bg-black/30 p-2 rounded border border-slate-700 focus-within:border-neon-blue transition-colors">
                    <span className="text-neon-blue">{'>'}</span>
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Créer une tâche..."
                        className="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder-slate-600 font-mono"
                    />
                    <button onClick={handleSend} disabled={isLoading} className="text-slate-500 hover:text-neon-blue">
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Terminal;