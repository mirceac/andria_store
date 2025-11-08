import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe, UserCircle2, Check } from "lucide-react";

type ViewMode = 'public' | 'profile';

export function ProfileSwitcher() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('public');

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('viewMode') as ViewMode;
    if (saved) {
      setViewMode(saved);
    }
  }, []);

  // Save preference to localStorage and navigate
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('viewMode', mode);
    
    // Navigate to appropriate page
    if (mode === 'profile') {
      navigate('/profile');
    } else {
      navigate('/');
    }
    
    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('viewModeChange', { detail: mode }));
  };

  // Only show for authenticated users
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="bg-blue-50 text-slate-600 hover:bg-blue-100 hover:text-slate-700 font-medium">
          {viewMode === 'public' ? (
            <>
              <Globe className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Public Gallery</span>
            </>
          ) : (
            <>
              <UserCircle2 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">My Profile</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={() => handleViewModeChange('public')}
          className="cursor-pointer"
        >
          <Globe className="mr-2 h-4 w-4" />
          <span>Public Gallery</span>
          {viewMode === 'public' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleViewModeChange('profile')}
          className="cursor-pointer"
        >
          <UserCircle2 className="mr-2 h-4 w-4" />
          <span>My Profile</span>
          {viewMode === 'profile' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Custom hook to use the view mode in other components
export function useViewMode() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('viewMode') as ViewMode) || 'public';
  });

  useEffect(() => {
    const handleViewModeChange = (e: CustomEvent<ViewMode>) => {
      setViewMode(e.detail);
    };

    window.addEventListener('viewModeChange', handleViewModeChange as EventListener);
    return () => {
      window.removeEventListener('viewModeChange', handleViewModeChange as EventListener);
    };
  }, []);

  return viewMode;
}
