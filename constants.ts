import { QuestNode } from './types';

export const INITIAL_QUEST_TREE: QuestNode[] = [
  {
    id: 'cat-1',
    title: 'Entrepreneuriat',
    type: 'category',
    status: 'idle',
    totalTimeSeconds: 0,
    expanded: true,
    children: [
      {
        id: 'proj-1',
        title: 'Création site web JD Rénovation',
        type: 'project',
        status: 'idle',
        totalTimeSeconds: 0,
        expanded: true,
        children: [
          { id: 'task-1-1', title: 'Site web', type: 'task', status: 'idle', totalTimeSeconds: 0, competencies: ['No-code', 'Design'] },
          { 
            id: 'task-1-2', 
            title: 'Articles', 
            type: 'task', 
            status: 'idle', 
            totalTimeSeconds: 0,
            expanded: true,
            children: [
              { id: 'sub-1-2-1', title: 'Rédaction', type: 'subtask', status: 'idle', totalTimeSeconds: 0, competencies: ['Relationnel', 'Copywriting'] },
              { id: 'sub-1-2-2', title: 'Vidéo', type: 'subtask', status: 'idle', totalTimeSeconds: 0, competencies: ['Vibe-coding', 'Montage'] }
            ]
          }
        ]
      },
      {
        id: 'proj-2',
        title: 'Construction personal branding Yoann',
        type: 'project',
        status: 'idle',
        totalTimeSeconds: 0,
        competencies: ['Vibe-coding', 'Marketing']
      }
    ]
  },
  {
    id: 'cat-2',
    title: 'Travail Salarié',
    type: 'category',
    status: 'idle',
    totalTimeSeconds: 0,
    children: [
      {
        id: 'proj-3',
        title: 'Intérim',
        type: 'project',
        status: 'idle',
        totalTimeSeconds: 0,
        children: [
            { id: 'task-3-1', title: 'Mission LSDH', type: 'task', status: 'idle', totalTimeSeconds: 0, competencies: ['Maçonnerie', 'Endurance'] },
            { id: 'task-3-2', title: 'Relation Agence', type: 'task', status: 'idle', totalTimeSeconds: 0, competencies: ['Relationnel'] }
        ]
      },
      {
        id: 'proj-4',
        title: 'Recherche d\'emploi',
        type: 'project',
        status: 'idle',
        totalTimeSeconds: 0,
        children: [
            { id: 'task-4-1', title: 'Maj CV', type: 'task', status: 'idle', totalTimeSeconds: 0, competencies: ['Administration'] },
            { id: 'task-4-2', title: 'Plan de recherche', type: 'task', status: 'idle', totalTimeSeconds: 0, competencies: ['Organisation'] },
            { id: 'task-4-3', title: 'Candidature', type: 'task', status: 'idle', totalTimeSeconds: 0, competencies: ['Relationnel'] }
        ]
      }
    ]
  },
  {
    id: 'cat-3',
    title: 'Vie Personnelle',
    type: 'category',
    status: 'idle',
    totalTimeSeconds: 0,
    children: [
      {
        id: 'proj-5',
        title: 'Logement',
        type: 'project',
        status: 'idle',
        totalTimeSeconds: 0,
        children: [
            { id: 'task-5-1', title: 'Ménage', type: 'task', status: 'idle', totalTimeSeconds: 0, competencies: ['Santé/Hygiène'] },
            { id: 'task-5-2', title: 'Vaisselle', type: 'task', status: 'idle', totalTimeSeconds: 0, competencies: ['Santé/Hygiène'] }
        ]
      },
      {
        id: 'proj-6',
        title: 'Santé',
        type: 'project',
        status: 'idle',
        totalTimeSeconds: 0,
        children: [
            { id: 'task-6-1', title: 'Brossage de dents', type: 'task', status: 'idle', totalTimeSeconds: 0, competencies: ['Santé/Hygiène'] },
            { id: 'task-6-2', title: 'Douche', type: 'task', status: 'idle', totalTimeSeconds: 0, competencies: ['Santé/Hygiène'] },
            { id: 'task-6-3', title: 'Rasage', type: 'task', status: 'idle', totalTimeSeconds: 0, competencies: ['Santé/Hygiène'] }
        ]
      },
      {
        id: 'proj-7',
        title: 'Ashley',
        type: 'project',
        status: 'idle',
        totalTimeSeconds: 0,
        children: [
            { id: 'task-7-1', title: 'Temps passé', type: 'task', status: 'idle', totalTimeSeconds: 0, competencies: ['Relationnel', 'Empathie'] },
            { id: 'task-7-2', title: 'Manger', type: 'task', status: 'idle', totalTimeSeconds: 0, competencies: ['Relationnel'] }
        ]
      }
    ]
  }
];