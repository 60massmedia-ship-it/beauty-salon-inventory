import React, { useState } from 'react';
import { Button, Card, Field, TextInput } from './ui.jsx';

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = '123456';

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function submit(event) {
    event.preventDefault();
    setError('');

    const isValid = username.trim() === DEFAULT_USERNAME && password === DEFAULT_PASSWORD;
    if (!isValid) {
      setError('Username หรือ Password ไม่ถูกต้อง');
      return;
    }

    onLogin({ username: DEFAULT_USERNAME, loggedInAt: new Date().toISOString() });
  }

  return (
    <main className="theme-root theme-day flex min-h-screen items-center justify-center p-4 text-neutral-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(244,114,182,0.22),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(251,207,232,0.85),transparent_30%)]" />
      <Card className="relative w-full max-w-md p-6 md:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-neutral-950 text-3xl text-white shadow-lg">💅</div>
          <div className="mb-3 inline-flex rounded-full bg-pink-50 px-4 py-2 text-xs font-black text-pink-700 ring-1 ring-pink-100">Premium Beauty Salon Inventory</div>
          <h1 className="text-2xl font-black tracking-[-0.03em] text-neutral-950 md:text-3xl">เข้าสู่ระบบจัดการสต็อค</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">กรอก Username และ Password ก่อนเข้าสู่ระบบร้าน</p>
        </div>

        {error ? <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">⚠️ {error}</div> : null}

        <form onSubmit={submit} className="space-y-4">
          <Field label="Username">
            <TextInput value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="admin" />
          </Field>
          <Field label="Password">
            <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="••••••" />
          </Field>

          <Button type="submit" className="w-full bg-neutral-950 py-4 text-white">เข้าสู่ระบบ</Button>
        </form>

        <div className="mt-5 rounded-2xl bg-pink-50 p-4 text-xs leading-relaxed text-pink-800">
          <b>ค่าเริ่มต้น:</b> Username <b>admin</b> / Password <b>123456</b><br />
          แนะนำให้เปลี่ยนเป็นระบบ Auth จริงในอนาคต ถ้าจะให้พนักงานหลายคนใช้งานระยะยาว
        </div>
      </Card>
    </main>
  );
}
