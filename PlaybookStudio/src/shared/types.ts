export type StepCategory = 'recon' | 'enum' | 'exploit' | 'post' | 'privesc' | 'loot' | 'report'
export type StepStatus   = 'todo' | 'inprogress' | 'done' | 'skipped'
export type PlaybookCategory = 'web-app' | 'network' | 'active-directory' | 'linux' | 'windows' | 'ctf' | 'custom' | 'ccna'
export type RunStatus = 'running' | 'completed' | 'abandoned'
export type StepType = 'action' | 'verification' | 'documentation' | 'command' | 'decision'

export interface StepCondition {
  variableKey: string
  operator: 'equals' | 'not_equals' | 'contains'
  value: string
  skipStepIds: string[]
}

export interface StepNote {
  id: string
  text: string
  createdAt: string
}

export interface PlaybookStep {
  id: string
  order: number
  title: string
  description: string
  category: StepCategory
  commands: string[]
  notes: string
  required: boolean
  // Feature 1: dependency graph
  dependsOn?: string[]
  // Feature 3: conditional branching
  condition?: StepCondition
  // Feature 14: MITRE ATT&CK
  mitreTechniqueId?: string
  mitreTechniqueName?: string
  // Feature 16: custom step types
  stepType?: StepType
  // Runtime state (populated during a run)
  status?: StepStatus
  completedAt?: string
  startedAt?: string
  operatorNotes?: string
  // Feature 8: evidence attachment
  evidence?: string[]
  // Feature 10: collaborative notes (array of timestamped notes)
  noteThread?: StepNote[]
}

export interface PlaybookVersion {
  version: string
  savedAt: string
  snapshot: Omit<Playbook, 'versions'>
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
  // Feature 2: variables
  variables?: Record<string, string>
  // Feature 9: versioning
  versions?: PlaybookVersion[]
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
  // Feature 2: filled variables at run time
  variables?: Record<string, string>
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
