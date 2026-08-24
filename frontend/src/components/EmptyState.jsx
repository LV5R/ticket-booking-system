import { FolderX } from 'lucide-react';

export default function EmptyState({ title, message, icon: Icon = FolderX }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in duration-500">
      <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-full mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
        <Icon className="w-16 h-16 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-md text-lg">{message}</p>
    </div>
  );
}
