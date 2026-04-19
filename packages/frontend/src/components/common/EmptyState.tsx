interface EmptyStateProps { icon?: string; title: string; description?: string; action?: React.ReactNode; }

import React from 'react';

export default function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
      {description && <p className="text-gray-500 text-sm max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  );
}
