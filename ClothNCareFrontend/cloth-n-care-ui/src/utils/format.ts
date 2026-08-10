export const formatMoney = (
  value: number | null | undefined,
  currencySymbol = "\u20b9",
): string => {
  const num = Number(value ?? 0);
  return `${currencySymbol}${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatMoneyShort = (
  value: number | null | undefined,
  currencySymbol = "\u20b9",
): string => {
  const num = Number(value ?? 0);
  return `${currencySymbol}${num.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
};

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const todayISO = (): string => new Date().toISOString().split("T")[0];

export const daysAgoISO = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
};
