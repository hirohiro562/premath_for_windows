import { parseNoteSegments, renderMath } from '../lib/mathRender';
import { useTranslation } from '../lib/i18n';

interface NotePreviewProps {
  text: string;
}

export function NotePreview({ text }: NotePreviewProps) {
  const { t } = useTranslation();
  if (!text) {
    return <div className="note-preview note-preview--empty">{t('note.empty')}</div>;
  }

  const segments = parseNoteSegments(text);

  return (
    <div className="note-preview">
      {segments.map((segment, index) =>
        segment.type === 'math' ? (
          <span
            key={index}
            className={segment.displayMode ? 'note-math note-math--block' : 'note-math'}
            dangerouslySetInnerHTML={{ __html: renderMath(segment.content, segment.displayMode) }}
          />
        ) : (
          <span key={index}>{segment.content}</span>
        ),
      )}
    </div>
  );
}
