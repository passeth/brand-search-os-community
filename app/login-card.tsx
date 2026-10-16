'use client';

import {useState} from 'react';
import {ArrowRight, Command, LoaderCircle} from 'lucide-react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {resolveLoginEmail} from '../lib/login-identity';

export function LoginCard({client}:{client:SupabaseClient}) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function signIn(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrorMessage('');
    try {
      const email = resolveLoginEmail(identifier);
      if (!email) throw new Error('등록된 이메일을 입력해 주세요.');
      const {error} = await client.auth.signInWithPassword({email, password});
      if (error) {
        if (error.status === 429) throw new Error('로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.');
        throw new Error('이메일 또는 비밀번호를 확인해 주세요.');
      }
      setPassword('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '로그인 요청에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return <form className="login-card" onSubmit={signIn}>
    <div className="square-icon"><Command size={24}/></div>
    <h2>워크스페이스 로그인</h2>
    <p>설치 관리자가 등록한 이메일과 비밀번호로 로그인하세요.</p>
    <label>이메일<input type="email" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required disabled={busy} value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="name@example.com"/></label>
    <label>비밀번호<input type="password" name="password" autoComplete="current-password" required disabled={busy} value={password} onChange={e => setPassword(e.target.value)} placeholder="계정 비밀번호"/></label>
    {errorMessage && <div className="login-feedback error" role="alert">{errorMessage}</div>}
    <button className="button dark full" disabled={busy}>
      {busy ? <LoaderCircle className="spin" size={16}/> : <ArrowRight size={16}/>}
      {busy ? '로그인 중…' : '로그인'}
    </button>
    <small className="muted">계정 생성과 워크스페이스 권한 등록은 설치 관리자에게 요청하세요.</small>
  </form>;
}
