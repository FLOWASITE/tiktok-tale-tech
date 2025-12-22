import React, { useState } from 'react';
import { ChatMessage as ChatMessageType } from '@/hooks/useChat';
import { MemberAvatar } from '@/components/MemberAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Pencil, Trash2, Reply, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessageProps {
  message: ChatMessageType;
  isOnline?: boolean;
  onEdit: (messageId: string, newContent: string) => Promise<boolean>;
  onDelete: (messageId: string) => Promise<boolean>;
  onReply: (message: ChatMessageType) => void;
  replyToMessage?: ChatMessageType | null;
}

export function ChatMessageItem({
  message,
  isOnline = false,
  onEdit,
  onDelete,
  onReply,
  replyToMessage,
}: ChatMessageProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOwn = user?.id === message.sender_id;
  const senderName = message.sender_profile?.full_name || message.sender_profile?.email?.split('@')[0] || 'Unknown';

  const handleSaveEdit = async () => {
    if (editContent.trim() === message.content) {
      setIsEditing(false);
      return;
    }
    const success = await onEdit(message.id, editContent);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await onDelete(message.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div
        className={cn(
          'group flex gap-3 px-4 py-2 hover:bg-muted/30 transition-colors',
          isOwn && 'flex-row-reverse'
        )}
      >
        <MemberAvatar
          avatarUrl={message.sender_profile?.avatar_url}
          name={message.sender_profile?.full_name}
          email={message.sender_profile?.email}
          isOnline={isOnline}
          size="sm"
        />

        <div className={cn('flex-1 min-w-0', isOwn && 'flex flex-col items-end')}>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-sm font-medium', isOwn && 'order-2')}>
              {senderName}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(message.created_at), 'HH:mm', { locale: vi })}
            </span>
            {message.is_edited && (
              <span className="text-xs text-muted-foreground italic">(đã sửa)</span>
            )}
          </div>

          {/* Reply indicator */}
          {replyToMessage && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 mb-1 border-l-2 border-primary/50">
              <span className="font-medium">
                {replyToMessage.sender_profile?.full_name || 'Unknown'}:
              </span>{' '}
              <span className="truncate">{replyToMessage.content.slice(0, 50)}...</span>
            </div>
          )}

          {isEditing ? (
            <div className="flex items-center gap-2 w-full max-w-md">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className="flex-1"
                autoFocus
              />
              <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                'inline-block max-w-[80%] px-3 py-2 rounded-2xl text-sm',
                isOwn
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted rounded-bl-md'
              )}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isOwn ? 'start' : 'end'}>
              <DropdownMenuItem onClick={() => onReply(message)}>
                <Reply className="h-4 w-4 mr-2" />
                Trả lời
              </DropdownMenuItem>
              {isOwn && (
                <>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Sửa
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Xóa
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tin nhắn?</AlertDialogTitle>
            <AlertDialogDescription>
              Tin nhắn này sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
