import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ApiErrorException } from '@/lib/api-client/client';
import { useAdminLogin, usePartnerLogin } from './hooks';

const loginSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type LoginValues = z.infer<typeof loginSchema>;

const COPY = {
  admin: { title: 'Admin Console', desc: 'Masuk sebagai admin fleet-taxi.id', home: '/admin' },
  partner: { title: 'Portal Partner', desc: 'Masuk sebagai partner fleet-taxi.id', home: '/partner/dashboard' },
} as const;

// Shared login form parameterized by audience — each uses its own auth
// endpoint (admin console vs partner portal) and its own landing page.
export function LoginForm({ audience, redirect }: { audience: 'admin' | 'partner'; redirect?: string }) {
  const router = useRouter();
  const copy = COPY[audience];
  // hooks called unconditionally; pick by audience
  const adminLogin = useAdminLogin();
  const partnerLogin = usePartnerLogin();
  const login = audience === 'admin' ? adminLogin : partnerLogin;

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => router.history.push(redirect ?? copy.home),
    });
  });

  const apiError =
    login.error instanceof ApiErrorException
      ? login.error
      : login.error
        ? { message: 'Terjadi kesalahan. Coba lagi.', details: undefined }
        : null;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{copy.title}</CardTitle>
        <CardDescription>{copy.desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!form.formState.errors.email}
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!form.formState.errors.password}
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          {apiError && (
            <div role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {apiError.message}
              {apiError.details?.map((d) => (
                <div key={d.field}>
                  {d.field}: {d.message}
                </div>
              ))}
            </div>
          )}

          <Button type="submit" disabled={login.isPending} className="w-full">
            {login.isPending ? 'Memproses…' : 'Masuk'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
