import React from 'react';
import { CheckCheck } from 'lucide-react';

interface ReadReceiptProps {
  readers: Array<{
    id: string;
    name: string;
    avatar?: string;
    readAt: Date;
  }>;
  size?: 'sm' | 'md';
}

export function ReadReceipt({ readers, size = 'sm' }: ReadReceiptProps) {
  if (!readers || readers.length === 0) return null;

  const sizeClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-1 group">
      <CheckCheck className={`${sizeClass} text-blue-500`} />
      {readers.length > 0 && (
        <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 bg-popover border rounded-md shadow-lg p-2 min-w-max z-50">
          <div className="text-xs font-medium mb-1 text-foreground">Read by:</div>
          {readers.map((reader) => (
            <div key={reader.id} className="text-xs text-muted-foreground mb-0.5">
              {reader.name} - {new Date(reader.readAt).toLocaleTimeString()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
