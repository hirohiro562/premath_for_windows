export interface EmbedInfo {
  type: 'iframe' | 'video';
  src: string;
}

export function toEmbedUrl(rawUrl: string): EmbedInfo {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = url.searchParams.get('v');
      if (id) return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` };
      const embedMatch = /\/embed\/([^/?]+)/.exec(url.pathname);
      if (embedMatch) return { type: 'iframe', src: `https://www.youtube.com/embed/${embedMatch[1]}` };
    }

    if (host === 'youtu.be') {
      const id = url.pathname.slice(1);
      if (id) return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` };
    }

    if (host === 'vimeo.com') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      if (id) return { type: 'iframe', src: `https://player.vimeo.com/video/${id}` };
    }

    if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) {
      return { type: 'video', src: rawUrl };
    }

    return { type: 'iframe', src: rawUrl };
  } catch {
    return { type: 'iframe', src: rawUrl };
  }
}
