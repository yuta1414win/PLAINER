'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Consent, { type ConsentStatus } from '@/lib/analytics/consent';

interface ConsentBannerProps {
  className?: string;
  policyUrl?: string;
}

export const ConsentBanner: React.FC<ConsentBannerProps> = ({
  className = '',
  policyUrl = '/privacy',
}) => {
  const [status, setStatus] = useState<ConsentStatus>('pending');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const s = Consent.get();
    setStatus(s);
    setVisible(s === 'pending');
  }, []);

  const accept = useCallback(() => {
    Consent.set('granted');
    setStatus('granted');
    setVisible(false);
  }, []);

  const decline = useCallback(() => {
    Consent.set('denied');
    setStatus('denied');
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className={`fixed inset-x-0 bottom-0 z-50 px-4 pb-4 ${className}`}>
      <Card className="mx-auto max-w-3xl p-4 shadow-lg border bg-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-700">
            このサイトでは、利用状況の把握と改善のために解析情報を使用します。
            同意いただける場合は「同意する」を選択してください。詳細は
            <a
              href={policyUrl}
              className="underline hover:opacity-80 ml-1"
              target="_blank"
              rel="noreferrer"
            >
              プライバシーポリシー
            </a>
            をご確認ください。
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={decline}>
              同意しない
            </Button>
            <Button onClick={accept}>同意する</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ConsentBanner;

