import React, { useState } from 'react';
import { Task } from '../types';
import { CATEGORY_COLORS, CRITICALITY_COLORS } from '../constants';
import { XMarkIcon, CheckCircleIcon, ArrowUturnRightIcon, TrashIcon, ArrowRightCircleIcon } from './Icon';

interface PlanDayModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasksToPlan: Task[];
    onFinishPlanning: (actions: { committed: string[]; updated: Task[]; deleted: string[] }) => void;
}

const ActionButton: React.FC<{
    onClick: () => void;
    icon: React.ElementType;
    label: string;
    className: string;
}> = ({ onClick, icon: Icon, label, className }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg transition-all transform hover:scale-105 ${className}`}
    >
        <Icon className="h-6 w-6 sm:h-7 sm:w-7 mb-1" />
        <span className="text-xs sm:text-sm font-semibold">{label}</span>
    </button>
);

export const PlanDayModal: React.FC<PlanDayModalProps> = ({ isOpen, onClose, tasksToPlan, onFinishPlanning }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [actions, setActions] = useState<{ committed: string[]; updated: Task[]; deleted: string[] }>({
        committed: [],
        updated: [],
        deleted: []
    });

    if (!isOpen) return null;

    const currentTask = tasksToPlan[currentIndex];
    const isFinished = currentIndex >= tasksToPlan.length;

    const handleNext = () => {
        setCurrentIndex(currentIndex + 1);
    };

    const handleCommit = () => {
        setActions(prev => ({ ...prev, committed: [...prev.committed, currentTask.id] }));
        handleNext();
    };

    const handleSnooze = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const originalDueDate = new Date(currentTask.dueDate);
        tomorrow.setHours(originalDueDate.getHours(), originalDueDate.getMinutes());

        const updatedTask = { ...currentTask, dueDate: tomorrow.toISOString() };
        setActions(prev => ({ ...prev, updated: [...prev.updated, updatedTask] }));
        handleNext();
    };

    const handleDelete = () => {
        setActions(prev => ({ ...prev, deleted: [...prev.deleted, currentTask.id] }));
        handleNext();
    };

    const handleSkip = () => {
        handleNext();
    };

    const handleFinish = () => {
        onFinishPlanning(actions);
    };

    const progress = tasksToPlan.length > 0 ? ((currentIndex) / tasksToPlan.length) * 100 : 100;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md transform transition-all">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Plan Your Day</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
                        <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>

                    <div className="min-h-[250px] flex flex-col justify-center items-center">
                        {tasksToPlan.length === 0 ? (
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">You're all caught up!</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-2">No overdue or tasks for today to plan.</p>
                                <button onClick={onClose} className="mt-6 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700">
                                    Awesome!
                                </button>
                            </div>
                        ) : isFinished ? (
                             <div className="text-center">
                                <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">You've planned your day!</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-2">You are all set for a productive day.</p>
                                <button onClick={handleFinish} className="mt-6 w-full px-4 py-3 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700">
                                    View My Day
                                </button>
                            </div>
                        ) : (
                            <div className="w-full">
                                <div className="bg-white dark:bg-gray-900/50 p-5 rounded-lg shadow-md border dark:border-gray-700 mb-6">
                                    <p className={`font-bold text-lg text-gray-900 dark:text-gray-100`}>{currentTask.title}</p>
                                    <div className="flex items-center flex-wrap gap-x-3 text-sm text-gray-500 dark:text-gray-400 mt-2">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${CATEGORY_COLORS[currentTask.category]} dark:bg-opacity-20`}>
                                            {currentTask.category}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <div className={`w-3 h-3 rounded-full ${CRITICALITY_COLORS[currentTask.criticality]}`}></div>
                                            <span className="capitalize">{currentTask.criticality}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                        Due: {new Date(currentTask.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                    <ActionButton onClick={handleCommit} icon={CheckCircleIcon} label="Commit" className="bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"/>
                                    <ActionButton onClick={handleSnooze} icon={ArrowUturnRightIcon} label="Snooze" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400"/>
                                    <ActionButton onClick={handleSkip} icon={ArrowRightCircleIcon} label="Later" className="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"/>
                                    <ActionButton onClick={handleDelete} icon={TrashIcon} label="Delete" className="bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"/>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
