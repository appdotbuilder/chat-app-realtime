import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, User, Eye } from 'lucide-react';
import type { RegisterUserInput } from '../../../server/src/schema';

interface RegisterFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState<RegisterUserInput>({
    username: '',
    email: '',
    password: '',
    display_name: null,
    language: 'en',
    theme: 'light'
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      await register(formData);
      onSuccess();
    } catch {
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium text-gray-700">
            👤 Username
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="username"
              type="text"
              placeholder="Choose username"
              value={formData.username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: RegisterUserInput) => ({ ...prev, username: e.target.value }))
              }
              className="pl-10"
              required
              disabled={isLoading}
              minLength={3}
              maxLength={50}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-sm font-medium text-gray-700">
            ✨ Display Name
          </Label>
          <div className="relative">
            <Eye className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="displayName"
              type="text"
              placeholder="Your display name"
              value={formData.display_name || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: RegisterUserInput) => ({ 
                  ...prev, 
                  display_name: e.target.value || null 
                }))
              }
              className="pl-10"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
          📧 Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: RegisterUserInput) => ({ ...prev, email: e.target.value }))
            }
            className="pl-10"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-gray-700">
          🔐 Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="password"
            type="password"
            placeholder="Choose a strong password"
            value={formData.password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: RegisterUserInput) => ({ ...prev, password: e.target.value }))
            }
            className="pl-10"
            required
            disabled={isLoading}
            minLength={8}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
          🔒 Confirm Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setConfirmPassword(e.target.value)
            }
            className="pl-10"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-indigo-600 hover:bg-indigo-700" 
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creating account...
          </>
        ) : (
          '🎉 Create Account'
        )}
      </Button>

      <div className="text-center pt-4">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-medium text-indigo-600 hover:text-indigo-500"
            disabled={isLoading}
          >
            Sign in here
          </button>
        </p>
      </div>

      {/* Features preview */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-md p-3 mt-4">
        <p className="text-xs text-indigo-700 font-medium">🚀 Join ChatHub and get:</p>
        <ul className="text-xs text-indigo-600 mt-1 space-y-0.5">
          <li>• 💯 100 free gold credits</li>
          <li>• 🔥 Access to premium chat rooms</li>
          <li>• 🎨 Customizable themes and languages</li>
        </ul>
      </div>
    </form>
  );
}