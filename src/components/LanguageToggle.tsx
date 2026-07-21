import { toggleLanguage, useTranslation } from '../lib/i18n';

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={`language-toggle${className ? ` ${className}` : ''}`}
      onClick={toggleLanguage}
      aria-label="Switch language"
    >
      {t('language.toggle')}
    </button>
  );
}
