export interface VatSettings {
  enabled: boolean;
  ratePercent: number; // 0, 5, 8, 10
  pricesIncludeVat: boolean;
  vatNumber?: string;
  note?: string;
}

export interface KitchenSettings {
  kdsEnabled: boolean;
  autoPrintKitchenTicket: boolean;
  alertSoundEnabled: boolean;
  maxPreparationMinutes: number;
}

const VAT_STORAGE_KEY = 'h2_vat_settings';
const KITCHEN_STORAGE_KEY = 'h2_kitchen_settings';

export const getDefaultVatSettings = (): VatSettings => ({
  enabled: true,
  ratePercent: 10,
  pricesIncludeVat: false,
  vatNumber: '0312345678',
  note: 'Thuế giá trị gia tăng áp dụng theo quy định hiện hành',
});

export const getDefaultKitchenSettings = (): KitchenSettings => ({
  kdsEnabled: true,
  autoPrintKitchenTicket: true,
  alertSoundEnabled: true,
  maxPreparationMinutes: 15,
});

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) return (globalThis as any).localStorage;
  return null;
}

export const getVatSettings = (): VatSettings => {
  const storage = getStorage();
  if (!storage) return getDefaultVatSettings();
  try {
    const raw = storage.getItem(VAT_STORAGE_KEY);
    if (!raw) return getDefaultVatSettings();
    return { ...getDefaultVatSettings(), ...JSON.parse(raw) };
  } catch {
    return getDefaultVatSettings();
  }
};

export const saveVatSettings = (settings: VatSettings): boolean => {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(VAT_STORAGE_KEY, JSON.stringify(settings));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('h2_vat_settings_changed'));
    }
    return true;
  } catch {
    return false;
  }
};

export const getKitchenSettings = (): KitchenSettings => {
  const storage = getStorage();
  if (!storage) return getDefaultKitchenSettings();
  try {
    const raw = storage.getItem(KITCHEN_STORAGE_KEY);
    if (!raw) return getDefaultKitchenSettings();
    return { ...getDefaultKitchenSettings(), ...JSON.parse(raw) };
  } catch {
    return getDefaultKitchenSettings();
  }
};

export const saveKitchenSettings = (settings: KitchenSettings): boolean => {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(KITCHEN_STORAGE_KEY, JSON.stringify(settings));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('h2_kitchen_settings_changed'));
    }
    return true;
  } catch {
    return false;
  }
};
