import { useState, useEffect } from "react";
import type { Product } from "@/lib/store";

export type CategoryAffinity = "smart-home" | "beauty-wellness" | "neutral";

export interface UserPreferences {
  smartHomeScore: number;
  beautyWellnessScore: number;
  lastCategory: CategoryAffinity;
  searchQueries: string[];
  viewedHandles: string[];
}

const STORAGE_KEY = "nexus_user_personalization_v1";

const defaultPreferences: UserPreferences = {
  smartHomeScore: 0,
  beautyWellnessScore: 0,
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
      const isBeauty = product.tags.some((t) => t.toLowerCase().includes("beauty") || t.toLowerCase().includes("wellness") || t.toLowerCase().includes("skin")) || product.categoryLabel.toLowerCase().includes("beauty");

      const smartHomeInc = isSmartHome ? 3 : 0;
      const beautyInc = isBeauty ? 3 : 0;

      const updatedHandles = Array.from(new Set([product.handle, ...prev.viewedHandles])).slice(0, 20);

      return {
        ...prev,
        smartHomeScore: prev.smartHomeScore + smartHomeInc,
        beautyWellnessScore: prev.beautyWellnessScore + beautyInc,
        lastCategory: isSmartHome ? "smart-home" : isBeauty ? "beauty-wellness" : prev.lastCategory,
        viewedHandles: updatedHandles,
      };
    });
  };

  const trackCategoryView = (category: "smart-home" | "beauty-wellness") => {
    setPreferences((prev) => ({
      ...prev,
      smartHomeScore: category === "smart-home" ? prev.smartHomeScore + 5 : prev.smartHomeScore,
      beautyWellnessScore: category === "beauty-wellness" ? prev.beautyWellnessScore + 5 : prev.beautyWellnessScore,
      lastCategory: category,
    }));
  };

  const trackAiInteraction = (promptText: string) => {
    const text = promptText.toLowerCase();
    const isSmartHome = text.includes("smart") || text.includes("home") || text.includes("automation") || text.includes("light") || text.includes("sensor");
    const isBeauty = text.includes("beauty") || text.includes("wellness") || text.includes("skin") || text.includes("face") || text.includes("diffuser");

    if (isSmartHome || isBeauty) {
      setPreferences((prev) => ({
        ...prev,
        smartHomeScore: isSmartHome ? prev.smartHomeScore + 4 : prev.smartHomeScore,
        beautyWellnessScore: isBeauty ? prev.beautyWellnessScore + 4 : prev.beautyWellnessScore,
        lastCategory: isSmartHome ? "smart-home" : isBeauty ? "beauty-wellness" : prev.lastCategory,
      }));
    }
  };

  const sortProductsByPreference = (products: Product[]): Product[] => {
    const { smartHomeScore, beautyWellnessScore } = preferences;
    if (smartHomeScore === 0 && beautyWellnessScore === 0) return products;

    const preferredCategory = smartHomeScore >= beautyWellnessScore ? "smart-home" : "beauty-wellness";

    return [...products].sort((a, b) => {
      const aMatch = a.tags.includes(preferredCategory) || (preferredCategory === "smart-home" && a.categoryLabel.toLowerCase().includes("smart")) || (preferredCategory === "beauty-wellness" && a.categoryLabel.toLowerCase().includes("beauty"));
      const bMatch = b.tags.includes(preferredCategory) || (preferredCategory === "smart-home" && b.categoryLabel.toLowerCase().includes("smart")) || (preferredCategory === "beauty-wellness" && b.categoryLabel.toLowerCase().includes("beauty"));

      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  };

  const primaryAffinity: CategoryAffinity =
    preferences.smartHomeScore > preferences.beautyWellnessScore
      ? "smart-home"
      : preferences.beautyWellnessScore > preferences.smartHomeScore
      ? "beauty-wellness"
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
