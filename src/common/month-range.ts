/**
 * Rango de fechas de un mes `YYYY-MM`: `desde` es el primer día del mes y
 * `hasta` el primer día del mes siguiente (excluyente).
 */
export function rangoDelMes(mes: string): { desde: string; hasta: string } {
  const [year, month] = mes.split("-").map(Number);
  const hasta =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  return { desde: `${mes}-01`, hasta };
}
