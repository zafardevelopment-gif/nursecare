import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <main>
      <Navbar />

      <div className="flex min-h-screen flex-col items-center justify-center p-10">
        <h1 className="text-5xl font-bold text-blue-600">
          NurseCare Platform
        </h1>

        <p className="mt-4 text-lg">
          Home Nursing Services Platform
        </p>
      </div>
    </main>
  )
}