import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { DailyView } from './components/DailyView';
import { MonthlyView } from './components/MonthlyView';
import { ReportsView } from './components/ReportsView';
import { RewardsView } from './components/RewardsView';
import { NotesView } from './components/NotesView';
import { SettingsView } from './components/SettingsView';
import { AddTaskModal } from './components/AddTaskModal';
import { AddNoteModal } from './components/AddNoteModal';
import { PlanDayModal } from './components/PlanDayModal';
import { WelcomeModal } from './components/WelcomeModal';
import { Task, UserProfile, CustomReward, View, Note } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { INITIAL_TASKS, INITIAL_PROFILE, INITIAL_REWARDS, INITIAL_NOTES } from './constants';
import { PlusCircleIcon } from './components/Icon';

type Theme = 'light' | 'dark';

// Helper function to determine if a task should appear on a given date
const isTaskOnDate = (task: Task, date: Date): boolean => {
  const taskDate = new Date(task.dueDate);
  const checkDate = new Date(date);

  // Normalize dates to midnight to compare days only
  taskDate.setHours(0, 0, 0, 0);
  checkDate.setHours(0, 0, 0, 0);

  if (taskDate > checkDate) {
    return false; // Task starts in the future
  }

  switch (task.repeat) {
    case 'none':
      return taskDate.getTime() === checkDate.getTime();
    case 'daily':
      return true;
    case 'weekly':
      return taskDate.getDay() === checkDate.getDay();
    case 'monthly':
      return taskDate.getDate() === checkDate.getDate();
    default:
      return false;
  }
};


