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
  const current = getCustomCardSkins();
  current[type] = dataUrl;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new Event('uno_skins_updated'));
};

export const removeCustomCardSkin = (type: keyof CustomCardSkinMap) => {
  if (typeof window === 'undefined') return;
  const current = getCustomCardSkins();
  delete current[type];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new Event('uno_skins_updated'));
};

export const resetAllCardSkins = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('uno_skins_updated'));
};
