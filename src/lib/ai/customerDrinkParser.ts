import { extractNoteAndOptions } from './ruleEngine';

/**
 * Tách mức đường, đá, size (S/M/L) và danh sách topping từ yêu cầu bằng văn bản/giọng nói của khách
 */
export function parseDrinkCustomization(text: string): {
  sugar: string;
  ice: string;
  size: 'S' | 'M' | 'L';
  toppings: string[];
} {
  const norm = text.toLowerCase();
  const detailed = extractNoteAndOptions(text);

  let sugar = '100% đường';
  if (/(?:^|\D)(?:0%\s*đường|0\s*đường)|không\s*đường|không\s*ngọt/i.test(norm) || detailed.sugar === '0%') {
    sugar = '0% đường';
  } else if (/(?:^|\D)(?:30%\s*đường|30\s*đường)|ít\s*đường|ít\s*ngọt/i.test(norm) || detailed.sugar === '30%') {
    sugar = '30% đường';
  } else if (/(?:^|\D)(?:50%\s*đường|50\s*đường)|nửa\s*đường|vừa\s*đường/i.test(norm) || detailed.sugar === '50%') {
    sugar = '50% đường';
  } else if (/(?:^|\D)(?:70%\s*đường|70\s*đường)|hơi\s*ngọt/i.test(norm) || detailed.sugar === '70%') {
    sugar = '70% đường';
  }

  let ice = '100% đá';
  if (/nóng|ấm/i.test(norm) || detailed.ice === 'nóng') {
    ice = 'Nóng';
  } else if (/đá\s*để\s*riêng|để\s*đá\s*riêng|đá\s*riêng|tách\s*đá/i.test(norm) || detailed.ice === 'đá riêng') {
    ice = 'đá riêng';
  } else if (/(?:^|\D)(?:0%\s*đá|0\s*đá)|không\s*đá/i.test(norm) || detailed.ice === 'không đá' || detailed.ice === '0% đá') {
    ice = '0% đá';
  } else if (/(?:^|\D)(?:30%\s*đá|30\s*đá)|ít\s*đá/i.test(norm) || detailed.ice === 'ít đá' || detailed.ice === '30% đá') {
    ice = '30% đá';
  } else if (/(?:^|\D)(?:50%\s*đá|50\s*đá)|nửa\s*đá/i.test(norm) || detailed.ice === '50% đá') {
    ice = '50% đá';
  } else if (/(?:^|\D)(?:70%\s*đá|70\s*đá)/i.test(norm) || detailed.ice === '70% đá') {
    ice = '70% đá';
  }

  let size: 'S' | 'M' | 'L' = 'M';
  if (/\bsize\s*s\b|\bly\s*s\b|\bcỡ\s*s\b|\b(size|ly|cỡ|cốc)\s*(nhỏ|bé)\b/i.test(norm) || detailed.size === 'S') {
    size = 'S';
  } else if (/\bsize\s*l\b|\bly\s*l\b|\bcỡ\s*l\b|\b(size|ly|cỡ|cốc)\s*(lớn|to)\b/i.test(norm) || detailed.size === 'L') {
    size = 'L';
  }

  return {
    sugar,
    ice,
    size,
    toppings: Array.from(detailed.toppings || []),
  };
}
