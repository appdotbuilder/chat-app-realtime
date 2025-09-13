import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock } from 'lucide-react';
import type { LoginUserInput } from '../../../server/src/schema';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState<LoginUserInput>({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await login(formData);
    } catch {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
              setFormData((prev: LoginUserInput) => ({ ...prev, email: e.target.value }))
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
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: LoginUserInput) => ({ ...prev, password: e.target.value }))
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
            Signing in...
          </>
        ) : (
          '🚀 Sign In'
        )}
      </Button>

      <div className="text-center pt-4">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-medium text-indigo-600 hover:text-indigo-500"
            disabled={isLoading}
          >
            Create one here
          </button>
        </p>
      </div>

      {/* Demo credentials hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4">
        <p className="text-xs text-blue-700 font-medium">💡 Demo Mode</p>
        <p className="text-xs text-blue-600 mt-1">
          Use any email/password combination to sign in and explore the chat features!
        </p>
      </div>
    </form>
  );
}