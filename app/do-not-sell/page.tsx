'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DoNotSellPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Do Not Sell or Share My Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              PLAINERは現在、解析データをユーザーのブラウザ（IndexedDB）内にのみ保存しており、
              第三者へ販売・共有は行っていません。ユーザーはいつでも解析への同意を撤回し、
              お使いの端末に保存された解析データを削除できます。
            </p>
            <ul>
              <li>第三者販売: なし</li>
              <li>第三者共有: なし</li>
              <li>
                権利行使: <a className="underline" href="/privacy">プライバシー設定</a>
                から同意の管理・データ削除が可能です
              </li>
            </ul>
            <p>
              将来的にデータ処理方針に変更がある場合は、本ページおよびプライバシーポリシーで告知します。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

