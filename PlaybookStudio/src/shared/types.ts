export type StepCategory = 'recon' | 'enum' | 'exploit' | 'post' | 'privesc' | 'loot' | 'report'
export type StepStatus   = 'todo' | 'inprogress' | 'done' | 'skipped'
export type PlaybookCategory = 'web-app' | 'network' | 'active-directory' | 'linux' | 'windows' | 'ctf' | 'custom'
export type RunStatus = 'running' | 'completed' | 'abandoned'

export interface PlaybookStep {
  id: string
  order: number
  title: string
  description: string
  category: StepCategory
  commands: string[]
  notes: string
  required: boolean
  // Runtime state (populated during a run)
  status?: StepStatus
  completedAt?: string
  operatorNotes?: string
}

export interface Playbook {
  id: string
  name: string
  description: string
  category: PlaybookCategory
  tags: string[]
  version: string
  createdAt: string
  updatedAt: string
  steps: PlaybookStep[]
  isBuiltIn: boolean
}

export interface PlaybookRun {
  id: string
  playbookId: string
  playbookName: string
  startedAt: string
  completedAt?: string
  targetName?: string
  labName?: string
  steps: PlaybookStep[]
  status: RunStatus
}

export interface SharedContext {
  activeLab?: string
  activeTarget?: string
  activeIP?: string
}

export interface AppState {
  playbooks: Playbook[]
  runs: PlaybookRun[]
  sharedContext: SharedContext
}
