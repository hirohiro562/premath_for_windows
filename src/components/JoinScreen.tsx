import { useState } from 'react';
import { REACTION_EMOJIS, useReactionSender } from '../lib/reactions';
import { isReactionsConfigured } from '../lib/supabase';
import { useTranslation } from '../lib/i18n';
import { LanguageToggle } from './LanguageToggle';

interface JoinScreenProps {
  sessionCode: string;
}

export function JoinScreen({ sessionCode }: JoinScreenProps) {
  const { t } = useTranslation();
  const sendReaction = useReactionSender(sessionCode);
  const [lastSent, setLastSent] = useState<string | null>(null);

  if (!isReactionsConfigured) {
    return (
      <div className="join-screen">
        <LanguageToggle className="language-toggle--floating" />
        <div className="join-empty">{t('join.unavailable')}</div>
      </div>
    );
  }

  function handleSend(emoji: string) {
    sendReaction(emoji);
    setLastSent(emoji);
    window.setTimeout(() => setLastSent((current) => (current === emoji ? null : current)), 600);
  }

  return (
    <div className="join-screen">
      <LanguageToggle className="language-toggle--floating" />
      <p className="join-code">{t('join.session', { code: sessionCode })}</p>
      <p className="join-title">{t('join.title')}</p>
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
