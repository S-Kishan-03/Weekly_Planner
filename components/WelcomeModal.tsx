import React, { useState } from 'react';

interface WelcomeModalProps {
  isOpen: boolean;
  onNameSubmit: (name: string) => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onNameSubmit }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onNameSubmit(name.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm text-center p-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Welcome to Zenith Planner!</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">What should we call you?</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 text-center text-lg"
            placeholder="Enter your name"
            required
            aria-label="Your Name"
          />
          <button
            type="submit"
            className="mt-6 w-full px-4 py-2 text-base font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
          >
            Get Started
          </button>
        </form>
      </div>
    </div>
  );
};