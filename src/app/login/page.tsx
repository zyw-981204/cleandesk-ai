import { login } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { demoPassword } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/";
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <p className="text-[11px] uppercase tracking-[0.2em] text-brass">CleanDesk AI</p>
          <CardTitle>BrightHarbor desk</CardTitle>
          <p className="text-sm text-muted">
            One shared demo gate. The password is <span className="font-medium text-ink">{demoPassword()}</span>.
          </p>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-3">
            <input type="hidden" name="next" value={nextPath} />
            <label className="block text-sm" htmlFor="password">
              Demo password
            </label>
            <Input id="password" name="password" type="password" autoComplete="current-password" data-testid="login-password" required />
            {params.error ? <p className="text-sm text-danger">That password does not match the demo gate.</p> : null}
            <Button type="submit" data-testid="login-submit" className="w-full">
              Enter the desk
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
