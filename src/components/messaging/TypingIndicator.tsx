import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';

interface TypingIndicatorProps {
  users: string[];
  maxDisplay?: number;
}

export function TypingIndicator({ users, maxDisplay = 3 }: TypingIndicatorProps) {
  if (!users || users.length === 0) return null;

  const displayUsers = users.slice(0, maxDisplay);
  const moreCount = users.length - maxDisplay;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>
        {displayUsers.join(', ')}
        {moreCount > 0 ? ` +${moreCount} more` : ''} {users.length === 1 ? 'is' : 'are'} typing...
      </span>
    </div>
  );
}
