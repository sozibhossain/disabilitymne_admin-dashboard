"use client";

import { ChevronLeft, ChevronRight, Eye, Plus, SquarePen, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFilePreview } from "@/hooks/use-file-preview";
import {
  createRecipe,
  deleteRecipe,
  getAdminRecipes,
  getAdminRecipeById,
  getErrorMessage,
  getRecipePremiumUsers,
  updateRecipe,
  type Recipe,
} from "@/lib/api";

import { RecipeFormDialog, type RecipeFormState } from "./_components/recipe-form-dialog";
import { RecipeViewDialog } from "./_components/recipe-view-dialog";
import { normalizeEditorHtml, toEditorValue } from "./_components/how-to-prepare-editor";

const defaultForm: RecipeFormState = {
  recipeName: "",
  durationMinutes: "10",
  recipeType: "breakfast",
  userType: "normal_user",
  assignedUser: "",
  howToPrepare: "",
  ingredients: [],
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
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<RecipeFormState>(defaultForm);
  const [howToPrepareEditor, setHowToPrepareEditor] = useState("");
  const [ingredientInput, setIngredientInput] = useState("");
  const [recipeImageFile, setRecipeImageFile] = useState<File | null>(null);
  const [loadingRecipeId, setLoadingRecipeId] = useState<string | null>(null);
  const recipeImagePreview = useFilePreview(recipeImageFile);

  const resetFormState = () => {
    setFormData(defaultForm);
    setHowToPrepareEditor("");
    setIngredientInput("");
    setRecipeImageFile(null);
  };

  const recipesQuery = useQuery({
    queryKey: ["admin-recipes", page],
    queryFn: () => getAdminRecipes({ page, limit: 10 }),
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
  const totalCount = recipesQuery.data?.meta?.total || 0;
  const totalPages = recipesQuery.data?.meta?.totalPages || 1;
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [];

    return Array.from({ length: totalPages }, (_, index) => index + 1).slice(
      Math.max(0, page - 2),
      Math.min(totalPages, page + 1)
    );
  }, [page, totalPages]);

  const onOpenCreate = () => {
    setSelectedRecipe(null);
    resetFormState();
    setFormOpen(true);
  };

  const getRecipeDetails = async (recipeId: string) => {
    setLoadingRecipeId(recipeId);
    try {
      return await getAdminRecipeById(recipeId);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load recipe details."));
      return null;
    } finally {
      setLoadingRecipeId(null);
    }
  };

  const onOpenEdit = async (recipe: Recipe) => {
    const fullRecipe = await getRecipeDetails(recipe.id);
    if (!fullRecipe) {
      return;
    }

    const editorValue = toEditorValue(fullRecipe.howToPrepare || "");
    setSelectedRecipe(fullRecipe);
    setRecipeImageFile(null);
    setHowToPrepareEditor(editorValue);
    setIngredientInput("");
    setFormData({
      recipeName: fullRecipe.recipeName || "",
      durationMinutes: String(fullRecipe.durationMinutes || 10),
      recipeType: fullRecipe.recipeType || "breakfast",
      userType: fullRecipe.userType || "normal_user",
      assignedUser: fullRecipe.assignedUser?.id || "",
      howToPrepare: normalizeEditorHtml(editorValue),
      ingredients: fullRecipe.ingredients || [],
      recipeImage: fullRecipe.recipeImage || "",
      caloriesKcal: String(fullRecipe.caloriesKcal || 0),
      proteinG: String(fullRecipe.proteinG || 0),
      carbsG: String(fullRecipe.carbsG || 0),
      fatG: String(fullRecipe.fatG || 0),
      status: fullRecipe.status || "published",
    });
    setFormOpen(true);
  };

  const addIngredients = (rawValue: string) => {
    const parsed = rawValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (parsed.length === 0) {
      return;
    }

    setFormData((prev) => {
      const existing = new Set(prev.ingredients.map((item) => item.toLowerCase()));
      const next = [...prev.ingredients];

      for (const ingredient of parsed) {
        const normalized = ingredient.toLowerCase();
        if (existing.has(normalized)) {
          continue;
        }

        existing.add(normalized);
        next.push(ingredient);
      }

      return {
        ...prev,
        ingredients: next,
      };
    });
    setIngredientInput("");
  };

  const removeIngredient = (ingredient: string) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((item) => item !== ingredient),
    }));
  };

  const closeFormDialog = () => {
    setFormOpen(false);
    setSelectedRecipe(null);
    resetFormState();
  };

  const onSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRecipe && !recipeImageFile) {
      toast.error("Recipe image is required.");
      return;
    }

    const ingredients = [...formData.ingredients, ...ingredientInput.split(",")]
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index);

    if (ingredients.length === 0) {
      toast.error("At least one ingredient is required.");
      return;
    }

    const payload = new FormData();
    payload.append("recipeName", formData.recipeName);
    payload.append("recipeDuration", `${formData.durationMinutes} Minutes`);
    payload.append("durationMinutes", String(Number(formData.durationMinutes)));
    payload.append("recipeType", formData.recipeType);
    payload.append("userType", formData.userType);
    const howToPrepareHtml = normalizeEditorHtml(toEditorValue(formData.howToPrepare || ""));
    payload.append("howToPrepare", howToPrepareHtml);
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
    } else if (selectedRecipe && formData.recipeImage) {
      payload.append("recipeImages", JSON.stringify([formData.recipeImage]));
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
          <Button
            className="w-full rounded-md border border-[#9cd7ff6e] bg-[linear-gradient(180deg,#98d5f8_0%,#5d97c4_100%)] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_-16px_rgba(126,195,244,.8)] hover:brightness-105 md:w-auto"
            onClick={onOpenCreate}
          >
            <Plus className="mr-2 size-4" />
            Add new Recipes
          </Button>
        }
      />

      <Card className="overflow-hidden border-[#80b8df42]">
        <CardContent className="space-y-4 p-0">
          {recipesQuery.isLoading ? (
            <div className="px-4 pb-4 pt-4">
              <TableSkeleton rows={10} />
            </div>
          ) : recipes.length === 0 ? (
            <div className="px-4 pb-6 pt-4">
              <EmptyState title="No recipes found" description="Create your first recipe." />
            </div>
          ) : (
            <>
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-11 text-xs">Recipes Image</TableHead>
                    <TableHead className="h-11 text-xs">Recipes Name</TableHead>
                    <TableHead className="h-11 text-xs">Recipes Type</TableHead>
                    <TableHead className="h-11 text-xs">Recipes Time</TableHead>
                    <TableHead className="h-11 text-xs">High proteins</TableHead>
                    <TableHead className="h-11 text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipes.map((recipe) => {
                    const nutritionSummary = recipe.nutritionSummary || `${recipe.caloriesKcal}kcal, ${recipe.proteinG}gprotein, ${recipe.carbsG}gcarbs, ${recipe.fatG}gfat`;

                    return (
                      <TableRow key={recipe.id} className="border-white/30 hover:bg-white/[0.03]">
                        <TableCell className="py-3">
                          {recipe.recipeImage ? (
                            <img src={recipe.recipeImage} alt={recipe.recipeName} className="size-10 rounded-full object-cover" />
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-sm">{recipe.recipeName}</TableCell>
                        <TableCell className="py-3 text-sm capitalize">{recipe.recipeType}</TableCell>
                        <TableCell className="py-3 text-sm">{recipe.durationMinutes} minute</TableCell>
                        <TableCell className="py-3 text-xs leading-4 text-slate-200">{nutritionSummary}</TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="inline-flex h-8 items-center gap-2 rounded-md border border-[#2f80cc] bg-[#102849] px-3 text-xs font-semibold text-[#63bfff] transition-colors hover:bg-[#16345c]"
                              onClick={async () => {
                                const fullRecipe = await getRecipeDetails(recipe.id);
                                if (!fullRecipe) {
                                  return;
                                }
                                setSelectedRecipe(fullRecipe);
                                setViewOpen(true);
                              }}
                              disabled={loadingRecipeId === recipe.id}
                              aria-label="View recipe details"
                            >
                              <Eye className="size-3.5" />
                              {loadingRecipeId === recipe.id ? "Loading..." : "View Details"}
                            </button>
                            <button
                              type="button"
                              className="inline-flex size-8 items-center justify-center rounded-full bg-[#22bf61] text-white transition-colors hover:bg-[#2cd46d]"
                              onClick={() => {
                                void onOpenEdit(recipe);
                              }}
                              disabled={loadingRecipeId === recipe.id}
                              aria-label="Edit recipe"
                            >
                              <SquarePen className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex size-8 items-center justify-center rounded-full bg-[#ff2f5f] text-white transition-colors hover:bg-[#ff416f]"
                              onClick={() => {
                                setSelectedRecipe(recipe);
                                setDeleteOpen(true);
                              }}
                              aria-label="Delete recipe"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-2 border-t border-white/25 px-4 pb-4 pt-3 md:flex-row md:items-center md:justify-between">
                <p className="text-xs text-slate-300/80">
                  Showing {recipes.length > 0 ? (page - 1) * 10 + 1 : 0} to {(page - 1) * 10 + recipes.length} of {totalCount}
                  results
                </p>
                {totalPages > 1 ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded border border-white/35 text-slate-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    {pageNumbers.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`inline-flex h-8 min-w-8 items-center justify-center rounded border px-2 text-xs font-semibold transition-colors ${
                          item === page
                            ? "border-white bg-white text-[#0f2747]"
                            : "border-white/35 bg-transparent text-slate-100 hover:bg-white/10"
                        }`}
                        onClick={() => setPage(item)}
                        aria-label={`Go to page ${item}`}
                      >
                        {item}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded border border-[#7fc7f6] bg-[#6aaee0] text-white transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <RecipeFormDialog
        open={formOpen}
        selectedRecipe={selectedRecipe}
        formData={formData}
        ingredientInput={ingredientInput}
        howToPrepareEditor={howToPrepareEditor}
        premiumUsers={premiumUsersQuery.data || []}
        recipeImagePreview={recipeImagePreview}
        isSaving={createMutation.isPending || updateMutation.isPending}
        onClose={closeFormDialog}
        onSubmit={onSubmitForm}
        setFormData={setFormData}
        setIngredientInput={setIngredientInput}
        setRecipeImageFile={setRecipeImageFile}
        addIngredients={addIngredients}
        removeIngredient={removeIngredient}
        setHowToPrepareEditor={setHowToPrepareEditor}
      />

      <RecipeViewDialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        recipe={selectedRecipe}
      />

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
