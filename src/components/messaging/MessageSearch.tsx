import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  content: string;
  sender_name: string;
  created_at: string;
  rank?: number;
}

interface MessageSearchProps {
  onSearch: (query: string) => Promise<Message[]>;
  onSelect: (message: Message) => void;
  isLoading?: boolean;
}

export function MessageSearch({ onSearch, onSelect, isLoading = false }: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await onSearch(searchQuery);
      setResults(searchResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            className="pl-10"
            disabled={isLoading || isSearching}
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => {
                setQuery('');
                setResults([]);
                setShowResults(false);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    onSelect(result);
                    setQuery('');
                    setResults([]);
                    setShowResults(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-accent transition-colors"
                >
                  <div className="text-sm font-medium text-foreground">{result.sender_name}</div>
                  <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {result.content}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(result.created_at).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No messages found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
