import { Providers } from "./providers";
import { Header } from "@/components/header";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <Providers>
          <Header />
          <main className="flex-1 flex flex-col items-center">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </Providers>
      </body>
    </html>
  );
}