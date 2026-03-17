"use client";

import { Edit3, Eye, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Pagination } from "@/components/shared/pagination";
import { StatusChip } from "@/components/shared/status-chip";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useFilePreview } from "@/hooks/use-file-preview";
import {
  createRecipe,
  deleteRecipe,
  getAdminRecipes,
  getErrorMessage,
  getRecipePremiumUsers,
  updateRecipe,
  type Recipe,
} from "@/lib/api";

const defaultForm = {
  recipeName: "",
  durationMinutes: "10",
  recipeType: "breakfast",
  userType: "normal_user",
  assignedUser: "",
  howToPrepare: "",
  ingredients: "",
  recipeImage: "",
  caloriesKcal: "420",
  proteinG: "28",
  carbsG: "52",
  fatG: "8",
  status: "published",
};

export default function RecipesManagementPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(defaultForm);
  const [recipeImageFile, setRecipeImageFile] = useState<File | null>(null);
  const recipeImagePreview = useFilePreview(recipeImageFile);

  const resetFormState = () => {
    setFormData(defaultForm);
    setRecipeImageFile(null);
  };

  const recipesQuery = useQuery({
    queryKey: ["admin-recipes", page, search, status],
    queryFn: () => getAdminRecipes({ page, limit: 10, search, status: status || undefined }),
  });

  const premiumUsersQuery = useQuery({
    queryKey: ["recipe-premium-users"],
    queryFn: () => getRecipePremiumUsers(),
  });

  const createMutation = useMutation({
    mutationFn: createRecipe,
    onSuccess: () => {
      toast.success("Recipe created.");
      setFormOpen(false);
      resetFormState();
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ recipeId, payload }: { recipeId: string; payload: Parameters<typeof updateRecipe>[1] }) =>
      updateRecipe(recipeId, payload),
    onSuccess: () => {
      toast.success("Recipe updated.");
      setFormOpen(false);
      setSelectedRecipe(null);
      resetFormState();
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecipe,
    onSuccess: () => {
      toast.success("Recipe archived.");
      setDeleteOpen(false);
      setSelectedRecipe(null);
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const recipes = useMemo(() => recipesQuery.data?.data || [], [recipesQuery.data?.data]);

  const onOpenCreate = () => {
    setSelectedRecipe(null);
    resetFormState();
    setFormOpen(true);
  };

  const onOpenEdit = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setRecipeImageFile(null);
    setFormData({
      recipeName: recipe.recipeName || "",
      durationMinutes: String(recipe.durationMinutes || 10),
      recipeType: recipe.recipeType || "breakfast",
      userType: recipe.userType || "normal_user",
      assignedUser: recipe.assignedUser?.id || "",
      howToPrepare: recipe.howToPrepare || "",
      ingredients: (recipe.ingredients || []).join(", "),
      recipeImage: recipe.recipeImage || "",
      caloriesKcal: String(recipe.caloriesKcal || 0),
      proteinG: String(recipe.proteinG || 0),
      carbsG: String(recipe.carbsG || 0),
      fatG: String(recipe.fatG || 0),
      status: recipe.status || "published",
    });
    setFormOpen(true);
  };

  const onSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRecipe && !recipeImageFile) {
      toast.error("Recipe image is required.");
      return;
    }

    const ingredients = formData.ingredients
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = new FormData();
    payload.append("recipeName", formData.recipeName);
    payload.append("recipeDuration", `${formData.durationMinutes} Minutes`);
    payload.append("durationMinutes", String(Number(formData.durationMinutes)));
    payload.append("recipeType", formData.recipeType);
    payload.append("userType", formData.userType);
    payload.append("howToPrepare", formData.howToPrepare);
    payload.append("ingredients", JSON.stringify(ingredients));
    payload.append("caloriesKcal", formData.caloriesKcal);
    payload.append("proteinG", formData.proteinG);
    payload.append("carbsG", formData.carbsG);
    payload.append("fatG", formData.fatG);
    payload.append("status", formData.status);

    if (formData.userType === "premium_user" && formData.assignedUser) {
      payload.append("assignedUser", formData.assignedUser);
    }

    if (recipeImageFile) {
      payload.append("recipeImages", recipeImageFile);
    }

    if (selectedRecipe) {
      updateMutation.mutate({ recipeId: selectedRecipe.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-5">
      <PageTitle
        title="Recipes Management"
        breadcrumb="Dashboard  >  Recipes Management"
        action={
          <Button className="w-full md:w-auto" onClick={onOpenCreate}>
            <Plus className="mr-2 size-4" />
            Add new Recipes
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-300" />
              <Input
                className="pl-10"
                placeholder="Search recipes"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
              />
            </div>
            <Select
              value={status}
              className="md:w-48"
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
            >
              <option value="">All status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </Select>
          </div>

          {recipesQuery.isLoading ? (
            <TableSkeleton rows={10} />
          ) : recipes.length === 0 ? (
            <EmptyState title="No recipes found" description="Create your first recipe." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipes Image</TableHead>
                    <TableHead>Recipes Name</TableHead>
                    <TableHead>Recipes Type</TableHead>
                    <TableHead>Recipes Time</TableHead>
                    <TableHead>High proteins</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipes.map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell>
                        {recipe.recipeImage ? (
                          <img src={recipe.recipeImage} alt={recipe.recipeName} className="size-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{recipe.recipeName}</TableCell>
                      <TableCell className="capitalize">{recipe.recipeType}</TableCell>
                      <TableCell>{recipe.durationMinutes} min</TableCell>
                      <TableCell>{recipe.nutritionSummary}</TableCell>
                      <TableCell>
                        <StatusChip value={recipe.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedRecipe(recipe);
                              setViewOpen(true);
                            }}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button variant="secondary" size="icon" onClick={() => onOpenEdit(recipe)}>
                            <Edit3 className="size-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                              setSelectedRecipe(recipe);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <p className="text-sm text-slate-300">
                Showing {recipes.length > 0 ? (page - 1) * 10 + 1 : 0} to {(page - 1) * 10 + recipes.length} of {recipesQuery.data?.meta?.total || 0}
                results
              </p>

              <Pagination page={page} totalPages={recipesQuery.data?.meta?.totalPages || 1} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedRecipe(null);
          resetFormState();
        }}
        title={selectedRecipe ? "Edit Recipe" : "Add New Recipes"}
      >
        <form className="space-y-4" onSubmit={onSubmitForm}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Recipes Name</Label>
              <Input
                value={formData.recipeName}
                onChange={(event) => setFormData((prev) => ({ ...prev, recipeName: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>User type</Label>
              <Select
                value={formData.userType}
                onChange={(event) => setFormData((prev) => ({ ...prev, userType: event.target.value }))}
              >
                <option value="normal_user">Normal user</option>
                <option value="premium_user">Premium user</option>
              </Select>
            </div>
            {formData.userType === "premium_user" ? (
              <div className="space-y-2 md:col-span-2">
                <Label>Assigned Premium User</Label>
                <Select
                  value={formData.assignedUser}
                  onChange={(event) => setFormData((prev) => ({ ...prev, assignedUser: event.target.value }))}
                  required
                >
                  <option value="">Select premium user</option>
                  {(premiumUsersQuery.data || []).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} ({user.email})
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Recipes Duration (Minutes)</Label>
              <Input
                type="number"
                min={1}
                value={formData.durationMinutes}
                onChange={(event) => setFormData((prev) => ({ ...prev, durationMinutes: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Recipes Type</Label>
              <Select
                value={formData.recipeType}
                onChange={(event) => setFormData((prev) => ({ ...prev, recipeType: event.target.value }))}
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
                <option value="meal">Meal</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>How to prepare a meal</Label>
              <Textarea
                value={formData.howToPrepare}
                onChange={(event) => setFormData((prev) => ({ ...prev, howToPrepare: event.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Ingredients (comma separated)</Label>
              <Input
                value={formData.ingredients}
                onChange={(event) => setFormData((prev) => ({ ...prev, ingredients: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Recipe Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => setRecipeImageFile(event.target.files?.[0] || null)}
                required={!selectedRecipe}
              />
              {recipeImagePreview || formData.recipeImage ? (
                <img
                  src={recipeImagePreview || formData.recipeImage}
                  alt="Recipe preview"
                  className="h-40 w-full rounded-lg object-cover"
                />
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Calories (kcal)</Label>
              <Input
                type="number"
                min={0}
                value={formData.caloriesKcal}
                onChange={(event) => setFormData((prev) => ({ ...prev, caloriesKcal: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Protein (g)</Label>
              <Input
                type="number"
                min={0}
                value={formData.proteinG}
                onChange={(event) => setFormData((prev) => ({ ...prev, proteinG: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Carbs (g)</Label>
              <Input
                type="number"
                min={0}
                value={formData.carbsG}
                onChange={(event) => setFormData((prev) => ({ ...prev, carbsG: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Fat (g)</Label>
              <Input
                type="number"
                min={0}
                value={formData.fatG}
                onChange={(event) => setFormData((prev) => ({ ...prev, fatG: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : selectedRecipe
                  ? "Save"
                  : "Add Plan"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title={selectedRecipe?.recipeName || "Recipe details"}>
        {selectedRecipe ? (
          <div className="space-y-4 text-slate-100">
            {selectedRecipe.recipeImage ? (
              <img src={selectedRecipe.recipeImage} alt={selectedRecipe.recipeName} className="h-56 w-full rounded-xl object-cover" />
            ) : null}
            <p className="text-sm text-slate-300">{selectedRecipe.recipeType} | {selectedRecipe.durationMinutes} minutes</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-blue-300/30 p-3 text-center">{selectedRecipe.caloriesKcal} kcal</div>
              <div className="rounded-lg border border-blue-300/30 p-3 text-center">{selectedRecipe.proteinG}g protein</div>
              <div className="rounded-lg border border-blue-300/30 p-3 text-center">{selectedRecipe.carbsG}g carbs</div>
              <div className="rounded-lg border border-blue-300/30 p-3 text-center">{selectedRecipe.fatG}g fat</div>
            </div>
            <div>
              <p className="mb-2 font-semibold text-white">Ingredients</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
                {(selectedRecipe.ingredients || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-slate-300">{selectedRecipe.howToPrepare || "No preparation guide"}</p>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (selectedRecipe) {
            deleteMutation.mutate(selectedRecipe.id);
          }
        }}
        title="Are you sure?"
        description="You want to delete this recipe from your dashboard."
        confirmText="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
