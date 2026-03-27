"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Recipe } from "@/lib/api";

type RecipeViewDialogProps = {
  open: boolean;
  onClose: () => void;
  recipe: Recipe | null;
};

const isHtml = (value: string) => /<[a-z][\s\S]*>/i.test(value);
const sanitizeRecipeHtml = (value: string) =>
  value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");

const formatDateTime = (rawValue: string) => {
  if (!rawValue) {
    return "-";
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return rawValue;
  }

  return parsed.toLocaleString();
};

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-blue-300/25 bg-[#0f2a4a]/45 px-3 py-2">
    <p className="text-[11px] uppercase tracking-wide text-slate-300/80">{label}</p>
    <p className="mt-1 text-sm text-slate-100">{value || "-"}</p>
  </div>
);

export function RecipeViewDialog({ open, onClose, recipe }: RecipeViewDialogProps) {
  const imageList = recipe
    ? Array.from(
        new Set(
          [recipe.recipeImage, ...(recipe.recipeImages || [])]
            .filter(Boolean)
            .map((item) => String(item))
        )
      )
    : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="w-[calc(100vw-2rem)] p-0 sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="px-6 pb-4 pt-6">
          <DialogTitle className="pr-8 text-2xl font-semibold text-slate-100">
            {recipe?.recipeName || "Recipe details"}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[calc(90vh-7rem)] overflow-y-auto px-6 pb-6 pr-4">
          {recipe ? (
            <div className="space-y-4 text-slate-100">
              {recipe.recipeImage ? (
                <img src={recipe.recipeImage} alt={recipe.recipeName} className="h-56 w-full rounded-xl object-cover" />
              ) : null}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <InfoItem label="Recipe ID" value={recipe.id} />
                <InfoItem label="Recipe Name" value={recipe.recipeName} />
                <InfoItem label="Recipe Type" value={recipe.recipeType} />
                <InfoItem label="Duration Label" value={recipe.recipeDuration} />
                <InfoItem label="Duration Minutes" value={`${recipe.durationMinutes}`} />
                <InfoItem label="User Type" value={recipe.userType} />
                <InfoItem label="Assigned User" value={recipe.assignedUser ? `${recipe.assignedUser.firstName} (${recipe.assignedUser.email})` : "-"} />
                <InfoItem label="Status" value={recipe.status} />
                <InfoItem label="Active" value={recipe.isActive ? "Yes" : "No"} />
                <InfoItem label="Nutrition Summary" value={recipe.nutritionSummary} />
                <InfoItem label="Created At" value={formatDateTime(recipe.createdAt)} />
                <InfoItem label="Updated At" value={formatDateTime(recipe.updatedAt)} />
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-blue-300/30 p-3 text-center">{recipe.caloriesKcal} kcal</div>
                <div className="rounded-lg border border-blue-300/30 p-3 text-center">{recipe.proteinG}g protein</div>
                <div className="rounded-lg border border-blue-300/30 p-3 text-center">{recipe.carbsG}g carbs</div>
                <div className="rounded-lg border border-blue-300/30 p-3 text-center">{recipe.fatG}g fat</div>
              </div>

              <div>
                <p className="mb-2 font-semibold text-white">Ingredients</p>
                {(recipe.ingredients || []).length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
                    {(recipe.ingredients || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-300">No ingredients provided.</p>
                )}
              </div>

              <div>
                <p className="mb-2 font-semibold text-white">How to prepare</p>
                {recipe.howToPrepare ? (
                  isHtml(recipe.howToPrepare) ? (
                    <div
                      className="recipe-html-content rounded-lg border border-blue-300/25 bg-[#0f2a4a]/45 px-3 py-3 text-sm text-slate-200"
                      dangerouslySetInnerHTML={{ __html: sanitizeRecipeHtml(recipe.howToPrepare) }}
                    />
                  ) : (
                    <p className="whitespace-pre-line text-sm text-slate-300">{recipe.howToPrepare}</p>
                  )
                ) : (
                  <p className="text-sm text-slate-300">No preparation guide.</p>
                )}
              </div>

              <div>
                <p className="mb-2 font-semibold text-white">Recipe Images</p>
                {imageList.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {imageList.map((imageUrl) => (
                      <img key={imageUrl} src={imageUrl} alt={recipe.recipeName} className="h-28 w-full rounded-lg object-cover" />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-300">No images available.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
