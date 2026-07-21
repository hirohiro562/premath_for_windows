import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { getJoinUrl } from '../lib/actions';
import { useTranslation } from '../lib/i18n';

interface QrJoinPanelProps {
  sessionCode: string;
}

export function QrJoinPanel({ sessionCode }: QrJoinPanelProps) {
  const { t } = useTranslation();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const joinUrl = getJoinUrl(sessionCode);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(joinUrl, { margin: 1, width: 220 }).then((generated) => {
      if (!cancelled) setDataUrl(generated);
    });
    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  return (
    <div className="qr-panel">
      {dataUrl && <img src={dataUrl} alt="" className="qr-panel-image" />}
      <p className="qr-panel-code">{sessionCode}</p>
      <p className="qr-panel-hint">{t('qr.hint')}</p>
    </div>
  );
}
