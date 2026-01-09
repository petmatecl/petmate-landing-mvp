import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';

interface OnlineStatusContextType {
    onlineUsers: Set<string>;
}

const OnlineStatusContext = createContext<OnlineStatusContextType>({ onlineUsers: new Set() });

export const useOnlineStatus = () => useContext(OnlineStatusContext);

export function OnlineStatusProvider({ children }: { children: React.ReactNode }) {
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [userId, setUserId] = useState<string | null>(null);
    const router = useRouter();

    // 1. Get current user ID
    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUserId(session?.user?.id || null);
        };
        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // 2. Connect to Presence Channel
    useEffect(() => {
        if (!userId) {
            setOnlineUsers(new Set());
            return;
        }

        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const users = new Set(Object.keys(newState));
                setOnlineUsers(users);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                setOnlineUsers(prev => {
                    const newSet = new Set(prev);
                    newSet.add(key);
                    return newSet;
                });
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                setOnlineUsers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(key);
                    return newSet;
                });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    return (
        <OnlineStatusContext.Provider value={{ onlineUsers }}>
            {children}
        </OnlineStatusContext.Provider>
    );
}
