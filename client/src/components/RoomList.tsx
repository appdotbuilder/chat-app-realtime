import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Users, Crown, Lock, Globe, Loader2 } from 'lucide-react';
import type { Room, CreateRoomInput } from '../../../server/src/schema';

interface RoomListProps {
  rooms: Room[];
  activeRoom: Room | null;
  onRoomSelect: (room: Room) => void;
  onRoomCreate: (roomData: CreateRoomInput) => void;
  isLoading: boolean;
}

export function RoomList({ rooms, activeRoom, onRoomSelect, onRoomCreate, isLoading }: RoomListProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreateRoomInput>({
    name: '',
    description: null,
    room_type: 'public',
    max_participants: undefined,
    gold_cost: undefined
  });

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      await onRoomCreate(formData);
      setFormData({
        name: '',
        description: null,
        room_type: 'public',
        max_participants: undefined,
        gold_cost: undefined
      });
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create room:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const getRoomIcon = (roomType: string) => {
    switch (roomType) {
      case 'premium':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'private':
        return <Lock className="h-4 w-4 text-gray-500" />;
      default:
        return <Globe className="h-4 w-4 text-green-500" />;
    }
  };

  const getRoomBadgeVariant = (roomType: string) => {
    switch (roomType) {
      case 'premium':
        return 'default' as const;
      case 'private':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  // Additional rooms for demonstration
  const sampleRooms: Room[] = [
    {
      id: 1,
      name: '🌟 Welcome Lounge',
      description: 'New to ChatHub? Start here and meet other users!',
      room_type: 'public',
      max_participants: null,
      gold_cost: null,
      owner_id: 1,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      name: '💎 VIP Premium Chat',
      description: 'Exclusive premium room with advanced features',
      room_type: 'premium',
      max_participants: 20,
      gold_cost: 50,
      owner_id: 1,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      name: '🎮 Gaming Corner',
      description: 'Discuss your favorite games and find gaming buddies',
      room_type: 'public',
      max_participants: null,
      gold_cost: null,
      owner_id: 1,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      name: '🔒 Private Study Group',
      description: 'Invite-only room for focused discussions',
      room_type: 'private',
      max_participants: 10,
      gold_cost: null,
      owner_id: 1,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  const allRooms = [...rooms, ...sampleRooms];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <Users className="h-4 w-4 mr-2" />
          Chat Rooms
        </h3>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-xs">
              <Plus className="h-3 w-3 mr-1" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>🚀 Create New Room</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomName">Room Name</Label>
                <Input
                  id="roomName"
                  placeholder="Enter room name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateRoomInput) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="roomDescription">Description (Optional)</Label>
                <Textarea
                  id="roomDescription"
                  placeholder="Describe your room..."
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateRoomInput) => ({ 
                      ...prev, 
                      description: e.target.value || null 
                    }))
                  }
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="roomType">Room Type</Label>
                <Select
                  value={formData.room_type}
                  onValueChange={(value: 'public' | 'private' | 'premium') =>
                    setFormData((prev: CreateRoomInput) => ({ ...prev, room_type: value }))
                  }
                  disabled={isCreating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">🌍 Public - Anyone can join</SelectItem>
                    <SelectItem value="private">🔒 Private - Invite only</SelectItem>
                    <SelectItem value="premium">👑 Premium - Costs gold credits</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.room_type === 'premium' && (
                <div className="space-y-2">
                  <Label htmlFor="goldCost">Gold Cost</Label>
                  <Input
                    id="goldCost"
                    type="number"
                    placeholder="Cost in gold credits"
                    value={formData.gold_cost || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateRoomInput) => ({ 
                        ...prev, 
                        gold_cost: parseInt(e.target.value) || undefined 
                      }))
                    }
                    min="1"
                    disabled={isCreating}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Max Participants (Optional)</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  placeholder="Leave empty for unlimited"
                  value={formData.max_participants || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateRoomInput) => ({ 
                      ...prev, 
                      max_participants: parseInt(e.target.value) || undefined 
                    }))
                  }
                  min="2"
                  disabled={isCreating}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} disabled={isCreating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Room'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-96">
        <div className="space-y-2">
          {allRooms.map((room: Room) => (
            <Card
              key={room.id}
              className={`cursor-pointer transition-all hover:shadow-sm ${
                activeRoom?.id === room.id
                  ? 'ring-2 ring-indigo-500 bg-indigo-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onRoomSelect(room)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      {getRoomIcon(room.room_type)}
                      <span className="font-medium text-sm text-gray-900 truncate">
                        {room.name}
                      </span>
                    </div>
                    {room.description && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {room.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-2">
                      <Badge variant={getRoomBadgeVariant(room.room_type)} className="text-xs">
                        {room.room_type}
                      </Badge>
                      {room.gold_cost && (
                        <Badge variant="outline" className="text-xs">
                          <Crown className="h-3 w-3 mr-1 text-yellow-500" />
                          {room.gold_cost}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <span className="ml-2 text-sm text-gray-600">Joining room...</span>
        </div>
      )}
    </div>
  );
}