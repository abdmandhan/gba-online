import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SiteHeader from "@/components/SiteHeader";
import UploadRomForm from "@/components/UploadRomForm";

export default async function UploadPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
        <h1 className="pixel text-xl glow-green">INSERT CARTRIDGE</h1>
        <p className="mt-4 text-lg text-[var(--foreground)]">
          Upload a GBA ROM file (<code>.gba</code>) that you legally own. It is
          stored in your S3 bucket and added to the library.
        </p>
        <UploadRomForm />
      </main>
    </>
  );
}