const App: React.FC = () => {
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', INITIAL_TASKS);
  const [notes, setNotes] = useLocalStorage<Note[]>('notes', INITIAL_NOTES);
  const [userProfile, setUserProfile] = useLocalStorage<UserProfile>('userProfile', INITIAL_PROFILE);
  const [customRewards, setCustomRewards] = useLocalStorage<CustomReward[]>('customRewards', INITIAL_REWARDS);
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'light');
  const [apiKey, setApiKey] = useLocalStorage<string>('gemini-api-key', '');
  const [dailyPlan, setDailyPlan] = useLocalStorage<{ date: string; taskIds: string[] }>('dailyPlan', { date: '', taskIds: [] });

  const [activeView, setActiveView] = useState<View>('dashboard');
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [isPlanDayModalOpen, setIsPlanDayModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  
  const reminderTimers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
  }, [theme]);

  const checkStreaks = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (userProfile.lastCompletedDate) {
      const lastCompleted = new Date(userProfile.lastCompletedDate);
      if (lastCompleted.getTime() < yesterday.getTime()) {
        setUserProfile(prev => ({ ...prev, streak: 0 }));
      }
    }
  }, [userProfile.lastCompletedDate, setUserProfile]);

  useEffect(() => {
    checkStreaks();
    
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
        setIsWelcomeModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Clear previous timers before setting new ones
    reminderTimers.current.forEach(clearTimeout);
    reminderTimers.current.clear();
    
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    const datesToCheck = [today, tomorrow];

    tasks.forEach(task => {
        if (!task.reminder || task.reminder <= 0) return;

        datesToCheck.forEach(date => {
            if (isTaskOnDate(task, date)) {
                const now = new Date();
                const originalTime = new Date(task.dueDate);
                const occurrenceDueDate = new Date(date);
                occurrenceDueDate.setHours(originalTime.getHours(), originalTime.getMinutes());
                
                const reminderTime = new Date(occurrenceDueDate.getTime() - (task.reminder * 60 * 1000));
                
                const occurrenceDateString = date.toISOString().split('T')[0];
                const isCompleted = task.completedDates.includes(occurrenceDateString);

                if (!isCompleted && reminderTime > now) {
                    const delay = reminderTime.getTime() - now.getTime();
                    const timerKey = `${task.id}-${occurrenceDateString}`;
                    
                    if (reminderTimers.current.has(timerKey)) return;

                    const timerId = setTimeout(() => {
                        alert(`Reminder: "${task.title}" is scheduled to start in ${task.reminder} minutes.`);
                        reminderTimers.current.delete(timerKey);
                    }, delay);
                    reminderTimers.current.set(timerKey, timerId as unknown as number);
                }
            }
        });
    });

    return () => {
        reminderTimers.current.forEach(clearTimeout);
        reminderTimers.current.clear();
    };
  }, [tasks]);

  // Welcome modal handler
  const handleNameUpdate = (name: string) => {
    setUserProfile(prev => ({ ...prev, name }));
    localStorage.setItem('hasVisited', 'true');
    setIsWelcomeModalOpen(false);
  };

  // Task Handlers
  const handleAddTask = (task: Omit<Task, 'id' | 'completedDates'>) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      completedDates: [],
    };
    setTasks(prev => [...prev, newTask].sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
    setIsTaskModalOpen(false);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(task => (task.id === updatedTask.id ? updatedTask : task)));
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };
  
  const handleOpenEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const handleCompleteTask = (taskId: string, completionDate: Date) => {
    const completionDateString = completionDate.toISOString().split('T')[0]; // 'YYYY-MM-DD'

    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;
    
    const isAlreadyCompleted = taskToUpdate.completedDates.includes(completionDateString);

    if (isAlreadyCompleted) {
        // Un-complete: For simplicity, we'll just remove the completion date and not adjust points/streak.
        setTasks(prevTasks =>
            prevTasks.map(task =>
                task.id === taskId
                    ? { ...task, completedDates: task.completedDates.filter(d => d !== completionDateString) }
                    : task
            )
        );
    } else {
        // Complete: Add date and award points
        let pointsEarned = 10; // Base points
        if (taskToUpdate.criticality === 'urgent') pointsEarned += 15;
        if (taskToUpdate.criticality === 'high') pointsEarned += 10;
        if (taskToUpdate.criticality === 'medium') pointsEarned += 5;

        setTasks(prevTasks =>
            prevTasks.map(task =>
                task.id === taskId
                    ? { ...task, completedDates: [...task.completedDates, completionDateString] }
                    : task
            )
        );

        // Update user profile with points and streak
        const today = completionDate;
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString();

        setUserProfile(prev => {
            const lastCompleted = prev.lastCompletedDate ? new Date(prev.lastCompletedDate) : null;
            let newStreak = prev.streak;

            if (!lastCompleted || lastCompleted.getTime() < today.getTime()) {
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                
                newStreak = (lastCompleted && lastCompleted.getTime() === yesterday.getTime()) ? newStreak + 1 : 1;
            }

            return { ...prev, points: prev.points + pointsEarned, streak: newStreak, lastCompletedDate: todayString };
        });
        }
  };
  
  // Note Handlers
  const handleAddNote = (note: Omit<Note, 'id' | 'createdAt'>) => {
    const newNote: Note = {
        ...note,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
    };
    setNotes(prev => [newNote, ...prev]);
    setIsNoteModalOpen(false);
  };

  const handleUpdateNote = (updatedNote: Note) => {
    setNotes(prev => prev.map(note => note.id === updatedNote.id ? updatedNote : note));
    setIsNoteModalOpen(false);
    setEditingNote(null);
  };

  const handleOpenEditNoteModal = (note: Note) => {
    setEditingNote(note);
    setIsNoteModalOpen(true);
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
  };

  // Reward Handlers
  const handleAddReward = (reward: Omit<CustomReward, 'id'>) => {
    const newReward: CustomReward = { ...reward, id: Date.now().toString() };
    setCustomRewards(prev => [...prev, newReward]);
  };

  const handleRedeemReward = (rewardId: string) => {
    const reward = customRewards.find(r => r.id === rewardId);
    if (reward && userProfile.points >= reward.cost) {
      setUserProfile(prev => ({ ...prev, points: prev.points - reward.cost }));
      setCustomRewards(prev => prev.filter(r => r.id !== rewardId));
    } else {
      alert("Not enough points!");
    }
  };

  // "Plan My Day" Handlers
  const tasksToPlan = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    return tasks.filter(task => {
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const isCompletedToday = task.completedDates.includes(todayString);
        
        if (isCompletedToday && task.repeat !== 'daily') return false;
        if (task.repeat === 'none' && task.completedDates.length > 0) return false;

        // Check if task is recurring and if an occurrence is on this day
        if (task.repeat !== 'none') {
            const start = new Date(task.dueDate);
            start.setHours(0, 0, 0, 0);
            if (start > today) return false;

            if (task.repeat === 'weekly' && start.getDay() !== today.getDay()) return false;
            if (task.repeat === 'monthly' && start.getDate() !== today.getDate()) return false;

            return true;
        }

        return dueDate <= today;
    }).sort((a, b) => {
        const aDueDate = new Date(a.dueDate);
        const bDueDate = new Date(b.dueDate);
        aDueDate.setHours(0,0,0,0);
        bDueDate.setHours(0,0,0,0);

        if (aDueDate.getTime() < bDueDate.getTime()) return -1; // Overdue first
        if (aDueDate.getTime() > bDueDate.getTime()) return 1;
        
        return a.criticality.localeCompare(b.criticality); // Then by criticality
    });
  }, [tasks]);

  const handleFinishPlanning = (actions: { committed: string[], updated: Task[], deleted: string[] }) => {
    const todayString = new Date().toISOString().split('T')[0];

    setTasks(currentTasks => {
        let newTasks = [...currentTasks];
        newTasks = newTasks.filter(t => !actions.deleted.includes(t.id));
        actions.updated.forEach(updatedTask => {
            const index = newTasks.findIndex(t => t.id === updatedTask.id);
            if (index !== -1) {
                newTasks[index] = updatedTask;
            }
        });
        return newTasks;
    });

    setDailyPlan({ date: todayString, taskIds: actions.committed });
    setUserProfile(prev => ({ ...prev, lastPlannedDate: todayString }));
    setIsPlanDayModalOpen(false);
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView 
                    tasks={tasks} 
                    onCompleteTask={handleCompleteTask} 
                    onDeleteTask={handleDeleteTask} 
                    onEditTask={handleOpenEditTaskModal}
                    userProfile={userProfile}
                    dailyPlan={dailyPlan}
                    onStartPlanning={() => setIsPlanDayModalOpen(true)}
                />;
      case 'daily':
        return <DailyView tasks={tasks} onCompleteTask={handleCompleteTask} onDeleteTask={handleDeleteTask} onEditTask={handleOpenEditTaskModal} onUpdateTask={handleUpdateTask} />;
      case 'monthly':
        return <MonthlyView tasks={tasks} />;
      case 'reports':
        return <ReportsView tasks={tasks} />;
      case 'rewards':
        return (
          <RewardsView
            userProfile={userProfile}
            customRewards={customRewards}
            onAddReward={handleAddReward}
            onRedeemReward={handleRedeemReward}
          />
        );
      case 'notes':
        return (
            <NotesView 
                notes={notes}
                onAddNote={() => { setEditingNote(null); setIsNoteModalOpen(true); }}
                onEditNote={handleOpenEditNoteModal}
                onDeleteNote={handleDeleteNote}
            />
        );
      case 'settings':
        return <SettingsView apiKey={apiKey} setApiKey={setApiKey} />;
      default:
        return <DashboardView 
                    tasks={tasks} 
                    onCompleteTask={handleCompleteTask} 
                    onDeleteTask={handleDeleteTask} 
                    onEditTask={handleOpenEditTaskModal}
                    userProfile={userProfile}
                    dailyPlan={dailyPlan}
                    onStartPlanning={() => setIsPlanDayModalOpen(true)}
                />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
      <Header 
        activeView={activeView} 
        setActiveView={setActiveView} 
        userProfile={userProfile}
        theme={theme}
        setTheme={setTheme}
      />
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {renderView()}
      </main>
      <button
        onClick={() => {
          setEditingTask(null);
          setIsTaskModalOpen(true);
        }}
        className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-110 dark:focus:ring-offset-gray-900"
        aria-label="Add new task"
      >
        <PlusCircleIcon className="h-8 w-8" />
      </button>
      {isTaskModalOpen && (
        <AddTaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setEditingTask(null);
          }}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          editingTask={editingTask}
          apiKey={apiKey}
        />
      )}
      {isNoteModalOpen && (
        <AddNoteModal
            isOpen={isNoteModalOpen}
            onClose={() => {
                setIsNoteModalOpen(false);
                setEditingNote(null);
            }}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            editingNote={editingNote}
        />
      )}
      {isPlanDayModalOpen && (
        <PlanDayModal
            isOpen={isPlanDayModalOpen}
            onClose={() => setIsPlanDayModalOpen(false)}
            tasksToPlan={tasksToPlan}
            onFinishPlanning={handleFinishPlanning}
        />
      )}
       {isWelcomeModalOpen && (
        <WelcomeModal
            isOpen={isWelcomeModalOpen}
            onNameSubmit={handleNameUpdate}
        />
      )}
    </div>
  );
};

export default App;