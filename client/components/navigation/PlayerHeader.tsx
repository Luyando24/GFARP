import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/navigation/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

export default function PlayerHeader() {
  const { logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 z-50 shadow-sm">
      <div className="container mx-auto flex items-center justify-between py-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          {/* Using a generic football icon or text if logo not available */}
          <div className="h-10 w-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
            SC
          </div>
          <div>
            <span className="text-2xl font-bold text-green-700">Soccer Circular</span>
            <p className="text-xs text-muted-foreground">Player Portal</p>
          </div>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-base font-medium">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" onClick={logout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </nav>
        
        {/* Mobile Navigation */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button variant="ghost" onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>
      
      {isMenuOpen && (
        <div className="md:hidden bg-background border-t">
          <nav className="flex flex-col gap-4 p-4">
             <Button variant="ghost" onClick={logout} className="justify-start gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
