import { ref, watch } from 'vue'
import { initConfig, getConfigRepo } from '../services/config'

export type TaskFrequency = 'daily' | 'weekly' | 'once'

export interface Task {
  id: string
  title: string
  description: string
  points: number
  icon: string
  frequency: TaskFrequency
  assignedTo: string[]
  createdAt: number
}

const tasks = ref<Task[]>([])
let initialized = false

const loadTasks = async () => {
  const repo = await initConfig()
  try {
    const saved = repo.getConfig<Task[]>('/tasks')
    if (saved && Array.isArray(saved)) {
      tasks.value = saved
    }
  } catch (e) {
    console.warn('Failed to load tasks from config:', e)
    const savedTasks = localStorage.getItem('kidpoints-tasks')
    if (savedTasks) {
      tasks.value = JSON.parse(savedTasks)
    }
  }
  initialized = true
}

const saveTasks = () => {
  if (!initialized) return
  try {
    const repo = getConfigRepo()
    repo.setConfig('/tasks', tasks.value)
  } catch (e) {
    console.warn('Failed to save tasks to config, falling back to localStorage:', e)
    localStorage.setItem('kidpoints-tasks', JSON.stringify(tasks.value))
  }
}

watch(tasks, () => {
  saveTasks()
}, { deep: true })

let loadPromise: Promise<void> | null = null

const ensureLoaded = (): Promise<void> => {
  if (initialized) return Promise.resolve()
  if (loadPromise) return loadPromise
  loadPromise = loadTasks()
  return loadPromise
}

export function useTasks() {
  const addTask = (data: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now()
    }
    tasks.value.push(newTask)
    return newTask
  }

  const updateTask = (id: string, data: Partial<Task>) => {
    const index = tasks.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...data }
    }
  }

  const deleteTask = (id: string) => {
    tasks.value = tasks.value.filter(t => t.id !== id)
  }

  const resetDailyTasks = () => {
    const dailyTaskIds = tasks.value
      .filter(t => t.frequency === 'daily')
      .map(t => t.id)
    
    localStorage.setItem('kidpoints-daily-reset-tasks', JSON.stringify(dailyTaskIds))
  }

  const resetWeeklyTasks = () => {
    const weeklyTaskIds = tasks.value
      .filter(t => t.frequency === 'weekly')
      .map(t => t.id)
    
    localStorage.setItem('kidpoints-weekly-reset-tasks', JSON.stringify(weeklyTaskIds))
  }

  const getTasksByFrequency = (frequency: TaskFrequency) => {
    return tasks.value.filter(t => t.frequency === frequency)
  }

  const getTasksForMember = (memberId: string) => {
    return tasks.value.filter(t => 
      t.assignedTo.includes(memberId) || t.assignedTo.length === 0
    )
  }

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    resetDailyTasks,
    resetWeeklyTasks,
    getTasksByFrequency,
    getTasksForMember,
    loadTasks: ensureLoaded,
    ensureLoaded
  }
}
