// Perk item categories 18..47. Within a category, typeId encodes amountIndex * DURATIONS.length + durationIndex.
const SUCCESS_OPTIONS = ["Crime", "NickCar", "Booze", "Narcotics", "KillSkill", "BustOut"];
const COOLDOWN_OPTIONS = ["Crime", "NickCar", "Booze", "Narcotics", "KillSkill", "Travel", "BulletBuy", "HealthBuy", "BustOut"];
const BOOSTER_OPTIONS = ["MapYield", "RaceXp", "KillSkillXp", "BustOutXp", "SalesPriceNarcotics", "SalesPriceBooze", "Worth", "Rewards"];
const TOOLS_OPTIONS = ["Purchase", "NoJail", "FreeTravel", "BankFee", "CreditCost", "Convert", "CreditSpend"];

const DURATIONS = ["6", "12", "24", "48", "72", "96"];
const SUCCESS_AMOUNTS = ["100", "75", "50"];
const COOLDOWN_AMOUNTS = ["90", "75", "50"];
const BOOSTER_AMOUNTS = ["100", "75", "50", "25"];

const TOOLS_DISPLAY_NAMES: Record<string, string> = {
  Purchase: "Free Purchase",
  NoJail: "No Jail",
  FreeTravel: "Free Travel",
  BankFee: "No Bank Fee",
  CreditCost: "Reduced Credit Cost",
  Convert: "Free Convert",
  CreditSpend: "Reduced Credit Spend",
};

const OPTION_SUFFIX: Record<PerkType, string> = {
  success: "Success",
  cooldown: "Cooldown",
  booster: "Boost",
  tools: "",
};

export type PerkType = "success" | "cooldown" | "booster" | "tools";

export interface PerkDisplay {
  type: PerkType;
  option: string;
  amount: string;
  duration: string;
  tools: string;
}

export function getPerkDisplay(categoryId: number, typeId: number): PerkDisplay {
  const D = DURATIONS.length;

  // SUCCESS perks (18-23)
  if (categoryId >= 18 && categoryId <= 23) {
    const optionIndex = categoryId - 18;
    return {
      type: "success",
      option: SUCCESS_OPTIONS[optionIndex] ?? `Option #${optionIndex}`,
      amount: SUCCESS_AMOUNTS[Math.floor(typeId / D)] ?? "Unknown",
      duration: DURATIONS[typeId % D] ?? "Unknown",
      tools: "",
    };
  }

  // COOLDOWN perks (24-32)
  if (categoryId >= 24 && categoryId <= 32) {
    const optionIndex = categoryId - 24;
    return {
      type: "cooldown",
      option: COOLDOWN_OPTIONS[optionIndex] ?? `Option #${optionIndex}`,
      amount: COOLDOWN_AMOUNTS[Math.floor(typeId / D)] ?? "Unknown",
      duration: DURATIONS[typeId % D] ?? "Unknown",
      tools: "",
    };
  }

  // BOOSTER perks (33-40)
  if (categoryId >= 33 && categoryId <= 40) {
    const optionIndex = categoryId - 33;
    return {
      type: "booster",
      option: BOOSTER_OPTIONS[optionIndex] ?? `Option #${optionIndex}`,
      amount: BOOSTER_AMOUNTS[Math.floor(typeId / D)] ?? "Unknown",
      duration: DURATIONS[typeId % D] ?? "Unknown",
      tools: "",
    };
  }

  // TOOLS perks (41-47)
  if (categoryId >= 41 && categoryId <= 47) {
    const toolsIndex = categoryId - 41;
    return {
      type: "tools",
      option: "",
      amount: "",
      duration: DURATIONS[typeId % D] ?? "Unknown",
      tools: TOOLS_OPTIONS[toolsIndex] ?? `Tool #${toolsIndex}`,
    };
  }

  return {
    type: "success",
    option: `Unknown (Cat ${categoryId})`,
    amount: "?",
    duration: "?",
    tools: "",
  };
}

export function getToolsDisplayName(toolsId: string): string {
  return TOOLS_DISPLAY_NAMES[toolsId] ?? toolsId;
}

/** Option name with its perk-type suffix, e.g. `Crime Success`, `Travel Cooldown`, `Worth Boost`. */
export function getPerkOptionLabel(display: PerkDisplay): string {
  const suffix = OPTION_SUFFIX[display.type];
  return suffix ? `${display.option} ${suffix}` : display.option;
}
