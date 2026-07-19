import { parseNoteSegments, renderMath } from '../lib/mathRender';

interface NotePreviewProps {
  text: string;
}

export function NotePreview({ text }: NotePreviewProps) {
  if (!text) {
    return <div className="note-preview note-preview--empty">プレビューする内容がありません</div>;
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
