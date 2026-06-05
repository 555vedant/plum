import "./globals.css"
import Link from "next/link"

export const metadata = {
  title: "AI OPD Adjudication System",
  description: "AI-Powered OPD Insurance Claim Adjudication System dashboard.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-950 antialiased">
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              

              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-950">
                  OPD Adjudicator
                </span>
                
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-1 sm:gap-3">
              <Link
                href="/"
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-950"
              >
                Dashboard
              </Link>

              <Link
                href="/upload"
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-950"
              >
                New Claim
              </Link>

              <Link
                href="/claims"
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-950"
              >
                Claims Log
              </Link>

              <Link
                href="/admin"
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-950"
              >
                Policy Rules
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  )
}