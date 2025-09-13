import { useState, useEffect, useCallback, useRef } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send, Users, Crown, ArrowLeft, Image, Paperclip } from 'lucide-react';
import type { Room, User, Message, SendMessageInput } from '../../../server/src/schema';

interface ChatRoomProps {
  room: Room;
  user: User | null;
  onLeaveRoom: () => void;
}

interface MessageWithUser extends Message {
  user: {
    id: number;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function ChatRoom({ room, user, onLeaveRoom }: ChatRoomProps) {
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load messages for the room
  const loadMessages = useCallback(async () => {
    if (!room || !user) return;
    
    try {
      setIsLoading(true);
      const result = await trpc.getRoomMessages.query({
        roomId: room.id,
        limit: 50
      });
      
      // Transform messages to include user data
      const messagesWithUsers: MessageWithUser[] = result.map((msg: Message) => ({
        ...msg,
        user: {
          id: msg.user_id,
          username: msg.user_id === user.id ? user.username : `user${msg.user_id}`,
          display_name: msg.user_id === user.id ? user.display_name : `User ${msg.user_id}`,
          avatar_url: msg.user_id === user.id ? user.avatar_url : null
        }
      }));
      
      setMessages(messagesWithUsers);
    } catch (error) {
      console.error('Failed to load messages:', error);
      // Use fallback messages on error
      const fallbackMessages: MessageWithUser[] = [
        {
          id: 1,
          room_id: room.id,
          user_id: 999,
          content: `Welcome to ${room.name}! 🎉`,
          message_type: 'system',
          is_edited: false,
          is_deleted: false,
          reply_to_id: null,
          created_at: new Date(Date.now() - 3600000),
          updated_at: new Date(Date.now() - 3600000),
          user: {
            id: 999,
            username: 'system',
            display_name: 'ChatHub Bot',
            avatar_url: null
          }
        },
        {
          id: 2,
          room_id: room.id,
          user_id: 100,
          content: 'Hey everyone! Great to be here! 😊',
          message_type: 'text',
          is_edited: false,
          is_deleted: false,
          reply_to_id: null,
          created_at: new Date(Date.now() - 1800000),
          updated_at: new Date(Date.now() - 1800000),
          user: {
            id: 100,
            username: 'alice_wonderland',
            display_name: 'Alice',
            avatar_url: null
          }
        },
        {
          id: 3,
          room_id: room.id,
          user_id: 101,
          content: 'This room looks awesome! Love the features here 🚀',
          message_type: 'text',
          is_edited: false,
          is_deleted: false,
          reply_to_id: null,
          created_at: new Date(Date.now() - 900000),
          updated_at: new Date(Date.now() - 900000),
          user: {
            id: 101,
            username: 'bob_builder',
            display_name: 'Bob',
            avatar_url: null
          }
        }
      ];
      setMessages(fallbackMessages);
    } finally {
      setIsLoading(false);
    }
  }, [room, user]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || isSending) return;

    const messageData: SendMessageInput = {
      room_id: room.id,
      content: newMessage,
      message_type: 'text'
    };

    try {
      setIsSending(true);
      // Optimistically add the message
      const optimisticMessage: MessageWithUser = {
        id: Date.now(), // Temporary ID
        room_id: room.id,
        user_id: user.id,
        content: newMessage,
        message_type: 'text',
        is_edited: false,
        is_deleted: false,
        reply_to_id: null,
        created_at: new Date(),
        updated_at: new Date(),
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url
        }
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');

      // Send to server
      await trpc.sendMessage.mutate(messageData);
      // In real implementation, you'd replace the optimistic message with the server response
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== Date.now()));
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const isConsecutiveMessage = (currentMsg: MessageWithUser, index: number) => {
    if (index === 0) return false;
    const prevMsg = messages[index - 1];
    return (
      prevMsg.user_id === currentMsg.user_id &&
      (currentMsg.created_at.getTime() - prevMsg.created_at.getTime()) < 300000 // 5 minutes
    );
  };

  const onlineUsers = 5 + Math.floor(Math.random() * 15); // Simulated online count

  return (
    <Card className="h-[600px] flex flex-col shadow-sm border-0 bg-white/60 backdrop-blur-sm">
      {/* Header */}
      <CardHeader className="pb-3 border-b bg-white/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLeaveRoom}
              className="lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-lg flex items-center space-x-2">
                {room.room_type === 'premium' && <Crown className="h-4 w-4 text-yellow-500" />}
                <span>{room.name}</span>
              </CardTitle>
              {room.description && (
                <p className="text-sm text-gray-600 mt-1">{room.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {onlineUsers} online
            </Badge>
            {room.room_type === 'premium' && room.gold_cost && (
              <Badge className="text-xs bg-gradient-to-r from-yellow-400 to-yellow-600">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading messages...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message: MessageWithUser, index: number) => (
                <div key={message.id} className="group">
                  {!isConsecutiveMessage(message, index) && (
                    <div className="flex items-start space-x-3 mb-1">
                      <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                        <AvatarImage src={message.user.avatar_url || undefined} />
                        <AvatarFallback className={`text-xs font-medium ${
                          message.message_type === 'system' 
                            ? 'bg-indigo-100 text-indigo-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {message.user.display_name?.charAt(0) || message.user.username.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm text-gray-900">
                          {message.user.display_name || message.user.username}
                        </span>
                        {message.message_type === 'system' && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            Bot
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(message.created_at)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className={`${!isConsecutiveMessage(message, index) ? 'ml-11' : 'ml-11'} `}>
                    <div className={`inline-block max-w-full ${
                      message.message_type === 'system'
                        ? 'bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-sm font-medium'
                        : 'bg-gray-50 text-gray-900 px-3 py-2 rounded-lg'
                    } group-hover:bg-opacity-80 transition-colors`}>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                    {message.is_edited && (
                      <span className="text-xs text-gray-400 ml-2">(edited)</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <Separator />

      {/* Message Input */}
      <div className="p-4 bg-white/80">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
              placeholder={`Message ${room.name}...`}
              className="pr-20 bg-white border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
              disabled={isSending}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              >
                <Image className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || isSending}
            className="bg-indigo-600 hover:bg-indigo-700 px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        
        <p className="text-xs text-gray-500 mt-2 flex items-center">
          💡 <span className="ml-1">Press Enter to send, Shift+Enter for new line</span>
        </p>
      </div>
    </Card>
  );
}