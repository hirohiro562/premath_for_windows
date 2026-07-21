import { toEmbedUrl } from '../lib/video';
import { useTranslation } from '../lib/i18n';

interface VideoEmbedProps {
  url: string;
  className?: string;
}

export function VideoEmbed({ url, className }: VideoEmbedProps) {
  const { t } = useTranslation();
  const embed = toEmbedUrl(url);

  if (embed.type === 'video') {
    return <video key={embed.src} className={className} src={embed.src} controls autoPlay />;
  }

  return (
    <iframe
      key={embed.src}
      className={className}
      src={embed.src}
      allow="autoplay; fullscreen; encrypted-media"
      allowFullScreen
      title={t('video.title')}
    />
  );
}
