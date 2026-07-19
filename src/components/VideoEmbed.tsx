import { toEmbedUrl } from '../lib/video';

interface VideoEmbedProps {
  url: string;
  className?: string;
}

export function VideoEmbed({ url, className }: VideoEmbedProps) {
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
      title="動画"
    />
  );
}
