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

export const compressCardSkinDataUrl = (dataUrl: string, maxWidth = 260, maxHeight = 390): Promise<string> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(dataUrl);
    // If not a base64 image or already small, return
    if (!dataUrl.startsWith('data:image/')) return resolve(dataUrl);

    const img = new Image();
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/webp', 0.85);
          resolve(compressed);
          return;
        }
      } catch {}
      resolve(dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export const saveCustomCardSkin = async (type: keyof CustomCardSkinMap, dataUrl: string): Promise<string> => {
  if (typeof window === 'undefined') return dataUrl;
  try {
    const optimized = await compressCardSkinDataUrl(dataUrl);
    let userCustom: Record<string, string> = {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        userCustom = JSON.parse(raw);
      } catch {}
    }
    userCustom[type as string] = optimized;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userCustom));
    } catch (storageErr) {
      console.warn('Quota reached on first try, attempting aggressive compression:', storageErr);
      // If quota exceeded, try higher compression
      const ultraCompressed = await compressCardSkinDataUrl(dataUrl, 200, 300);
      userCustom[type as string] = ultraCompressed;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userCustom));
    }
    window.dispatchEvent(new Event('uno_skins_updated'));
    return userCustom[type as string] || optimized;
  } catch (err) {
    console.error('Failed to save custom card skin to localStorage:', err);
    return dataUrl;
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
