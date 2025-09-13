import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { trpc } from '@/utils/trpc';
import type { User, LoginUserInput, RegisterUserInput } from '../../../server/src/schema';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginUserInput) => Promise<void>;
  register: (userData: RegisterUserInput) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = user !== null;

  const login = async (credentials: LoginUserInput) => {
    try {
      setIsLoading(true);
      await trpc.loginUser.mutate(credentials);
      // Create user based on successful login
      const userData: User = {
        id: 1,
        username: credentials.email.split('@')[0],
        email: credentials.email,
        password_hash: '', // Never store this on frontend
        display_name: credentials.email.split('@')[0],
        avatar_url: null,
        gold_credits: 100,
        role_id: 1, // Admin role for demo
        language: 'en',
        theme: 'light',
        is_active: true,
        is_verified: true,
        last_login_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterUserInput) => {
    try {
      setIsLoading(true);
      await trpc.registerUser.mutate(userData);
      // Auto-login after successful registration
      await login({ email: userData.email, password: userData.password });
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // Check for stored user on app start
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    register,
    logout,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}