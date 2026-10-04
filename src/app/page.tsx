import Link from "next/link";

export default function Home() {
  return <main className="home"><h1>ZAGGAS</h1><p>Be real. Be human.</p><p>Simple outside. Deep inside.</p><Link href="/stories" className="button">Stories</Link></main>;
}
