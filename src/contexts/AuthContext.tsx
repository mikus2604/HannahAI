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
  plan_type: 'free' | 'premium' | 'premium_plus' | 'enterprise';
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
  requires2FA: boolean;
  tempSession: { email: string; password: string } | null;
  userRoles: string[];
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; requires2FA?: boolean }>;
  signInWith2FA: (token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  enable2FA: () => Promise<{ qrCode: string; secret: string; error: Error | null }>;
  verify2FA: (token: string, secret: string) => Promise<{ error: Error | null }>;
  disable2FA: () => Promise<{ error: Error | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  checkSubscriptionStatus: () => Promise<void>;
  hasRole: (role: string) => boolean;
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
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempSession, setTempSession] = useState<{ email: string; password: string } | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetch and subscription check to avoid deadlock
          setTimeout(async () => {
            await fetchUserProfile(session.user.id);
            // Check subscription status on login
            if (event === 'SIGNED_IN') {
              await checkSubscriptionStatus();
            }
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserProfile(session.user.id);
        await checkSubscriptionStatus();
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

      // Fetch user roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      setUserRoles(roles?.map(r => r.role) || []);
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
    // First, check if user has 2FA enabled
    const { data: profileData } = await supabase
      .from('profiles')
      .select('two_factor_enabled')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
      .single();

    // Try to find user by email to check 2FA status
    const { data: userProfiles } = await supabase
      .from('profiles')
      .select('two_factor_enabled, user_id')
      .limit(1);

    // Check if any user has this email and 2FA enabled
    let userHas2FA = false;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign In Error",
          description: error.message,
          variant: "destructive",
        });
        return { error, requires2FA: false };
      }

      // Check if this user has 2FA enabled
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('two_factor_enabled')
          .eq('user_id', data.user.id)
          .single();

        if (profile?.two_factor_enabled) {
          // Sign out immediately and require 2FA
          await supabase.auth.signOut();
          setTempSession({ email, password });
          setRequires2FA(true);
          return { error: null, requires2FA: true };
        }
      }

      return { error: null, requires2FA: false };
    } catch (error) {
      return { error: error as AuthError, requires2FA: false };
    }
  };

  const signInWith2FA = async (token: string) => {
    if (!tempSession) {
      return { error: new Error('No pending authentication session') };
    }

    try {
      // Sign in with stored credentials
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: tempSession.email,
        password: tempSession.password,
      });

      if (signInError) {
        return { error: signInError };
      }

      if (!data.user) {
        return { error: new Error('Authentication failed') };
      }

      // Get user's TOTP secret
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('totp_secret')
        .eq('user_id', data.user.id)
        .single();

      if (profileError || !profile?.totp_secret) {
        await supabase.auth.signOut();
        return { error: new Error('2FA configuration error') };
      }

      // Verify TOTP token
      const totp = new OTPAuth.TOTP({
        issuer: 'Voice Assistant',
        label: data.user.email || 'User',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: profile.totp_secret,
      });

      const delta = totp.validate({ token, window: 2 });
      
      if (delta === null) {
        await supabase.auth.signOut();
        return { error: new Error('Invalid verification code') };
      }

      // Clear temp session and 2FA requirement
      setTempSession(null);
      setRequires2FA(false);
      
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in with 2FA.",
      });

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    setRequires2FA(false);
    setTempSession(null);
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

  const checkSubscriptionStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Subscription check error:', error);
        return;
      }

      if (data && user) {
        // Update profile with subscription status
        const planType = data.subscribed ? 
          (data.subscription_tier === 'Premium' ? 'premium' :
           data.subscription_tier === 'Premium+' ? 'premium_plus' :
           data.subscription_tier === 'Enterprise' ? 'enterprise' : 'free') : 'free';
        
        const planExpiry = data.subscription_end ? new Date(data.subscription_end).toISOString() : null;
        
        await supabase
          .from('profiles')
          .update({ 
            plan_type: planType,
            plan_expires_at: planExpiry
          })
          .eq('user_id', user.id);
        
        // Refresh profile to reflect changes
        await fetchUserProfile(user.id);
      }
    } catch (error) {
      console.error('Subscription check failed:', error);
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

  const hasRole = (role: string) => {
    return userRoles.includes(role);
  };

  const value = {
    user,
    session,
    profile,
    loading,
    requires2FA,
    tempSession,
    userRoles,
    signUp,
    signIn,
    signInWith2FA,
    signOut,
    enable2FA,
    verify2FA,
    disable2FA,
    updateProfile,
    checkSubscriptionStatus,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};