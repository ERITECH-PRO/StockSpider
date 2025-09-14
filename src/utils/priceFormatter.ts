/**
 * Utilitaires de formatage des prix pour StockSpider
 * Tous les prix sont affichés avec 4 décimales
 */

/**
 * Formate un prix avec 4 décimales et le symbole €
 * @param price - Le prix à formater
 * @returns Le prix formaté avec 4 décimales (ex: "12.3456€")
 */
export const formatPrice = (price: number | string | null | undefined): string => {
  const numericPrice = Number(price) || 0;
  return `${numericPrice.toFixed(4)}€`;
};

/**
 * Formate un prix avec 4 décimales sans le symbole €
 * @param price - Le prix à formater
 * @returns Le prix formaté avec 4 décimales (ex: "12.3456")
 */
export const formatPriceNumber = (price: number | string | null | undefined): string => {
  const numericPrice = Number(price) || 0;
  return numericPrice.toFixed(4);
};

/**
 * Formate un prix avec le formatage monétaire français et 4 décimales
 * @param price - Le prix à formater
 * @returns Le prix formaté selon les standards français (ex: "12,3456 €")
 */
export const formatPriceCurrency = (price: number | string | null | undefined): string => {
  const numericPrice = Number(price) || 0;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  }).format(numericPrice);
};

/**
 * Formate un pourcentage avec 4 décimales
 * @param percentage - Le pourcentage à formater
 * @returns Le pourcentage formaté avec 4 décimales (ex: "12.3456%")
 */
export const formatPercentage = (percentage: number | string | null | undefined): string => {
  const numericPercentage = Number(percentage) || 0;
  return `${numericPercentage.toFixed(4)}%`;
};
