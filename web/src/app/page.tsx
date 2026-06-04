import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <nav className="flex justify-between p-4">
        <Link href="/" className="font-bold">DodoStays</Link>
        <div className="flex gap-4">
          <Link href="/listings" className="text-sm hover:underline">Browse</Link>
          <Link href="/signin" className="text-sm hover:underline">Sign in</Link>
          <Link href="/signup" className="rounded bg-black px-3 py-1 text-sm text-white">Sign up</Link>
        </div>
      </nav>
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <h1 className="text-5xl font-bold">DodoStays</h1>
        <p className="mt-2 text-gray-600">Mauritius. Real prices. Instant book.</p>
        <Link href="/listings" className="mt-6 rounded bg-black px-6 py-3 text-white">Browse stays</Link>
      </div>
    </main>
  );
}
