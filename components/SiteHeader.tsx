import Link from "next/link";
import { auth } from "@/auth";
import { doSignOut } from "@/app/actions";

export default async function SiteHeader() {
  const session = await auth();

  return (
    <header className="border-b-2 border-[var(--panel-border)] bg-[#0d0620]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="pixel text-sm glow-green no-underline">
          GBA<span className="glow-magenta">·</span>ONLINE
        </Link>
        <nav className="flex items-center gap-3 text-base">
          {session?.user ? (
            <>
              <Link href="/upload" className="btn-arcade btn-cyan no-underline">
                + Upload
              </Link>
              <span className="hidden sm:inline text-[var(--neon-cyan)]">
                {session.user.email}
              </span>
              <form action={doSignOut}>
                <button type="submit" className="btn-arcade btn-magenta">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/signin" className="btn-arcade no-underline">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
