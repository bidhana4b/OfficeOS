import { useState } from 'react';
import { Client } from './types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Pause,
  CheckSquare,
  Square
} from 'lucide-react';

interface ClientListProps {
  clients: Client[];
  selectedClientId: string | null;
  onSelectClient: (clientId: string) => void;
  bulkMode?: boolean;
  bulkSelected?: Set<string>;
}

export function ClientList({ clients, selectedClientId, onSelectClient, bulkMode, bulkSelected }: ClientListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Client['status'] | 'all'>('all');

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: Client['status']) => {
    switch (status) {
      case 'active':
        return <TrendingUp className="w-4 h-4 text-[#39FF14]" />;
      case 'at-risk':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'churning':
        return <TrendingDown className="w-4 h-4 text-[#FF006E]" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Client['status']) => {
    switch (status) {
      case 'active':
        return 'bg-[#39FF14]/20 text-[#39FF14] border-[#39FF14]/30';
      case 'at-risk':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'churning':
        return 'bg-[#FF006E]/20 text-[#FF006E] border-[#FF006E]/30';
      case 'paused':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#39FF14]';
    if (score >= 60) return 'text-yellow-400';
    return 'text-[#FF006E]';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-[#00D9FF]" />
          <h3 className="text-lg font-bold text-white">Clients</h3>
          <Badge variant="outline" className="ml-auto border-[#00D9FF]/30 text-[#00D9FF]">
            {filteredClients.length}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#0A0E27]/60 border-white/10 text-white placeholder:text-white/40"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white/40" />
          <div className="flex gap-1 flex-wrap">
            <Button
              size="sm"
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
              className={
                statusFilter === 'all'
                  ? 'bg-[#00D9FF] text-black hover:bg-[#00D9FF]/90'
                  : 'border-white/20 text-white/60 hover:text-white'
              }
            >
              All
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('active')}
              className={
                statusFilter === 'active'
                  ? 'bg-[#39FF14] text-black hover:bg-[#39FF14]/90'
                  : 'border-white/20 text-white/60 hover:text-white'
              }
            >
              Active
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'at-risk' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('at-risk')}
              className={
                statusFilter === 'at-risk'
                  ? 'bg-yellow-500 text-black hover:bg-yellow-500/90'
                  : 'border-white/20 text-white/60 hover:text-white'
              }
            >
              At Risk
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'churning' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('churning')}
              className={
                statusFilter === 'churning'
                  ? 'bg-[#FF006E] text-white hover:bg-[#FF006E]/90'
                  : 'border-white/20 text-white/60 hover:text-white'
              }
            >
              Churning
            </Button>
          </div>
        </div>
      </div>

      {/* Client List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredClients.map((client) => (
            <button
              key={client.id}
              onClick={() => onSelectClient(client.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-300 ${
                !bulkMode && selectedClientId === client.id
                  ? 'bg-[#00D9FF]/10 border-[#00D9FF]/50 shadow-lg shadow-[#00D9FF]/20'
                  : bulkMode && bulkSelected?.has(client.id)
                  ? 'bg-[#FF006E]/10 border-[#FF006E]/40'
                  : 'bg-[#1A1D2E]/60 border-white/10 hover:border-white/30 hover:bg-[#1A1D2E]/80'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                {bulkMode && (
                  <div className="mr-2 mt-0.5">
                    {bulkSelected?.has(client.id) ? (
                      <CheckSquare className="w-4 h-4 text-[#FF006E]" />
                    ) : (
                      <Square className="w-4 h-4 text-white/30" />
                    )}
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-semibold text-white mb-1">{client.businessName}</div>
                  <div className="text-xs text-white/60">{client.category}</div>
                </div>
                <div className={`text-xl font-bold ${getHealthScoreColor(client.healthScore)}`}>
                  {client.healthScore}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(client.status)}
                  <Badge className={getStatusColor(client.status)} style={{ fontSize: '10px' }}>
                    {client.status.toUpperCase()}
                  </Badge>
                </div>
                <Badge variant="outline" className="border-white/20 text-white/60 text-xs">
                  {client.package.type}
                </Badge>
              </div>
            </button>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12 text-white/40">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No clients found</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
