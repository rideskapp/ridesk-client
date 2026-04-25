
export const PRICE_TYPE = {
  PER_PERSON: "per_person",
  PER_COUPLE: "per_couple",
  FIXED: "fixed",
} as const;

export type PriceType = typeof PRICE_TYPE[keyof typeof PRICE_TYPE];

export const PRICE_TYPES = [PRICE_TYPE.PER_PERSON, PRICE_TYPE.PER_COUPLE, PRICE_TYPE.FIXED] as const;

