import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { AuthProvider, useAuth } from '@/components/AuthContext';
import { ThemeProvider } from '@/components/ThemeContext';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';
import { ChatRoom } from '@/components/ChatRoom';
import { RoomList } from '@/components/RoomList';
import { UserProfile } from '@/components/UserProfile';
import { AdminPanel } from '@/components/AdminPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Settings, Users, Crown, LogOut, Plus } from 'lucide-react';
import type { Room, CreateRoomInput } from '../../server/src/schema';

function MainApp() {
  const { user, logout, isAuthenticated } = useAuth();
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [showRegister, setShowRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load user's rooms
  const loadRooms = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const result = await trpc.getRooms.query();
      setRooms(result);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadRooms();
    }
  }, [isAuthenticated, loadRooms]);

  const handleRoomJoin = async (room: Room) => {
    try {
      setIsLoading(true);
      await trpc.joinRoom.mutate({ room_id: room.id });
      setActiveRoom(room);
      setActiveTab('chat');
    } catch (error) {
      console.error('Failed to join room:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoomCreate = async (roomData: CreateRoomInput) => {
    try {
      const newRoom = await trpc.createRoom.mutate(roomData);
      setRooms(prev => [...prev, newRoom]);
      setActiveRoom(newRoom);
      setActiveTab('chat');
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <MessageCircle className="h-12 w-12 text-indigo-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">💬 ChatHub</h1>
              <p className="text-gray-600">Connect, chat, and collaborate in real-time</p>
            </div>

            <Card className="shadow-lg border-0">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">
                  {showRegister ? '🚀 Join ChatHub' : '👋 Welcome Back'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showRegister ? (
                  <RegisterForm 
                    onSuccess={() => setShowRegister(false)}
                    onSwitchToLogin={() => setShowRegister(false)}
                  />
                ) : (
                  <LoginForm 
                    onSwitchToRegister={() => setShowRegister(true)}
                  />
                )}
              </CardContent>
            </Card>

            <div className="text-center mt-6">
              <p className="text-sm text-gray-500">
                ✨ Free to join • 🔒 Secure • 🌟 Premium features available
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <MessageCircle className="h-8 w-8 text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-900">ChatHub</h1>
              {activeRoom && (
                <>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="flex items-center space-x-2">
                    <Badge variant={activeRoom.room_type === 'premium' ? 'default' : 'secondary'}>
                      {activeRoom.room_type === 'premium' && <Crown className="h-3 w-3 mr-1" />}
                      {activeRoom.room_type}
                    </Badge>
                    <span className="font-medium text-gray-700">{activeRoom.name}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <Crown className="h-4 w-4 text-yellow-500" />
                <span className="font-medium text-gray-700">{user?.gold_credits || 0}</span>
                <span className="text-gray-500">gold</span>
              </div>
              
              <Avatar className="h-8 w-8 ring-2 ring-indigo-100">
                <AvatarImage src={user?.avatar_url || undefined} />
                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-medium">
                  {user?.display_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>

              <Button variant="ghost" size="sm" onClick={logout} className="text-gray-600 hover:text-gray-900">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm border-0 bg-white/60 backdrop-blur-sm">
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 m-4 mb-0">
                    <TabsTrigger value="rooms" className="text-sm">
                      <Users className="h-4 w-4 mr-1" />
                      Rooms
                    </TabsTrigger>
                    <TabsTrigger value="profile" className="text-sm">
                      <Settings className="h-4 w-4 mr-1" />
                      Profile
                    </TabsTrigger>
                  </TabsList>

                  <div className="p-4 pt-2">
                    <TabsContent value="rooms" className="mt-4">
                      <RoomList 
                        rooms={rooms}
                        activeRoom={activeRoom}
                        onRoomSelect={handleRoomJoin}
                        onRoomCreate={handleRoomCreate}
                        isLoading={isLoading}
                      />
                    </TabsContent>

                    <TabsContent value="profile" className="mt-4">
                      <UserProfile user={user} />
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="chat">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat
                </TabsTrigger>
                {user?.role_id === 1 && ( // Assuming role_id 1 is admin
                  <TabsTrigger value="admin">
                    <Settings className="h-4 w-4 mr-2" />
                    Admin
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="chat">
                {activeRoom ? (
                  <ChatRoom 
                    room={activeRoom} 
                    user={user}
                    onLeaveRoom={() => setActiveRoom(null)}
                  />
                ) : (
                  <Card className="shadow-sm border-0 bg-white/60 backdrop-blur-sm">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <MessageCircle className="h-16 w-16 text-gray-300 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        Welcome to ChatHub! 🎉
                      </h3>
                      <p className="text-gray-500 mb-6 max-w-md">
                        Select a room from the sidebar to start chatting, or create a new room to begin your own conversation.
                      </p>
                      <Button 
                        onClick={() => setActiveTab('rooms')}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Browse Rooms
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {user?.role_id === 1 && (
                <TabsContent value="admin">
                  <AdminPanel />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;