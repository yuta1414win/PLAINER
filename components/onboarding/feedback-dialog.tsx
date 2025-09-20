'use client';

import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { recordOnboardingMetric } from '@/lib/onboarding/metrics';

interface OnboardingFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingFeedbackDialog({
  open,
  onOpenChange,
}: OnboardingFeedbackDialogProps) {
  const [rating, setRating] = useState<string>('5');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const resetForm = () => {
    setRating('5');
    setComment('');
    setIsSubmitting(false);
    setSubmitted(false);
  };

  const handleSubmit = () => {
    if (!comment.trim()) {
      // Require some feedback text to make the data useful
      return;
    }
    setIsSubmitting(true);
    try {
      recordOnboardingMetric({
        type: 'feedback',
        rating: Number(rating),
        comment: comment.trim(),
      });
      setSubmitted(true);
      setIsSubmitting(false);

      window.setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1200);
    } catch (error) {
      console.error('Failed to record onboarding feedback', error);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    recordOnboardingMetric({ type: 'feedback_open' });
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          window.setTimeout(() => resetForm(), 150);
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            初心者体験のフィードバック
          </DialogTitle>
          <DialogDescription>
            チュートリアルや用語ガイドの分かりやすさについて教えてください。改善の参考にします。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="onboarding-rating">理解度の目安</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger id="onboarding-rating">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 - とても分かりやすかった</SelectItem>
                <SelectItem value="4">4 - ほぼ問題なく理解できた</SelectItem>
                <SelectItem value="3">3 - 一部迷った箇所があった</SelectItem>
                <SelectItem value="2">2 - 説明が足りないと感じた</SelectItem>
                <SelectItem value="1">1 - ほとんど理解できなかった</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="onboarding-comment">詳しいコメント</Label>
            <Textarea
              id="onboarding-comment"
              placeholder="迷ったポイントや改善してほしい点があれば教えてください"
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              入力内容はローカルに保存され、後から分析用にエクスポートできます。
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            disabled={comment.trim().length === 0 || isSubmitting || submitted}
            onClick={handleSubmit}
          >
            {submitted ? 'ありがとうございます！' : '送信する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
