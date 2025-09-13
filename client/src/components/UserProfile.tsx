import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Crown, 
  CreditCard, 
  Settings, 
  Camera,
  Save,
  Coins,
  Loader2 
} from 'lucide-react';
import type { User as UserType, UpdateUserProfileInput, PurchaseGoldInput } from '../../../server/src/schema';

interface UserProfileProps {
  user: UserType | null;
}

export function UserProfile({ user }: UserProfileProps) {
  const { logout } = useAuth();
  const { setTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showGoldDialog, setShowGoldDialog] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [goldAmount, setGoldAmount] = useState(100);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [profileData, setProfileData] = useState<UpdateUserProfileInput>({
    display_name: user?.display_name || null,
    avatar_url: user?.avatar_url || null,
    language: user?.language || 'en',
    theme: user?.theme || 'light'
  });

  if (!user) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      await trpc.updateUserProfile.mutate(profileData);
      setSuccessMessage('Profile updated successfully! ✅');
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePurchaseGold = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsPurchasing(true);
      const purchaseData: PurchaseGoldInput = {
        amount: goldAmount,
        payment_reference: `demo-${Date.now()}`
      };
      await trpc.purchaseGold.mutate(purchaseData);
      setSuccessMessage(`Successfully purchased ${goldAmount} gold credits! 🎉`);
      setShowGoldDialog(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to purchase gold:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const languages = [
    { code: 'en', name: '🇺🇸 English' },
    { code: 'es', name: '🇪🇸 Español' },
    { code: 'fr', name: '🇫🇷 Français' },
    { code: 'de', name: '🇩🇪 Deutsch' },
    { code: 'it', name: '🇮🇹 Italiano' },
    { code: 'pt', name: '🇵🇹 Português' },
    { code: 'ru', name: '🇷🇺 Русский' },
    { code: 'ja', name: '🇯🇵 日本語' },
    { code: 'ko', name: '🇰🇷 한국어' },
    { code: 'zh', name: '🇨🇳 中文' }
  ];

  const themes = [
    { value: 'light', name: '☀️ Light', description: 'Clean and bright' },
    { value: 'dark', name: '🌙 Dark', description: 'Easy on the eyes' },
    { value: 'system', name: '⚙️ System', description: 'Follow system preference' }
  ];

  return (
    <div className="space-y-4">
      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Card */}
      <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profile
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={isUpdating}
            >
              <Settings className="h-4 w-4 mr-1" />
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar className="h-16 w-16 ring-4 ring-indigo-100">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xl font-bold">
                  {user.display_name?.charAt(0) || user.username.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute -bottom-2 -right-2 h-6 w-6 p-0"
                >
                  <Camera className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900">
                {user.display_name || user.username}
              </h3>
              <p className="text-sm text-gray-600">@{user.username}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <div className="flex items-center space-x-2 mt-2">
                {user.is_verified && (
                  <Badge variant="secondary" className="text-xs">
                    ✅ Verified
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  Role: {user.role_id === 1 ? 'Admin' : 'User'}
                </Badge>
              </div>
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={profileData.display_name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfileData((prev: UpdateUserProfileInput) => ({
                      ...prev,
                      display_name: e.target.value || null
                    }))
                  }
                  placeholder="Your display name"
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">🌍 Language</Label>
                <Select
                  value={profileData.language}
                  onValueChange={(value: string) =>
                    setProfileData((prev: UpdateUserProfileInput) => ({ ...prev, language: value }))
                  }
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">🎨 Theme</Label>
                <Select
                  value={profileData.theme}
                  onValueChange={(value: string) => {
                    setProfileData((prev: UpdateUserProfileInput) => ({ ...prev, theme: value }));
                    setTheme(value as 'light' | 'dark' | 'system');
                  }}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {themes.map(themeOption => (
                      <SelectItem key={themeOption.value} value={themeOption.value}>
                        <div>
                          <div>{themeOption.name}</div>
                          <div className="text-xs text-gray-500">{themeOption.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={isUpdating} className="w-full">
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">🌍 Language:</span>
                <span className="font-medium">
                  {languages.find(lang => lang.code === user.language)?.name || 'English'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">🎨 Theme:</span>
                <span className="font-medium capitalize">{user.theme}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">📅 Member since:</span>
                <span className="font-medium">{user.created_at.toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gold Credits Card */}
      <Card className="shadow-sm border-0 bg-gradient-to-r from-yellow-50 to-amber-50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center text-amber-800">
            <Crown className="h-5 w-5 mr-2 text-yellow-500" />
            Gold Credits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-700 mb-2">
              {user.gold_credits}
            </div>
            <p className="text-sm text-amber-600">Available credits</p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-amber-700">💎 Premium rooms access</span>
              <span className="text-amber-600">✓</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-amber-700">🎨 Custom themes</span>
              <span className="text-amber-600">✓</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-amber-700">⭐ Priority support</span>
              <span className="text-amber-600">✓</span>
            </div>
          </div>

          <Dialog open={showGoldDialog} onOpenChange={setShowGoldDialog}>
            <DialogTrigger asChild>
              <Button className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700">
                <Coins className="h-4 w-4 mr-2" />
                Purchase Gold
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Crown className="h-5 w-5 mr-2 text-yellow-500" />
                  Purchase Gold Credits
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePurchaseGold} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goldAmount">Amount</Label>
                  <Select
                    value={goldAmount.toString()}
                    onValueChange={(value: string) => setGoldAmount(parseInt(value))}
                    disabled={isPurchasing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">💰 100 Credits - $9.99</SelectItem>
                      <SelectItem value="250">💎 250 Credits - $19.99</SelectItem>
                      <SelectItem value="500">👑 500 Credits - $34.99</SelectItem>
                      <SelectItem value="1000">🏆 1000 Credits - $59.99</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-xs text-blue-700 font-medium">💡 Demo Mode</p>
                  <p className="text-xs text-blue-600 mt-1">
                    This is a demo - no real payment will be processed.
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowGoldDialog(false)}
                    disabled={isPurchasing}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPurchasing}>
                    {isPurchasing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Purchase
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Separator />

      {/* Account Actions */}
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={logout}
        >
          🚪 Sign Out
        </Button>
      </div>
    </div>
  );
}