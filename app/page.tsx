import SecurePlayer from "../components/SecurePlayer";

export default function Home() {
 return (
  <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 text-white">
   <h1 className="text-4xl font-bold mb-8">Secure Music Platform</h1>
   <SecurePlayer trackId="track1" />
  </main>
 );
}
