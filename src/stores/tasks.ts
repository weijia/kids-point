import { ref, computed } from 'vue'

export interface Task {
  id: string
  title: string
  icon: string
  description: string
  points: number
  memberId: string | null // null for tasks available to all members
  frequency: 'daily' | 'weekly' | 'once'
  createdAt: number
  completedAt: number | null
  completedBy: string | null
  isComplete: boolean
}

export interface TasksStore {
  tasks: Task[]
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'completedBy' | 'isComplete'>) => void
  updateTask: (id: string, data: Partial<Task>) => void
  deleteTask: (id: string) => void
  getTaskById: (id: string) => Task | undefined
  getMemberTasks: (memberId: string) => Task[]
  getAvailableTasks: (memberId: string) => Task[]
  completeTask: (taskId: string, memberId: string) => void
  getPendingTasksCount: () => number
  getCompletedTasksCount: () => number
  resetDailyTasks: () => void
  resetWeeklyTasks: () => void
  loadTasks: () => void
  saveTasks: () => void
}

export function useTasks(): TasksStore {
  const tasks = ref<Task[]>([])

  // Load tasks from localStorage
  const loadTasks = () => {
    const savedTasks = localStorage.getItem('kidpoints-tasks')
    if (savedTasks) {
      tasks.value = JSON.parse(savedTasks)
    }
  }

  // Save tasks to localStorage
  const saveTasks = () => {
    localStorage.setItem('kidpoints-tasks', JSON.stringify(tasks.value))
  }

  // Add a new task
  const addTask = (task: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'completedBy' | 'isComplete'>) => {
    const newTask: Task = {
      id: Date.now().toString(),
      ...task,
      createdAt: Date.now(),
      completedAt: null,
      completedBy: null,
      isComplete: false
    }
    
    tasks.value.push(newTask)
    saveTasks()
  }

  // Update an existing task
  const updateTask = (id: string, data: Partial<Task>) => {
    const index = tasks.value.findIndex(task => task.id === id)
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...data }
      saveTasks()
    }
  }

  // Delete a task
  const deleteTask = (id: string) => {
    tasks.value = tasks.value.filter(task => task.id !== id)
    saveTasks()
  }

  // Get a task by ID
  const getTaskById = (id: string): Task | undefined => {
    return tasks.value.find(task => task.id === id)
  }

  // Get tasks assigned to a specific member or available to all
  const getMemberTasks = (memberId: string): Task[] => {
    return tasks.value.filter(
      task => task.memberId === memberId || task.memberId === null
    )
  }

  // Get available (incomplete) tasks for a member
  const getAvailableTasks = (memberId: string): Task[] => {
    return getMemberTasks(memberId).filter(task => !task.isComplete)
  }

  // Mark a task as complete
  const completeTask = (taskId: string, memberId: string) => {
    const task = getTaskById(taskId)
    if (task && (task.memberId === memberId || task.memberId === null) && !task.isComplete) {
      updateTask(taskId, {
        isComplete: true,
        completedAt: Date.now(),
        completedBy: memberId
      })
    }
  }

  // Get count of pending tasks
  const getPendingTasksCount = (): number => {
    return tasks.value.filter(task => !task.isComplete).length
  }

  // Get count of completed tasks
  const getCompletedTasksCount = (): number => {
    return tasks.value.filter(task => task.isComplete).length
  }

  // Reset daily tasks (make them available again)
  const resetDailyTasks = () => {
    tasks.value.forEach(task => {
      if (task.frequency === 'daily' && task.isComplete) {
        task.isComplete = false
        task.completedAt = null
        task.completedBy = null
      }
    })
    saveTasks()
  }

  // Reset weekly tasks (make them available again)
  const resetWeeklyTasks = () => {
    tasks.value.forEach(task => {
      if (task.frequency === 'weekly' && task.isComplete) {
        task.isComplete = false
        task.completedAt = null
        task.completedBy = null
      }
    })
    saveTasks()
  }

  return {
    tasks: tasks.value,
    addTask,
    updateTask,
    deleteTask,
    getTaskById,
    getMemberTasks,
    getAvailableTasks,
    completeTask,
    getPendingTasksCount,
    getCompletedTasksCount,
    resetDailyTasks,
    resetWeeklyTasks,
    loadTasks,
    saveTasks
  }
}