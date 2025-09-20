"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Me = { user: { id: string; name: string } | null };

export function SiteHeader() {
  const [me, setMe] = useState<Me['user'] | null>(null);
  const [name, setName] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const refresh = async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data: Me = await res.json();
      setMe(data.user || null);
    } catch {}
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async () => {
    if (!name.trim()) return;
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    setName('');
    setIsOpen(false);
    refresh();
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/" className="hover:underline">
            PLAINER
          </Link>
          <Link href="/editor" className="text-muted-foreground hover:text-foreground">
            Editor
          </Link>
          <Link href="/collaboration-demo" className="text-muted-foreground hover:text-foreground">
            Collaboration
          </Link>
          <Link href="/player" className="text-muted-foreground hover:text-foreground">
            Player
          </Link>
          <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
            Privacy
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {me ? (
            <>
              <span className="text-sm text-gray-600">{me.name}</span>
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {isOpen && (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-8 w-40"
                  />
                  <Button size="sm" onClick={login}>
                    Sign in
                  </Button>
                </div>
              )}
              {!isOpen && (
                <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
                  Sign in
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

