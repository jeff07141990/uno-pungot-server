import defaultSkins from './defaultSkins.json';

export interface CustomCardSkinMap {
  card_back?: string;
  card_back_all_wild?: string;
  card_back_flip?: string;
  card_back_dare?: string;
  skip?: string;
  reverse?: string;
  draw2?: string;
  wild?: string;
  wild4?: string;
  [cardKey: string]: string | undefined;
}

const STORAGE_KEY = 'uno_custom_card_skins';

export const getCustomCardSkins = (): CustomCardSkinMap => {
  const baseSkins: CustomCardSkinMap = { ...(defaultSkins as CustomCardSkinMap) };
  if (typeof window === 'undefined') return baseSkins;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const userCustom = JSON.parse(raw);
      return { ...baseSkins, ...userCustom };
    }
    return baseSkins;
  } catch {
    return baseSkins;
  }
};

export const saveCustomCardSkin = (type: keyof CustomCardSkinMap, dataUrl: string) => {
  if (typeof window === 'undefined') return;
  try {
    // Only store user customizations in STORAGE_KEY to avoid exceeding 5MB localStorage limit!
    let userCustom: Record<string, string> = {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        userCustom = JSON.parse(raw);
      } catch {}
    }
    userCustom[type as string] = dataUrl;
    const serialized = JSON.stringify(userCustom);
    localStorage.setItem(STORAGE_KEY, serialized);
    window.dispatchEvent(new Event('uno_skins_updated'));
  } catch (err) {
    console.error('Failed to save custom card skin to localStorage:', err);
  }
};

export const removeCustomCardSkin = (type: keyof CustomCardSkinMap) => {
  if (typeof window === 'undefined') return;
  try {
    let userCustom: Record<string, string> = {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        userCustom = JSON.parse(raw);
      } catch {}
    }
    delete userCustom[type as string];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userCustom));
    window.dispatchEvent(new Event('uno_skins_updated'));
  } catch {}
};

export const resetAllCardSkins = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('uno_skins_updated'));
};
