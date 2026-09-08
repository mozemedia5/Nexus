import { useState, useEffect } from "react";
import type { Product } from "@/lib/store";

export type CategoryAffinity = "smart-home" | "workspace-productivity" | "neutral";

export interface UserPreferences {
  smartHomeScore: number;
  workspaceScore: number;
  lastCategory: CategoryAffinity;
  searchQueries: string[];
  viewedHandles: string[];
}

const STORAGE_KEY = "nexus_user_personalization_v1";

const defaultPreferences: UserPreferences = {
  smartHomeScore: 0,
  workspaceScore: 0,
  lastCategory: "neutral",
  searchQueries: [],
  viewedHandles: [],
};

export function usePersonalization() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultPreferences;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {}
  }, [preferences]);

  const trackProductView = (product: Product) => {
    setPreferences((prev) => {
      const isSmartHome = product.tags.some((t) => t.toLowerCase().includes("smart") || t.toLowerCase().includes("home")) || product.categoryLabel.toLowerCase().includes("smart");
      const isWorkspace = product.tags.some((t) => t.toLowerCase().includes("workspace") || t.toLowerCase().includes("desk") || t.toLowerCase().includes("dock")) || product.categoryLabel.toLowerCase().includes("workspace");

      const smartHomeInc = isSmartHome ? 3 : 0;
      const workspaceInc = isWorkspace ? 3 : 0;

      const updatedHandles = Array.from(new Set([product.handle, ...prev.viewedHandles])).slice(0, 20);

      return {
        ...prev,
        smartHomeScore: prev.smartHomeScore + smartHomeInc,
        workspaceScore: prev.workspaceScore + workspaceInc,
        lastCategory: isSmartHome ? "smart-home" : isWorkspace ? "workspace-productivity" : prev.lastCategory,
        viewedHandles: updatedHandles,
      };
    });
  };

  const trackCategoryView = (category: "smart-home" | "workspace-productivity") => {
    setPreferences((prev) => ({
      ...prev,
      smartHomeScore: category === "smart-home" ? prev.smartHomeScore + 5 : prev.smartHomeScore,
      workspaceScore: category === "workspace-productivity" ? prev.workspaceScore + 5 : prev.workspaceScore,
      lastCategory: category,
    }));
  };

  const trackAiInteraction = (promptText: string) => {
    const text = promptText.toLowerCase();
    const isSmartHome = text.includes("smart") || text.includes("home") || text.includes("automation") || text.includes("light") || text.includes("sensor");
    const isWorkspace = text.includes("desk") || text.includes("workspace") || text.includes("dock") || text.includes("monitor") || text.includes("lamp");

    if (isSmartHome || isWorkspace) {
      setPreferences((prev) => ({
        ...prev,
        smartHomeScore: isSmartHome ? prev.smartHomeScore + 4 : prev.smartHomeScore,
        workspaceScore: isWorkspace ? prev.workspaceScore + 4 : prev.workspaceScore,
        lastCategory: isSmartHome ? "smart-home" : isWorkspace ? "workspace-productivity" : prev.lastCategory,
      }));
    }
  };

  const sortProductsByPreference = (products: Product[]): Product[] => {
    const { smartHomeScore, workspaceScore } = preferences;
    if (smartHomeScore === 0 && workspaceScore === 0) return products;

    const preferredCategory = smartHomeScore >= workspaceScore ? "smart-home" : "workspace-productivity";

    return [...products].sort((a, b) => {
      const aMatch = a.tags.includes(preferredCategory) || (preferredCategory === "smart-home" && a.categoryLabel.toLowerCase().includes("smart")) || (preferredCategory === "workspace-productivity" && a.categoryLabel.toLowerCase().includes("workspace"));
      const bMatch = b.tags.includes(preferredCategory) || (preferredCategory === "smart-home" && b.categoryLabel.toLowerCase().includes("smart")) || (preferredCategory === "workspace-productivity" && b.categoryLabel.toLowerCase().includes("workspace"));

      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  };

  const primaryAffinity: CategoryAffinity =
    preferences.smartHomeScore > preferences.workspaceScore
      ? "smart-home"
      : preferences.workspaceScore > preferences.smartHomeScore
      ? "workspace-productivity"
      : preferences.lastCategory;

  return {
    preferences,
    primaryAffinity,
    trackProductView,
    trackCategoryView,
    trackAiInteraction,
    sortProductsByPreference,
  };
}
