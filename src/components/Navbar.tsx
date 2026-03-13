export default function Navbar() {
  return (
    <div className="w-full bg-blue-600 text-white p-4">
      <div className="max-w-6xl mx-auto flex justify-between">
        <h1 className="font-bold text-xl">NurseCare</h1>

        <div className="space-x-4">
          <a href="/">Home</a>
          <a href="/nurses">Nurses</a>
          <a href="/contact">Contact</a>
        </div>
      </div>
    </div>
  )
}