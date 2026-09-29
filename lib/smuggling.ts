/** Booze / narcotics item owned on the smuggle market. */
export interface SmugglingGood {
  id: number;
  owner: string;
  categoryId: number;
  typeId: number;
  isSold: boolean;
}

/** Holdings count per typeId, with every one of the 7 good types present (0 when not held). */
export function countHoldingsByType(holdings: SmugglingGood[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (let i = 0; i < 7; i++) counts[i] = 0;
  for (const good of holdings) {
    counts[good.typeId] = (counts[good.typeId] || 0) + 1;
  }
  return counts;
}
