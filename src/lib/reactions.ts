import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '👏', '🤔', '🎉'] as const;

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateSessionCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

interface ReactionPayload {
  id: string;
  emoji: string;
}

export function useReactionSender(sessionCode: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!supabase || !sessionCode) return;
    const channel = supabase.channel(`reactions:${sessionCode}`);
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      void supabase!.removeChannel(channel);
      channelRef.current = null;
    };
  }, [sessionCode]);

  return useCallback((emoji: string) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'reaction',
      payload: { id: crypto.randomUUID(), emoji } satisfies ReactionPayload,
    });
  }, []);
}

export function useReactionFeed(sessionCode: string | null) {
  const [reactions, setReactions] = useState<(ReactionPayload & { offset: number })[]>([]);

  useEffect(() => {
    if (!supabase || !sessionCode) return;
    const channel = supabase.channel(`reactions:${sessionCode}`);
    channel
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const reaction = { ...(payload as ReactionPayload), offset: Math.random() * 80 - 40 };
        setReactions((prev) => [...prev, reaction]);
        window.setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
        }, 2200);
      })
      .subscribe();
    return () => {
      void supabase!.removeChannel(channel);
    };
  }, [sessionCode]);

  return reactions;
}
