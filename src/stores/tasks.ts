import { ref } from 'vue'

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

const loadTasks = () => {
  const savedTasks = localStorage.getItem('kidpoints-tasks')
  if (savedTasks) {
    tasks.value = JSON.parse(savedTasks)
  }
}

const saveTasks = () => {
  localStorage.setItem('kidpoints-tasks', JSON.stringify(tasks.value))
}

export function useTasks() {
  const addTask = (data: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now()
    }
    tasks.value.push(newTask)
    saveTasks()
    return newTask
  }

  const updateTask = (id: string, data: Partial<Task>) => {
    const index = tasks.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...data }
      saveTasks()
    }
  }

  const deleteTask = (id: string) => {
    tasks.value = tasks.value.filter(t => t.id !== id)
    saveTasks()
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
    loadTasks
  }
}
