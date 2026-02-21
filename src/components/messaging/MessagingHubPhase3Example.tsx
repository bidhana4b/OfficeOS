import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  TypingIndicator, 
  ReadReceipt, 
  MessageSearch, 
  ThreadView, 
  CannedResponses 
} from '@/components/messaging';
import {
  sendTypingIndicator,
  clearTypingIndicator,
  subscribeToTypingIndicators,
  markMessageAsReadV2,
  searchMessages,
  createThreadReply,
  getThreadReplies,
  saveDraftMessage,
  getDraftMessage,
  getCannedResponses,
} from '@/lib/data-service';

/**
 * EXAMPLE: Enhanced MessagingHub with Phase 3 Features
 * This shows how to integrate all new Phase 3 components
 */
export function MessagingHubWithPhase3Enhancements() {
  // Existing state
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');

  // Phase 3: New state
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [threadReplies, setThreadReplies] = useState<any[]>([]);
  const [cannedResponses, setCannedResponses] = useState<any[]>([]);
  const [draftMessage, setDraftMessage] = useState<string>('');
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // ====== Phase 3: Initialize ======
  useEffect(() => {
    if (!activeWorkspace) return;

    // Load canned responses once per workspace
    const loadResponses = async () => {
      try {
        const responses = await getCannedResponses(activeWorkspace.id);
        setCannedResponses(responses);
      } catch (error) {
        console.error('Failed to load canned responses:', error);
      }
    };

    loadResponses();
  }, [activeWorkspace]);

  // ====== Phase 3: Typing Indicators ======
  useEffect(() => {
    if (!activeChannel?.id) return;

    // Subscribe to typing indicators for this channel
    const subscription = subscribeToTypingIndicators(
      activeChannel.id,
      (users) => {
        // Filter out current user
        const othersTyping = users.filter(uid => uid !== currentUser?.id);
        setTypingUsers(othersTyping);
      }
    );

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, [activeChannel?.id, currentUser?.id]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setInputValue(value);

    // Broadcast typing status (debounced)
    if (value.trim() && activeChannel?.id && currentUser?.id) {
      sendTypingIndicator(
        activeChannel.id,
        currentUser.id,
        activeWorkspace?.id || ''
      ).catch(err => console.error('Failed to send typing indicator:', err));

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Clear typing status after inactivity
      typingTimeoutRef.current = setTimeout(() => {
        clearTypingIndicator(activeChannel.id, currentUser.id)
          .catch(err => console.error('Failed to clear typing indicator:', err));
      }, 3000);
    }
  }, [activeChannel?.id, currentUser?.id, activeWorkspace?.id]);

  // ====== Phase 3: Read Receipts ======
  useEffect(() => {
    if (!activeChannel?.id || !currentUser?.id) return;

    // Mark all visible messages as read
    messages.forEach(msg => {
      if (msg.sender_id !== currentUser.id) {
        markMessageAsReadV2(msg.id, currentUser.id, activeChannel.id)
          .catch(err => console.warn('Failed to mark read:', err));
      }
    });
  }, [messages, activeChannel?.id, currentUser?.id]);

  // ====== Phase 3: Draft Messages ======
  useEffect(() => {
    if (!activeChannel?.id || !currentUser?.id) return;

    // Load draft for this channel
    const loadDraft = async () => {
      try {
        const draft = await getDraftMessage(activeChannel.id, currentUser.id);
        if (draft?.content) {
          setInputValue(draft.content);
          setDraftMessage(draft.content);
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    };

    loadDraft();

    // Return cleanup: save draft on unmount
    return () => {
      if (inputValue.trim() && inputValue !== draftMessage) {
        saveDraftMessage(
          activeChannel.id,
          currentUser.id,
          inputValue,
          null // Could track reply_to_id here
        ).catch(err => console.warn('Failed to save draft:', err));
      }
    };
  }, [activeChannel?.id, currentUser?.id]);

  // Debounce draft saving during typing
  const handleDraftSave = useCallback(() => {
    if (!activeChannel?.id || !currentUser?.id) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (inputValue.trim()) {
        saveDraftMessage(
          activeChannel.id,
          currentUser.id,
          inputValue,
          null
        ).catch(err => console.warn('Failed to save draft:', err));
      }
    }, 2000); // Save 2 seconds after last keystroke
  }, [activeChannel?.id, currentUser?.id, inputValue]);

  // ====== Phase 3: Thread Support ======
  const handleOpenThread = async (message: any) => {
    setSelectedThread(message);
    setIsThreadLoading(true);

    try {
      const replies = await getThreadReplies(message.id);
      setThreadReplies(replies);
    } catch (error) {
      console.error('Failed to load thread replies:', error);
      setThreadReplies([]);
    } finally {
      setIsThreadLoading(false);
    }
  };

  const handleSendThreadReply = async (content: string) => {
    if (!selectedThread || !activeChannel?.id || !currentUser?.id) return;

    try {
      // This would be handled by your sendMessage function that creates
      // the message and then links it to thread
      // For now, just link it
      await createThreadReply(
        selectedThread.id,
        selectedThread.id, // Would be new message ID
        activeChannel.id
      );

      // Reload thread replies
      const replies = await getThreadReplies(selectedThread.id);
      setThreadReplies(replies);
    } catch (error) {
      console.error('Failed to send thread reply:', error);
    }
  };

  // ====== Phase 3: Message Search ======
  const handleSearchMessage = async (query: string) => {
    if (!activeChannel?.id) return;

    try {
      const results = await searchMessages(activeChannel.id, query);
      return results;
    } catch (error) {
      console.error('Failed to search messages:', error);
      return [];
    }
  };

  const handleSearchResultSelect = (message: any) => {
    // Scroll to and highlight the message
    const messageEl = document.getElementById(`message-${message.id}`);
    if (messageEl) {
      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageEl.classList.add('highlight');
      setTimeout(() => messageEl.classList.remove('highlight'), 3000);
    }
  };

  // ====== Phase 3: Canned Responses ======
  const handleInsertCannedResponse = (response: any) => {
    // Insert canned response text at cursor position
    const currentText = inputValue;
    const newText = `${currentText}${currentText ? '\n' : ''}${response.content}`;
    setInputValue(newText);
    handleDraftSave();
    inputRef.current?.focus();
  };

  // ====== Render ======
  return (
    <div className="flex h-full gap-4 p-4">
      {/* Main Message Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-2">
          {messages.map(msg => (
            <div key={msg.id} id={`message-${msg.id}`} className="flex gap-2 hover:bg-accent p-2 rounded">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{msg.sender_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm">{msg.content}</p>
              </div>
              {/* Phase 3: Read receipts for this message */}
              <div className="flex gap-2">
                <button onClick={() => handleOpenThread(msg)} title="Reply in thread">
                  💬
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Phase 3: Typing Indicator */}
        {typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}

        {/* Input Area */}
        <div className="border-t pt-4 space-y-2">
          {/* Search and Quick Responses */}
          <div className="flex gap-2">
            <div className="flex-1">
              <MessageSearch 
                onSearch={handleSearchMessage}
                onSelect={handleSearchResultSelect}
              />
            </div>

            {/* Quick Responses */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Templates
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h3 className="font-semibold">Quick Responses</h3>
                  <CannedResponses 
                    responses={cannedResponses}
                    onSelect={handleInsertCannedResponse}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Message Input */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                handleInputChange(e);
                handleDraftSave();
              }}
              placeholder="Type message..."
              className="flex-1 px-3 py-2 border rounded-md"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  // handleSendMessage(inputValue);
                }
              }}
            />
            <Button>Send</Button>
          </div>
        </div>
      </div>

      {/* Phase 3: Thread Sidebar */}
      {selectedThread && (
        <div className="w-80 border-l">
          <ThreadView 
            parentMessage={selectedThread}
            replies={threadReplies}
            onSendReply={handleSendThreadReply}
            onClose={() => setSelectedThread(null)}
            isLoading={isThreadLoading}
          />
        </div>
      )}
    </div>
  );
}

export default MessagingHubWithPhase3Enhancements;
