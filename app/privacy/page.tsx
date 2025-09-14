'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Consent from '@/lib/analytics/consent';
import { AnalyticsTracker } from '@/lib/analytics/tracker';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AnalyticsSettings from '@/lib/analytics/settings';

export default function PrivacyPage() {
  const [consent, setConsent] = useState<'granted' | 'denied' | 'pending'>(
    'pending'
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<
    null | { ok: boolean; message: string }
  >(null);
  const [retentionDays, setRetentionDays] = useState<number>(180);
  const consentRecord = useMemo(() => Consent.getRecord(), [consent]);

  useEffect(() => {
    setConsent(Consent.get());
    setRetentionDays(AnalyticsSettings.getRetentionDays());
  }, []);

  const grant = useCallback(() => {
    Consent.set('granted');
    setConsent('granted');
  }, []);

  const deny = useCallback(() => {
    Consent.set('denied');
    setConsent('denied');
  }, []);

  const clearAnalytics = useCallback(async () => {
    setDeleting(true);
    setDeleteResult(null);
    try {
      await AnalyticsTracker.clearAnalyticsData();
      setDeleteResult({ ok: true, message: '解析データを削除しました。' });
    } catch (e) {
      setDeleteResult({ ok: false, message: '削除に失敗しました。' });
    } finally {
      setDeleting(false);
    }
  }, []);

  const onChangeRetention = useCallback(async (value: string) => {
    const days = parseInt(value, 10);
    setRetentionDays(days);
    AnalyticsSettings.setRetentionDays(days);
  }, []);

  const exportData = useCallback(async () => {
    const data = await AnalyticsTracker.exportAnalyticsData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plainer-analytics-export-${new Date()
      .toISOString()
      .replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  const purgeOld = useCallback(async () => {
    await AnalyticsTracker.purgeOldData(retentionDays);
  }, [retentionDays]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>プライバシーポリシー</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              本サービスでは、ユーザー体験の向上、安定的な運用、品質改善のため、解析データ
              （ページ閲覧、ステップ滞在時間、クリック等）を取得する場合があります。解析の利用はユーザーの同意に基づいて行われます。
            </p>
            <ul>
              <li>解析目的: 使い勝手の評価、機能改善</li>
              <li>保存先: ブラウザのIndexedDB（ローカル）</li>
              <li>第三者提供: なし（将来変更時は本ページで告知）</li>
            </ul>
            <p>
              GDPR/CCPAに基づき、解析への同意・撤回およびデータ削除の権利を尊重します。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>同意設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700">
              現在の同意状態: <strong>{consent}</strong>
            </div>
            <div className="text-xs text-gray-500">
              最終更新: {new Date(consentRecord.updatedAt).toLocaleString()}
              {consentRecord.policyVersion && (
                <>
                  {' '}/ ポリシー版: {consentRecord.policyVersion}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={grant} disabled={consent === 'granted'}>
                同意する
              </Button>
              <Button
                variant="outline"
                onClick={deny}
                disabled={consent === 'denied'}
              >
                同意しない
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>データ削除リクエスト</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700">
              端末に保存された解析データ（セッション・イベント）を削除できます。
            </p>
            <div className="flex gap-2 items-center">
              <Button onClick={clearAnalytics} disabled={deleting}>
                {deleting ? '削除中…' : '解析データを削除'}
              </Button>
              {deleteResult && (
                <span
                  className={
                    'text-sm ' + (deleteResult.ok ? 'text-green-600' : 'text-red-600')
                  }
                >
                  {deleteResult.message}
                </span>
              )}
            </div>
            <Separator />
            <p className="text-xs text-gray-500">
              サーバー側分析基盤を導入している場合は、サポート窓口にお問い合わせください。
              現在はローカル保存データのみ対象です。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>データエクスポート / 保持期間</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium">データエクスポート</div>
                <div className="text-xs text-gray-500">
                  解析イベント/セッションをJSONでダウンロードします。
                </div>
              </div>
              <Button onClick={exportData}>JSONをダウンロード</Button>
            </div>
            <Separator />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium">データ保持期間</div>
                <div className="text-xs text-gray-500">
                  期間を超えたデータは削除対象になります。
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <Select value={String(retentionDays)} onValueChange={onChangeRetention}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="保持期間" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30日</SelectItem>
                    <SelectItem value="90">90日</SelectItem>
                    <SelectItem value="180">180日</SelectItem>
                    <SelectItem value="365">365日</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={purgeOld}>
                  古いデータを今すぐ削除
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-xs text-gray-500 text-center py-4">
          CCPA: <a className="underline" href="/do-not-sell">Do Not Sell or Share My Personal Information</a>
        </div>
      </div>
    </div>
  );
}
