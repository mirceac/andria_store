import { ShoppingCart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function Header() {
  const router = useRouter();

  return (
    <header className="border-b bg-white">
      <div className="container flex items-center justify-between h-16">
        <Link href="/" className="font-semibold text-lg">
          Andria Store
        </Link>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/profile">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => router.push('/api/auth/signin')}
          >
            Sign In
          </Button>
        </div>
      </div>
    </header>
  );
}