import React, { useState } from 'react';
import { FileText, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category?: string;
  shortcut?: string;
  is_favorite?: boolean;
}

interface CannedResponsesProps {
  responses: CannedResponse[];
  onSelect: (response: CannedResponse) => void;
  onDelete?: (id: string) => Promise<void>;
  onToggleFavorite?: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export function CannedResponses({
  responses,
  onSelect,
  onDelete,
  onToggleFavorite,
  isLoading = false,
}: CannedResponsesProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!responses || responses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No canned responses yet</p>
      </div>
    );
  }

  const favorites = responses.filter((r) => r.is_favorite);
  const others = responses.filter((r) => !r.is_favorite);

  return (
    <div className="space-y-4">
      {/* Favorites */}
      {favorites.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">FAVORITES</h3>
          <div className="space-y-2">
            {favorites.map((response) => (
              <CannedResponseCard
                key={response.id}
                response={response}
                isExpanded={expandedId === response.id}
                onExpand={() => setExpandedId(expandedId === response.id ? null : response.id)}
                onSelect={onSelect}
                onDelete={onDelete}
                onToggleFavorite={onToggleFavorite}
                isLoading={isLoading}
              />
            ))}
          </div>
        </div>
      )}

      {/* Others */}
      {others.length > 0 && (
        <div>
          {favorites.length > 0 && <div className="my-2" />}
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">ALL RESPONSES</h3>
          <div className="space-y-2">
            {others.map((response) => (
              <CannedResponseCard
                key={response.id}
                response={response}
                isExpanded={expandedId === response.id}
                onExpand={() => setExpandedId(expandedId === response.id ? null : response.id)}
                onSelect={onSelect}
                onDelete={onDelete}
                onToggleFavorite={onToggleFavorite}
                isLoading={isLoading}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CannedResponseCard({
  response,
  isExpanded,
  onExpand,
  onSelect,
  onDelete,
  onToggleFavorite,
  isLoading,
}: {
  response: CannedResponse;
  isExpanded: boolean;
  onExpand: () => void;
  onSelect: (response: CannedResponse) => void;
  onDelete?: (id: string) => Promise<void>;
  onToggleFavorite?: (id: string) => Promise<void>;
  isLoading: boolean;
}) {
  return (
    <Card className="p-3">
      <button
        onClick={onExpand}
        className="w-full text-left hover:opacity-80 transition-opacity"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-medium">{response.title}</h4>
            {response.shortcut && (
              <span className="text-xs text-muted-foreground">{response.shortcut}</span>
            )}
          </div>
          {response.category && (
            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
              {response.category}
            </span>
          )}
        </div>

        {isExpanded && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {response.content}
            </p>
          </div>
        )}
      </button>

      <div className="flex gap-2 mt-2 justify-between">
        <Button
          size="sm"
          variant="default"
          onClick={() => onSelect(response)}
          disabled={isLoading}
        >
          <Copy className="w-3 h-3 mr-1" />
          Use
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              •••
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onToggleFavorite && (
              <DropdownMenuItem
                onClick={() => onToggleFavorite(response.id)}
                disabled={isLoading}
              >
                {response.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(response.id)}
                disabled={isLoading}
                className="text-red-600"
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
