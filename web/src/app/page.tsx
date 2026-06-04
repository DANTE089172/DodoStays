import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <nav className="flex justify-end gap-4 p-4">
        <Link href="/signin" className="text-sm hover:underline">Sign in</Link>
        <Link href="/signup" className="rounded bg-black px-3 py-1 text-sm text-white">Sign up</Link>
      </nav>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">DodoStays</h1>
          <p className="mt-2 text-gray-600">Mauritius. Real prices. Instant book.</p>
        </div>
      </div>
    </main>
  );
}
