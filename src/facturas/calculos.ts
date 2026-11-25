export type Modalidad = "libre" | "plazo" | "cuotas";
export type Periodicidad = "semanal" | "quincenal" | "mensual";
export type EstadoPago = "pendiente" | "parcial" | "pagada" | "vencida";

export const MODALIDADES: Modalidad[] = ["libre", "plazo", "cuotas"];
export const PERIODICIDADES: Periodicidad[] = [
  "semanal",
  "quincenal",
  "mensual",
];

/** Una cuota del calendario: fecha límite y valor, en pesos enteros. */
export interface CuotaCalculada {
  numero: number;
  vence: string;
  monto: number;
}

export interface ParametrosCuotas {
  total: number;
  /** Interés simple sobre el total de la factura, de 0 a 100. */
  interesPorcentaje: number;
  numeroCuotas: number;
  periodicidad: Periodicidad;
  /** Fecha de la primera cuota, `YYYY-MM-DD`. */
  primeraCuota: string;
}

export interface PlanCuotas {
  interesMonto: number;
  /** Total de la factura más el interés. */
  totalAPagar: number;
  cuotas: CuotaCalculada[];
}

/** Lo que falta por cubrir de una fecha límite (una cuota o el plazo entero). */
export interface Obligacion extends CuotaCalculada {
  pagado: number;
  pendiente: number;
  estado: EstadoPago;
}

const DIAS_POR_PERIODO: Record<Exclude<Periodicidad, "mensual">, number> = {
  semanal: 7,
  quincenal: 15,
};

const aFecha = (texto: string): Date => {
  const [anio, mes, dia] = texto.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
};

const aTexto = (fecha: Date): string => fecha.toISOString().slice(0, 10);

export const sumarDias = (texto: string, dias: number): string => {
  const fecha = aFecha(texto);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return aTexto(fecha);
};

/** Suma meses sin desbordar: el 31 de enero más un mes es el 28 o 29 de febrero. */
export const sumarMeses = (texto: string, meses: number): string => {
  const [anio, mes, dia] = texto.split("-").map(Number);
  const indice = mes - 1 + meses;
  const anioDestino = anio + Math.floor(indice / 12);
  const mesDestino = ((indice % 12) + 12) % 12;
  const ultimoDia = new Date(
    Date.UTC(anioDestino, mesDestino + 1, 0),
  ).getUTCDate();
  return aTexto(
    new Date(Date.UTC(anioDestino, mesDestino, Math.min(dia, ultimoDia))),
  );
};

/** Día de negocio actual (`YYYY-MM-DD`) en hora de Colombia. */
export const hoyNegocio = (ahora: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(
    ahora,
  );

/**
 * Calendario de cuotas iguales con interés simple. Trabaja en pesos enteros:
 * la última cuota absorbe la diferencia del redondeo para que la suma cuadre.
 */
export function calcularCuotas({
  total,
  interesPorcentaje,
  numeroCuotas,
  periodicidad,
  primeraCuota,
}: ParametrosCuotas): PlanCuotas {
  const interesMonto = Math.round((total * interesPorcentaje) / 100);
  const totalAPagar = total + interesMonto;
  const base = Math.floor(totalAPagar / numeroCuotas);

  const cuotas = Array.from({ length: numeroCuotas }, (_, i) => ({
    numero: i + 1,
    vence:
      periodicidad === "mensual"
        ? sumarMeses(primeraCuota, i)
        : sumarDias(primeraCuota, DIAS_POR_PERIODO[periodicidad] * i),
    monto:
      i === numeroCuotas - 1 ? totalAPagar - base * (numeroCuotas - 1) : base,
  }));

  return { interesMonto, totalAPagar, cuotas };
}

const estadoDe = (
  pendiente: number,
  pagado: number,
  vence: string,
  hoy: string,
) => {
  if (pendiente === 0) return "pagada";
  if (vence < hoy) return "vencida";
  return pagado > 0 ? "parcial" : "pendiente";
};

/**
 * Reparte lo pagado entre las cuotas en orden, de la primera a la última. Los
 * abonos pertenecen a la factura, no a una cuota: así se puede adelantar o
 * pagar de más una cuota sin lógica extra.
 */
export function repartirPagos(
  cuotas: CuotaCalculada[],
  pagado: number,
  hoy: string,
): Obligacion[] {
  let restante = pagado;
  return [...cuotas]
    .sort((a, b) => a.numero - b.numero)
    .map((cuota) => {
      const cubierto = Math.min(cuota.monto, restante);
      restante -= cubierto;
      const pendiente = cuota.monto - cubierto;
      return {
        ...cuota,
        pagado: cubierto,
        pendiente,
        estado: estadoDe(pendiente, cubierto, cuota.vence, hoy),
      };
    });
}

export interface FacturaParaCalculo {
  modalidad: Modalidad;
  total: number;
  interesMonto: number;
  vence: string | null;
  cuotas: CuotaCalculada[];
}

/**
 * Fechas límite que tiene una factura: ninguna si es libre, una (el plazo
 * completo) si es con plazo y una por cuota si es a cuotas.
 */
export function obligacionesDe(
  factura: FacturaParaCalculo,
  pagado: number,
  hoy: string,
): Obligacion[] {
  if (factura.modalidad === "plazo" && factura.vence) {
    return repartirPagos(
      [
        {
          numero: 1,
          vence: factura.vence,
          monto: factura.total + factura.interesMonto,
        },
      ],
      pagado,
      hoy,
    );
  }
  if (factura.modalidad === "cuotas") {
    return repartirPagos(factura.cuotas, pagado, hoy);
  }
  return [];
}

export function estadoDeFactura(
  saldo: number,
  pagado: number,
  obligaciones: Obligacion[],
): EstadoPago {
  if (saldo <= 0) return "pagada";
  if (obligaciones.some((o) => o.estado === "vencida")) return "vencida";
  return pagado > 0 ? "parcial" : "pendiente";
}
