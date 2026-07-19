import { useState } from 'react';
import { REACTION_EMOJIS, useReactionSender } from '../lib/reactions';
import { isReactionsConfigured } from '../lib/supabase';

interface JoinScreenProps {
  sessionCode: string;
}

export function JoinScreen({ sessionCode }: JoinScreenProps) {
  const sendReaction = useReactionSender(sessionCode);
  const [lastSent, setLastSent] = useState<string | null>(null);

  if (!isReactionsConfigured) {
    return <div className="join-empty">リアクション機能は現在利用できません</div>;
  }

  function handleSend(emoji: string) {
    sendReaction(emoji);
    setLastSent(emoji);
    window.setTimeout(() => setLastSent((current) => (current === emoji ? null : current)), 600);
  }

  return (
    <div className="join-screen">
      <p className="join-code">セッション {sessionCode}</p>
      <p className="join-title">リアクションを送ろう</p>
      <div className="join-reactions">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={`join-reaction-btn${lastSent === emoji ? ' join-reaction-btn--sent' : ''}`}
            onClick={() => handleSend(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
