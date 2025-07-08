import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  plan_type: 'free' | 'premium';
  plan_expires_at: string | null;
  two_factor_enabled: boolean;
  authenticator_app: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  enable2FA: () => Promise<{ qrCode: string; secret: string; error: Error | null }>;
  verify2FA: (token: string) => Promise<{ error: Error | null }>;
  disable2FA: () => Promise<{ error: Error | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetch to avoid deadlock
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data as Profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName || email.split('@')[0]
        }
      }
    });

    if (error) {
      toast({
        title: "Sign Up Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link to complete your registration.",
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Sign In Error",
        description: error.message,
        variant: "destructive",
      });
    }

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const enable2FA = async () => {
    try {
      // First, clean up any existing unverified factors to avoid conflicts
      const { data: existingFactors } = await supabase.auth.mfa.listFactors();
      
      if (existingFactors?.totp) {
        const unverifiedFactors = existingFactors.totp.filter(factor => factor.status === 'unverified');
        for (const factor of unverifiedFactors) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Authenticator App ${Date.now()}`
      });

      if (error) throw error;

      return { 
        qrCode: data.totp.qr_code, 
        secret: data.totp.secret, 
        error: null 
      };
    } catch (error) {
      return { 
        qrCode: '', 
        secret: '', 
        error: error as Error 
      };
    }
  };

  const verify2FA = async (token: string) => {
    try {
      console.log('Starting 2FA verification with token:', token);
      
      // Get the current unverified factor
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) {
        console.error('Error listing factors:', factorsError);
        throw factorsError;
      }
      
      console.log('Available factors:', factors);
      
      // Find the most recent unverified factor
      const unverifiedFactor = factors.totp
        .filter(factor => factor.status === 'unverified')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      if (!unverifiedFactor) {
        console.error('No unverified factor found');
        throw new Error('No unverified factor found. Please start the setup process again.');
      }

      console.log('Using factor:', unverifiedFactor.id);

      // First create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: unverifiedFactor.id
      });

      if (challengeError) {
        console.error('Challenge error:', challengeError);
        throw challengeError;
      }

      console.log('Challenge created:', challengeData.id);

      // Then verify with the challenge
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: unverifiedFactor.id,
        challengeId: challengeData.id,
        code: token
      });

      if (error) {
        console.error('Verification error:', error);
        throw error;
      }

      console.log('2FA verification successful');

      // Update profile to reflect 2FA status
      await updateProfile({ two_factor_enabled: true });

      return { error: null };
    } catch (error) {
      console.error('2FA verification failed:', error);
      return { error: error as Error };
    }
  };

  const disable2FA = async () => {
    try {
      const factors = session?.user?.factors || [];
      if (factors.length > 0) {
        const { error } = await supabase.auth.mfa.unenroll({
          factorId: factors[0].id
        });

        if (error) throw error;

        // Update profile to reflect 2FA status
        await updateProfile({ two_factor_enabled: false });
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh profile data
      await fetchUserProfile(user.id);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    enable2FA,
    verify2FA,
    disable2FA,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};