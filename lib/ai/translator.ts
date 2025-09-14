export type Lang = 'ja' | 'en';

// Tiny built-in dictionary for demo purposes (offline)
const DICT_JA_EN: Record<string, string> = {
  '次へ': 'Next',
  '前へ': 'Previous',
  保存: 'Save',
  削除: 'Delete',
  編集: 'Edit',
  追加: 'Add',
  閉じる: 'Close',
  タイトル: 'Title',
  説明: 'Description',
  注釈: 'Annotation',
  ホットスポット: 'Hotspot',
  共有: 'Share',
  エクスポート: 'Export',
  プレビュー: 'Preview',
  ステップ: 'Step',
  開始: 'Start',
  停止: 'Stop',
};

const DICT_EN_JA: Record<string, string> = Object.fromEntries(
  Object.entries(DICT_JA_EN).map(([ja, en]) => [en.toLowerCase(), ja])
);

export function translateLocal(text: string, to: Lang, from?: Lang): string {
  // Extremely simple rule-based substitution for demo/offline use.
  if (!text) return text;
  const tokens = tokenize(text);
  if (to === 'en') {
    return tokens
      .map((t) => (DICT_JA_EN[t] ? DICT_JA_EN[t] : t))
      .join('');
  }
  if (to === 'ja') {
    return tokens
      .map((t) => (DICT_EN_JA[t.toLowerCase()] ? DICT_EN_JA[t.toLowerCase()] : t))
      .join('');
  }
  return text;
}

function tokenize(input: string): string[] {
  // Keep it simple: split by boundaries but preserve punctuation/whitespace
  const re = /(\s+|[.,!?()/]|\p{Script=Hiragana}+|\p{Script=Katakana}+|\p{Script=Han}+|[^\s.,!?()/]+)/gu;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) out.push(m[0]);
  return out.length ? out : [input];
}

