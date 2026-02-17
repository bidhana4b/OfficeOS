import { useState, useEffect, useCallback } from 'react';
import { ClientList } from './ClientList';
import { ClientProfile } from './ClientProfile';
import { ActivityTimeline } from './ActivityTimeline';
import { ClientPerformancePanel } from './ClientPerformancePanel';
import { mockClients, mockActivities, mockPerformance } from './mock-data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { X, Plus, UserPlus } from 'lucide-react';
import { useClients, useClientActivities, useClientPerformance } from '@/hooks/useClients';
import { createClient, updateClient, deleteClient, subscribeToTable } from '@/lib/data-service';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ClientHub() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    business_name: '',
    category: 'Other',
    location: '',
    contact_email: '',
    contact_phone: '',
  });
  const [creating, setCreating] = useState(false);

  // Supabase data with mock fallbacks
  const clientsQuery = useClients();
  const activitiesQuery = useClientActivities(selectedClientId || undefined);
  const performanceQuery = useClientPerformance(selectedClientId || '');

  const clients = clientsQuery.data.length > 0 ? clientsQuery.data : mockClients;
  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const clientActivities = activitiesQuery.data.length > 0
    ? activitiesQuery.data
    : mockActivities.filter((a) => a.clientId === selectedClientId);
  const clientPerformance = performanceQuery.data || (selectedClientId ? mockPerformance[selectedClientId] : null);

  // Real-time subscription for clients
  useEffect(() => {
    const unsubscribe = subscribeToTable('clients', () => {
      clientsQuery.refetch();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientsQuery.refetch]);

  // Real-time subscription for activities
  useEffect(() => {
    const unsubscribe = subscribeToTable('activities', () => {
      activitiesQuery.refetch();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId, activitiesQuery.refetch]);

  const handleCreateClient = useCallback(async () => {
    if (!newClientForm.business_name.trim()) return;
    setCreating(true);
    try {
      const newClient = await createClient(newClientForm);
      setShowCreateDialog(false);
      setNewClientForm({ business_name: '', category: 'Other', location: '', contact_email: '', contact_phone: '' });
      await clientsQuery.refetch();
      // Auto-select the new client
      if (newClient?.id) {
        setSelectedClientId(newClient.id);
      }
    } catch (err) {
      console.error('Failed to create client:', err);
    } finally {
      setCreating(false);
    }
  }, [newClientForm, clientsQuery]);

  return (
    <div className="flex h-screen bg-[#0A0E27]">
      {/* Left Sidebar - Client List */}
      <div className="w-80 border-r border-white/10 bg-[#0F1419]/80 backdrop-blur-xl flex flex-col">
        <div className="p-3 border-b border-white/10 flex items-center justify-between">
          <span className="font-display font-bold text-sm text-white/70">Clients</span>
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="bg-titan-cyan/20 hover:bg-titan-cyan/30 text-titan-cyan border border-titan-cyan/30 h-7 px-2 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ClientList
            clients={clients}
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
          />
        </div>
      </div>

      {/* Create Client Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#1A1D2E] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-titan-cyan">Add New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/60 text-xs">Business Name *</Label>
              <Input
                value={newClientForm.business_name}
                onChange={(e) => setNewClientForm((f) => ({ ...f, business_name: e.target.value }))}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="e.g. Apex Motors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/60 text-xs">Category</Label>
                <select
                  value={newClientForm.category}
                  onChange={(e) => setNewClientForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full mt-1 h-9 rounded-md bg-white/5 border border-white/10 text-white text-sm px-3"
                >
                  <option value="Other">Other</option>
                  <option value="Motorcycle Dealer">Motorcycle Dealer</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Corporate">Corporate</option>
                  <option value="E-Commerce">E-Commerce</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                </select>
              </div>
              <div>
                <Label className="text-white/60 text-xs">Location</Label>
                <Input
                  value={newClientForm.location}
                  onChange={(e) => setNewClientForm((f) => ({ ...f, location: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white mt-1"
                  placeholder="Dhaka, Bangladesh"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/60 text-xs">Email</Label>
                <Input
                  value={newClientForm.contact_email}
                  onChange={(e) => setNewClientForm((f) => ({ ...f, contact_email: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white mt-1"
                  placeholder="info@example.com"
                />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Phone</Label>
                <Input
                  value={newClientForm.contact_phone}
                  onChange={(e) => setNewClientForm((f) => ({ ...f, contact_phone: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white mt-1"
                  placeholder="+880 1711-000000"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)} className="text-white/60">
              Cancel
            </Button>
            <Button
              onClick={handleCreateClient}
              disabled={creating || !newClientForm.business_name.trim()}
              className="bg-titan-cyan/20 hover:bg-titan-cyan/30 text-titan-cyan border border-titan-cyan/30"
            >
              {creating ? 'Creating...' : 'Create Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {selectedClient ? (
          <>
            {/* Header */}
            <div className="h-16 border-b border-white/10 bg-[#0F1419]/80 backdrop-blur-xl flex items-center justify-between px-6">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedClient.businessName}</h2>
                <p className="text-sm text-white/60">{selectedClient.category}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedClientId(null)}
                className="text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content Tabs */}
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="overview" className="h-full flex flex-col">
                <TabsList className="border-b border-white/10 bg-transparent rounded-none px-6">
                  <TabsTrigger
                    value="overview"
                    className="data-[state=active]:bg-[#00D9FF]/10 data-[state=active]:text-[#00D9FF] data-[state=active]:border-b-2 data-[state=active]:border-[#00D9FF]"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="data-[state=active]:bg-[#FF006E]/10 data-[state=active]:text-[#FF006E] data-[state=active]:border-b-2 data-[state=active]:border-[#FF006E]"
                  >
                    Activity
                  </TabsTrigger>
                  {clientPerformance && (
                    <TabsTrigger
                      value="performance"
                      className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] data-[state=active]:border-b-2 data-[state=active]:border-[#39FF14]"
                    >
                      Performance
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="overview" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full">
                    <div className="p-6">
                      <ClientProfile client={selectedClient} onRefresh={clientsQuery.refetch} />
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="activity" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full">
                    <div className="p-6">
                      <ActivityTimeline activities={clientActivities} />
                    </div>
                  </ScrollArea>
                </TabsContent>

                {clientPerformance && (
                  <TabsContent value="performance" className="flex-1 overflow-hidden m-0">
                    <ScrollArea className="h-full">
                      <div className="p-6">
                        <ClientPerformancePanel performance={clientPerformance} />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#00D9FF]/10 border border-[#00D9FF]/30 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-[#00D9FF]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Select a Client</h3>
              <p className="text-white/60 text-sm max-w-md">
                Choose a client from the list to view their profile, activity timeline, and
                performance metrics
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
