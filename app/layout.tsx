import "./globals.css"
import { Cinzel, EB_Garamond } from "next/font/google"
import { Providers } from "./providers"
import { CursorProvider } from "./cursor-provider"

const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600"] })
const garamond = EB_Garamond({ subsets: ["latin"], variable: "--font-body" })

export const metadata = {
  title: "RPG de Mesa",
  description: "Mesa virtual para RPG de mesa online",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${cinzel.variable} ${garamond.variable}`}>
      <body className="font-body bg-[#1B1712] text-[#E8DCC0]">
        <Providers>
          <CursorProvider>{children}</CursorProvider>
        </Providers>
      </body>
    </html>
  )
}