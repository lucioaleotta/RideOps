import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>RideOps</h1>
      <p>MVP Identity attivo.</p>
      <p>
        <Link href="/login">Vai al login</Link>
      </p>
    </main>
  );
}
