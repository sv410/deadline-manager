'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import Link from 'next/link'
import { CursorGlow } from '@/components/cursor-glow'
import {
  Plus,
  Clock,
  Calendar,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Bell,
  Settings,
  Home,
} from 'lucide-react'

interface Deadline {
  id: string
  title: string
  dueDate: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: string
  // Indicates if a specific time was set by the user
  hasTime?: boolean
  // Track completion time for analysis
  completedAt?: string
}

export default function DashboardPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newDeadline, setNewDeadline] = useState({
    title: '',
    dueDate: '', // yyyy-mm-dd
    dueTime: '', // HH:MM (optional)
    priority: 'medium' as const,
  })

  // Load deadlines from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('deadlines')
    if (saved) {
      setDeadlines(JSON.parse(saved))
    }
  }, [])

  // Save deadlines to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('deadlines', JSON.stringify(deadlines))
  }, [deadlines])

  // Analytics helpers
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const overdueCount = deadlines.filter((d) => d.status !== 'completed' && new Date(d.dueDate) < now).length
  const dueTodayCount = deadlines.filter((d) => {
    const dd = new Date(d.dueDate)
    return dd >= startOfToday && dd <= endOfToday
  }).length
  const upcoming7Count = deadlines.filter((d) => {
    const dd = new Date(d.dueDate)
    return dd > now && dd <= in7Days && d.status !== 'completed'
  }).length
  const pastEventsCount = deadlines.filter((d) => new Date(d.dueDate) < now).length

  // Past deadline analysis
  const pastDeadlines = deadlines.filter((d) => new Date(d.dueDate) < now)
  const completedOnTime = pastDeadlines.filter((d) => d.status === 'completed' && new Date(d.completedAt || 0) <= new Date(d.dueDate)).length
  const completedLate = pastDeadlines.filter((d) => d.status === 'completed' && new Date(d.completedAt || 0) > new Date(d.dueDate)).length
  const failedCount = pastDeadlines.filter((d) => d.status !== 'completed').length
  const successRate = pastEventsCount > 0 ? Math.round((completedOnTime / pastEventsCount) * 100) : 0

  const priorityColors = {
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  const statusColors = {
    pending: 'bg-gray-500/20 text-gray-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-green-500/20 text-green-400',
  }

  const handleAddDeadline = () => {
    if (!newDeadline.title || !newDeadline.dueDate) return

    // Compose ISO datetime using local timezone
    const [year, month, day] = newDeadline.dueDate.split('-').map((v) => parseInt(v, 10))
    const hasTime = !!newDeadline.dueTime
    const [hours, minutes] = hasTime ? newDeadline.dueTime.split(':').map((v) => parseInt(v, 10)) : [0, 0]
    const localDate = new Date(year, (month - 1), day, hours, minutes)

    const deadline: Deadline = {
      id: Date.now().toString(),
      title: newDeadline.title,
      dueDate: localDate.toISOString(),
      priority: newDeadline.priority,
      status: 'pending',
      createdAt: new Date().toISOString(),
      hasTime,
    }

    setDeadlines([...deadlines, deadline])
    setNewDeadline({ title: '', dueDate: '', dueTime: '', priority: 'medium' })
    setShowAddForm(false)
  }

  const handleDeleteDeadline = (id: string) => {
    setDeadlines(deadlines.filter((d) => d.id !== id))
  }

  const handleCompleteDeadline = (id: string) => {
    setDeadlines(
      deadlines.map((d) =>
        d.id === id ? { ...d, status: 'completed', completedAt: new Date().toISOString() } : d
      )
    )
  }

  const formatDateDMY = (dateString: string) => {
    const d = new Date(dateString)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}-${mm}-${yyyy}`
  }

  const formatTimeHM = (dateString: string) => {
    const d = new Date(dateString)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  return (
    <div className="min-h-screen bg-black">
      <CursorGlow />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-orange-500/20 bg-black/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <Logo />
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm font-medium text-orange-500"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <button className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-orange-500 transition-colors">
                <Bell className="h-4 w-4" />
                Notifications
              </button>
              <button className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-orange-500 transition-colors">
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              asChild
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-black font-semibold rounded-full"
            >
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Your <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Deadlines</span>
            </h1>
            <p className="text-lg text-gray-400 mb-8">
              Manage all your deadlines, track time, and stay on top of everything.
            </p>

            {/* Add Deadline Button */}
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-black font-semibold rounded-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add New Deadline
            </Button>
          </div>

          {/* Add Deadline Form */}
          {showAddForm && (
            <div className="bg-zinc-900/80 border border-orange-500/20 rounded-2xl p-8 mb-12 backdrop-blur-xl">
              <h2 className="text-xl font-bold text-white mb-6">Create New Deadline</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Deadline Title
                  </label>
                  <input
                    type="text"
                    value={newDeadline.title}
                    onChange={(e) =>
                      setNewDeadline({ ...newDeadline, title: e.target.value })
                    }
                    placeholder="Enter deadline title..."
                    className="w-full bg-zinc-800/50 border border-orange-500/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newDeadline.dueDate}
                      onChange={(e) =>
                        setNewDeadline({ ...newDeadline, dueDate: e.target.value })
                      }
                      className="w-full bg-zinc-800/50 border border-orange-500/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Time (optional)
                    </label>
                    <input
                      type="time"
                      value={newDeadline.dueTime}
                      onChange={(e) =>
                        setNewDeadline({ ...newDeadline, dueTime: e.target.value })
                      }
                      placeholder="--:--"
                      className="w-full bg-zinc-800/50 border border-orange-500/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Priority
                    </label>
                    <select
                      value={newDeadline.priority}
                      onChange={(e) =>
                        setNewDeadline({
                          ...newDeadline,
                          priority: e.target.value as any,
                        })
                      }
                      className="w-full bg-zinc-800/50 border border-orange-500/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical Priority</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleAddDeadline}
                    className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-black font-semibold rounded-lg"
                  >
                    Create Deadline
                  </Button>
                  <Button
                    onClick={() => setShowAddForm(false)}
                    variant="outline"
                    className="border-orange-500/20 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Deadlines List */}
          <div className="space-y-4">
            {deadlines.length === 0 ? (
              <div className="bg-zinc-900/80 border border-orange-500/20 rounded-2xl p-12 text-center backdrop-blur-xl">
                <Calendar className="h-16 w-16 text-orange-500/40 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No deadlines yet
                </h3>
                <p className="text-gray-400 mb-6">
                  Create your first deadline to get started!
                </p>
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-black font-semibold rounded-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Deadline
                </Button>
              </div>
            ) : (
              deadlines.map((deadline) => (
                <div
                  key={deadline.id}
                  className="bg-zinc-900/80 border border-orange-500/20 rounded-2xl p-6 backdrop-blur-xl hover:border-orange-500/40 transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-white">
                          {deadline.title}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                            priorityColors[deadline.priority]
                          }`}
                        >
                          {deadline.priority.charAt(0).toUpperCase() +
                            deadline.priority.slice(1)}{' '}
                          Priority
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            statusColors[deadline.status]
                          }`}
                        >
                          {deadline.status === 'in_progress'
                            ? 'In Progress'
                            : deadline.status.charAt(0).toUpperCase() +
                              deadline.status.slice(1)}
                        </span>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-orange-500" />
                          <span>{formatDateDMY(deadline.dueDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <span>
                            {deadline.hasTime ? formatTimeHM(deadline.dueDate) : '--:--'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <span>Created: {formatDateDMY(deadline.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {deadline.status !== 'completed' && (
                        <Button
                          onClick={() => handleCompleteDeadline(deadline.id)}
                          size="sm"
                          className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDeleteDeadline(deadline.id)}
                        size="sm"
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Stats */}
          {deadlines.length > 0 && (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-900/80 border border-orange-500/20 rounded-2xl p-6 backdrop-blur-xl">
                <div className="text-sm text-gray-400 mb-2">Total Deadlines</div>
                <div className="text-3xl font-bold text-orange-400">
                  {deadlines.length}
                </div>
              </div>
              <div className="bg-zinc-900/80 border border-orange-500/20 rounded-2xl p-6 backdrop-blur-xl">
                <div className="text-sm text-gray-400 mb-2">In Progress</div>
                <div className="text-3xl font-bold text-blue-400">
                  {deadlines.filter((d) => d.status === 'in_progress').length}
                </div>
              </div>
              <div className="bg-zinc-900/80 border border-orange-500/20 rounded-2xl p-6 backdrop-blur-xl">
                <div className="text-sm text-gray-400 mb-2">Completed</div>
                <div className="text-3xl font-bold text-green-400">
                  {deadlines.filter((d) => d.status === 'completed').length}
                </div>
              </div>
            </div>
          )}

          {/* Analytics */}
          {deadlines.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900/80 border border-orange-500/20 rounded-2xl p-6 backdrop-blur-xl">
                <div className="text-sm text-gray-400 mb-2">Due Today</div>
                <div className="text-3xl font-bold text-amber-400">{dueTodayCount}</div>
              </div>
              <div className="bg-zinc-900/80 border border-orange-500/20 rounded-2xl p-6 backdrop-blur-xl">
                <div className="text-sm text-gray-400 mb-2">Overdue</div>
                <div className="text-3xl font-bold text-red-400">{overdueCount}</div>
              </div>
              <div className="bg-zinc-900/80 border border-orange-500/20 rounded-2xl p-6 backdrop-blur-xl">
                <div className="text-sm text-gray-400 mb-2">Upcoming (7 days)</div>
                <div className="text-3xl font-bold text-orange-300">{upcoming7Count}</div>
              </div>
              <div className="bg-zinc-900/80 border border-orange-500/20 rounded-2xl p-6 backdrop-blur-xl">
                <div className="text-sm text-gray-400 mb-2">Past Events</div>
                <div className="text-3xl font-bold text-gray-300">{pastEventsCount}</div>
              </div>
            </div>
          )}

          {/* Past Deadline Analysis */}
          {pastEventsCount > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-white mb-6">Past Deadline Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-zinc-900/80 border border-green-500/20 rounded-2xl p-6 backdrop-blur-xl">
                  <div className="text-sm text-gray-400 mb-2">On-Time Completion</div>
                  <div className="text-3xl font-bold text-green-400">{completedOnTime}</div>
                  <div className="text-xs text-gray-500 mt-2">Completed before deadline</div>
                </div>
                <div className="bg-zinc-900/80 border border-orange-500/20 rounded-2xl p-6 backdrop-blur-xl">
                  <div className="text-sm text-gray-400 mb-2">Late Completion</div>
                  <div className="text-3xl font-bold text-orange-400">{completedLate}</div>
                  <div className="text-xs text-gray-500 mt-2">Completed after deadline</div>
                </div>
                <div className="bg-zinc-900/80 border border-red-500/20 rounded-2xl p-6 backdrop-blur-xl">
                  <div className="text-sm text-gray-400 mb-2">Failed/Missed</div>
                  <div className="text-3xl font-bold text-red-400">{failedCount}</div>
                  <div className="text-xs text-gray-500 mt-2">Not completed</div>
                </div>
                <div className="bg-zinc-900/80 border border-cyan-500/20 rounded-2xl p-6 backdrop-blur-xl">
                  <div className="text-sm text-gray-400 mb-2">Success Rate</div>
                  <div className="text-3xl font-bold text-cyan-400">{successRate}%</div>
                  <div className="text-xs text-gray-500 mt-2">On-time completion rate</div>
                </div>
              </div>

              {/* Past Deadlines List */}
              <div className="bg-zinc-900/80 border border-orange-500/20 rounded-2xl p-6 backdrop-blur-xl">
                <h3 className="text-lg font-semibold text-white mb-4">Past Deadlines Status</h3>
                <div className="space-y-3">
                  {pastDeadlines.length === 0 ? (
                    <p className="text-gray-400 text-sm">No past deadlines</p>
                  ) : (
                    pastDeadlines.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()).map((deadline) => {
                      const isDueDate = new Date(deadline.dueDate)
                      const isCompleted = deadline.status === 'completed'
                      const isOnTime = isCompleted && new Date(deadline.completedAt || 0) <= isDueDate
                      const isLate = isCompleted && new Date(deadline.completedAt || 0) > isDueDate
                      const isFailed = !isCompleted

                      let statusBg = ''
                      let statusIcon = ''
                      let statusText = ''

                      if (isOnTime) {
                        statusBg = 'bg-green-500/20 border-green-500/30'
                        statusIcon = '✓'
                        statusText = 'On Time'
                      } else if (isLate) {
                        statusBg = 'bg-orange-500/20 border-orange-500/30'
                        statusIcon = '⚠'
                        statusText = 'Late'
                      } else if (isFailed) {
                        statusBg = 'bg-red-500/20 border-red-500/30'
                        statusIcon = '✕'
                        statusText = 'Failed'
                      }

                      return (
                        <div key={deadline.id} className={`border rounded-lg p-4 flex justify-between items-center ${statusBg}`}>
                          <div>
                            <p className="text-white font-medium">{deadline.title}</p>
                            <p className="text-gray-400 text-sm">Due: {formatDateDMY(deadline.dueDate)} at {deadline.hasTime ? formatTimeHM(deadline.dueDate) : '--:--'}</p>
                          </div>
                          <div className="text-right">
                            <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold text-white bg-black/30">
                              {statusIcon} {statusText}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
