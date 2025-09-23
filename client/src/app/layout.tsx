import { Providers } from "./providers";
import { Header } from "@/components/header";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background overflow-x-hidden">
        <Providers>
          <main className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden">
            <div className="w-full max-w-full overflow-x-hidden">
              {children}
            </div>
          </main>
        </Providers>
      </body>
    </html>
  );
}