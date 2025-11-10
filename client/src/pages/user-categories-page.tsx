import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Edit, Plus, ArrowLeft, Globe, Lock, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';

type Category = {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  user_id: number | null;
  username?: string | null;
  is_public: boolean;
  hidden: boolean;
  created_at: string;
};

export default function UserCategoriesPage() {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: '',
    is_public: true,
    hidden: false,
  });
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch only the user's own categories
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: [`/api/users/${user?.id}/categories`],
    enabled: !!user?.id,
  });

  // Helper types for hierarchy
  type CategoryWithChildren = Category & { children: CategoryWithChildren[] };
  type CategoryWithLevel = Category & { level: number };

  // Helper function to build hierarchical structure
  const buildCategoryTree = (categories: Category[]): CategoryWithChildren[] => {
    const categoryMap = new Map<number, CategoryWithChildren>();
    const rootCategories: CategoryWithChildren[] = [];
    
    // First pass: create map of all categories with children array
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });
    
    // Second pass: build hierarchy
    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id)!;
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.children.push(categoryWithChildren);
        }
      } else {
        rootCategories.push(categoryWithChildren);
      }
    });
    
    return rootCategories;
  };

  // Helper function to flatten hierarchy for display
  const flattenCategories = (categories: CategoryWithChildren[], level = 0): CategoryWithLevel[] => {
    const result: CategoryWithLevel[] = [];
    
    categories.forEach(category => {
      result.push({ ...category, level });
      if (category.children.length > 0) {
        result.push(...flattenCategories(category.children, level + 1));
      }
    });
    
    return result;
  };

  const hierarchicalCategories = flattenCategories(buildCategoryTree(categories));

  // Mutation for creating/updating categories
  const saveCategoryMutation = useMutation({
    mutationFn: async (data: { url: string; method: string; body: any }) => {
      const response = await fetch(data.url, {
        method: data.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.body),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save category');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all category queries to refresh everywhere
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories/tree'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/categories`] });
      toast({
        title: 'Success',
        description: `Category ${editingCategory ? 'updated' : 'created'} successfully`,
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation for deleting categories
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete category');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all category queries to refresh everywhere
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories/tree'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/categories`] });
      toast({
        title: 'Success',
        description: 'Category deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
    const method = editingCategory ? 'PUT' : 'POST';

    // Prepare the data - users can now create both public and private categories
    // For user profile page, always create user-owned categories (even for admins)
    const submitData = {
      name: formData.name,
      description: formData.description,
      parent_id: formData.parent_id && formData.parent_id !== "none" ? parseInt(formData.parent_id) : null,
      is_public: formData.is_public,
      hidden: formData.hidden,
      user_owned: true, // Flag to indicate this should be user-owned
    };

    saveCategoryMutation.mutate({ url, method, body: submitData });
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id ? category.parent_id.toString() : 'none',
      is_public: category.is_public ?? false,
      hidden: category.hidden ?? false,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    deleteCategoryMutation.mutate(categoryId);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parent_id: '',
      is_public: true,
      hidden: false,
    });
    setEditingCategory(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href="/profile">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Products
          </Button>
        </Link>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Categories</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </DialogTitle>
              <DialogDescription>
                {editingCategory ? 'Update your category details below.' : 'Create a new category. Public categories are visible to all users, private categories only to you.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="parent">Parent Category</Label>
                  <Select
                    value={formData.parent_id || "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, parent_id: value === "none" ? '' : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None (Root Category)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Root Category)</SelectItem>
                      {categories
                        .filter((cat) => !editingCategory || cat.id !== editingCategory.id)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-base font-semibold">Visibility Settings</Label>
                  <div className="space-y-3 p-3 border rounded-md">
                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="is_public"
                        checked={formData.is_public}
                        onChange={(e) =>
                          setFormData({ ...formData, is_public: e.target.checked })
                        }
                        className="h-4 w-4 mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="is_public" className="font-normal cursor-pointer">
                          Public Category
                        </Label>
                        <p className="text-sm text-gray-500 mt-1">
                          Public categories are visible to all users including guests
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="hidden"
                        checked={formData.hidden}
                        onChange={(e) =>
                          setFormData({ ...formData, hidden: e.target.checked })
                        }
                        className="h-4 w-4 mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="hidden" className="font-normal cursor-pointer">
                          Hidden
                        </Label>
                        <p className="text-sm text-gray-500 mt-1">
                          Hidden categories are not visible to anyone in the gallery (only in admin/your management page)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saveCategoryMutation.isPending}>
                  {saveCategoryMutation.isPending ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {hierarchicalCategories.map((category) => (
          <Card key={category.id} className={`${category.level > 0 ? 'ml-8' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-semibold flex items-center">
                {category.level > 0 && (
                  <span className="text-gray-400 mr-2">
                    {'├─'.repeat(category.level)}
                  </span>
                )}
                {category.name}
                {category.level > 0 && (
                  <span className="text-sm text-gray-500 ml-2">
                    (Child of: {categories.find(c => c.id === category.parent_id)?.name})
                  </span>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleEdit(category)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDelete(category.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-2">
                {category.is_public ? (
                  <Badge variant="default" className="bg-green-600">
                    <Globe className="h-3 w-3 mr-1" />
                    Public
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Lock className="h-3 w-3 mr-1" />
                    Private
                  </Badge>
                )}
                {category.hidden && (
                  <Badge variant="destructive">
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hidden
                  </Badge>
                )}
              </div>
              {category.description && (
                <p className="text-gray-600 mb-2">{category.description}</p>
              )}
              <p className="text-sm text-gray-500">
                Created: {new Date(category.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
        
        {categories.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No categories found. Create your first category to organize your products.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
