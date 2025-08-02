import { ref, type Ref } from 'vue'

export interface Task {
  id: string
  title: string
  icon: string
  description: string
  points: number
  memberId: string | null // null for tasks available to all members
  frequency: 'daily' | 'weekly' | 'once'
  weeklyDay?: number // 添加周几属性，用于每周任务
  dueDate?: string // 添加截止日期属性，用于一次性任务
  createdAt: number
  completedAt: number | null
  completedBy: string | null
  isComplete: boolean
}

export interface TasksStore {
  tasks: Ref<Task[]>
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
  resetAllTasks: () => void
  loadTasks: () => void
  saveTasks: () => void
  revertTaskCompletion: (taskId: string, memberId: string) => void
}

export function useTasks(): TasksStore {
  const tasks = ref<Task[]>([])

  // Load tasks from localStorage
  const loadTasks = () => {
    try {
      const savedTasks = localStorage.getItem('kidpoints-tasks')
      if (savedTasks) {
        tasks.value = JSON.parse(savedTasks)
        console.log('Loaded tasks from localStorage:', tasks.value)
      } else {
        console.log('No tasks found in localStorage, initializing with default tasks')
        // Add some example tasks if no data exists
        const defaultTasks: Task[] = [
          {
            id: '1',
            title: '整理房间',
            icon: '🧹',
            description: '整理床铺和玩具',
            points: 5,
            memberId: null, // Available to all members
            frequency: 'daily',
            createdAt: Date.now(),
            completedAt: null,
            completedBy: null,
            isComplete: false
          },
          {
            id: '2',
            title: '完成家庭作业',
            icon: '📚',
            description: '完成所有学校作业',
            points: 10,
            memberId: null, // Available to all members
            frequency: 'daily',
            createdAt: Date.now(),
            completedAt: null,
            completedBy: null,
            isComplete: false
          },
          {
            id: '3',
            title: '帮忙洗碗',
            icon: '🍽️',
            description: '晚餐后帮忙洗碗',
            points: 8,
            memberId: null, // Available to all members
            frequency: 'daily',
            createdAt: Date.now(),
            completedAt: null,
            completedBy: null,
            isComplete: false
          }
        ]
        tasks.value = defaultTasks
        saveTasks()
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
      tasks.value = []
      saveTasks()
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
    if (task && (task.memberId === memberId || task.memberId === null || task.memberId === 'everyone') && !task.isComplete) {
      updateTask(taskId, {
        isComplete: true,
        completedAt: Date.now(),
        completedBy: memberId
      })
    }
  }

  // Revert task completion
  const _revertTaskCompletion = (taskId: string, memberId: string) => {
    const task = getTaskById(taskId)
    if (task && task.completedBy === memberId && task.isComplete) {
      updateTask(taskId, {
        isComplete: false,
        completedAt: null,
        completedBy: null
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

  // Reset all tasks to default examples
  const resetAllTasks = () => {
    console.log('Resetting all tasks to default examples')
    const defaultTasks: Task[] = [
      {
        id: '1',
        title: '整理房间',
        icon: '🧹',
        description: '整理床铺和玩具',
        points: 5,
        memberId: null, // Available to all members
        frequency: 'daily',
        createdAt: Date.now(),
        completedAt: null,
        completedBy: null,
        isComplete: false
      },
      {
        id: '2',
        title: '完成家庭作业',
        icon: '📚',
        description: '完成所有学校作业',
        points: 10,
        memberId: null, // Available to all members
        frequency: 'daily',
        createdAt: Date.now(),
        completedAt: null,
        completedBy: null,
        isComplete: false
      },
      {
        id: '3',
        title: '帮忙洗碗',
        icon: '🍽️',
        description: '晚餐后帮忙洗碗',
        points: 8,
        memberId: null, // Available to all members
        frequency: 'daily',
        createdAt: Date.now(),
        completedAt: null,
        completedBy: null,
        isComplete: false
      }
    ]
    tasks.value = defaultTasks
    saveTasks()
  }

  return {
    tasks,
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
    resetAllTasks,
    loadTasks,
    saveTasks,
    revertTaskCompletion: _revertTaskCompletion
  }
}