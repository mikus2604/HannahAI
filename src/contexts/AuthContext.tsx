import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

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
  totp_secret: string | null;
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
  verify2FA: (token: string, secret: string) => Promise<{ error: Error | null }>;
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
      if (!user) {
        return { qrCode: '', secret: '', error: new Error('User not authenticated') };
      }

      // Generate a random secret
      const secret = new OTPAuth.Secret({ size: 20 });
      const secretBase32 = secret.base32;

      // Create TOTP instance
      const totp = new OTPAuth.TOTP({
        issuer: 'Voice Assistant',
        label: user.email || 'User',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secretBase32,
      });

      // Generate QR code
      const qrCodeDataURL = await QRCode.toDataURL(totp.toString());

      return { 
        qrCode: qrCodeDataURL, 
        secret: secretBase32, 
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

  const verify2FA = async (token: string, secret: string) => {
    try {
      if (!user) {
        return { error: new Error('User not authenticated') };
      }

      // Create TOTP instance with the secret
      const totp = new OTPAuth.TOTP({
        issuer: 'Voice Assistant',
        label: user.email || 'User',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret,
      });

      // Verify the token with some time tolerance
      const delta = totp.validate({ token, window: 2 });
      
      if (delta === null) {
        return { error: new Error('Invalid verification code') };
      }

      // Save the secret to the user's profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          two_factor_enabled: true,
          totp_secret: secret
        })
        .eq('user_id', user.id);

      if (updateError) {
        return { error: updateError };
      }

      // Refresh profile data
      await fetchUserProfile(user.id);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const disable2FA = async () => {
    try {
      if (!user) {
        return { error: new Error('User not authenticated') };
      }

      // Remove the secret from the user's profile
      const { error } = await supabase
        .from('profiles')
        .update({ 
          two_factor_enabled: false,
          totp_secret: null,
          authenticator_app: null
        })
        .eq('user_id', user.id);

      if (error) {
        return { error };
      }

      // Refresh profile data
      await fetchUserProfile(user.id);

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