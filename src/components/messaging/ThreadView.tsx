import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ThreadMessage {
  id: string;
  content: string;
  sender_name: string;
  sender_avatar?: string;
  created_at: string;
}

interface ThreadViewProps {
  parentMessage: ThreadMessage;
  replies: ThreadMessage[];
  onClose: () => void;
  onSendReply: (content: string) => void;
  isLoading?: boolean;
}

export function ThreadView({
  parentMessage,
  replies,
  onClose,
  onSendReply,
  isLoading = false,
}: ThreadViewProps) {
  const [replyText, setReplyText] = useState('');

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    onSendReply(replyText);
    setReplyText('');
  };

  return (
    <Card className="flex flex-col h-full bg-card border-l">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Thread</span>
          <span className="text-xs text-muted-foreground">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Parent Message */}
        <div className="pb-4 border-b">
          <div className="flex gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={parentMessage.sender_avatar} />
              <AvatarFallback>{parentMessage.sender_name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{parentMessage.sender_name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(parentMessage.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-foreground mt-1 break-words">
                {parentMessage.content}
              </p>
            </div>
          </div>
        </div>

        {/* Replies */}
        {replies.length > 0 ? (
          <div className="space-y-3">
            {replies.map((reply) => (
              <div key={reply.id} className="flex gap-3">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={reply.sender_avatar} />
                  <AvatarFallback>{reply.sender_name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">{reply.sender_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(reply.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-0.5 break-words">
                    {reply.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No replies yet</p>
          </div>
        )}
      </div>

      {/* Reply Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Reply in thread..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendReply();
              }
            }}
            className="flex-1 px-3 py-2 text-sm bg-input border border-input rounded-md placeholder-muted-foreground"
            disabled={isLoading}
          />
          <Button
            size="sm"
            onClick={handleSendReply}
            disabled={!replyText.trim() || isLoading}
          >
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
}
