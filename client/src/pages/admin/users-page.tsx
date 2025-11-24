import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2, User, Mail, Shield, Calendar } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type User = {
  id: number;
  username: string;
  is_admin: boolean;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  picture: string | null;
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.is_admin,
  });

  if (!user?.is_admin) {
    return (
      <div className={`container mx-auto ${isMobile ? 'px-2 py-4' : 'ml-16 px-4 py-8'}`}>
        <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>Unauthorized Access</h1>
        <p className="text-muted-foreground mt-2">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isMobile ? '' : 'ml-16'}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUserInitials = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.username[0].toUpperCase();
  };

  return (
    <div className={`container mx-auto ${isMobile ? 'px-2 py-4' : 'ml-16 py-8 px-4'}`}>
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'justify-between items-center'} mb-8`}>
        <div>
          <h1 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold`}>Users Management</h1>
          <p className="text-muted-foreground mt-2">
            Total Users: {users?.length || 0}
          </p>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Avatar</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Role</TableHead>
              <TableHead className="text-center">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users && users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.picture || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                        {getUserInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{user.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.first_name || user.last_name ? (
                      <span>
                        {user.first_name} {user.last_name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">Not provided</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Not provided</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {user.is_admin ? (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-200">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        User
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {formatDate(user.created_at)}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
