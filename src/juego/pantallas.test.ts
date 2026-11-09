import { describe, expect, it } from "vitest";
import { formatearNumero } from "../logica/tarjeta.ts";
import { escalonCifras } from "./pantallas.ts";

describe("escalón de letra de los puntos (A1, tercera versión)", () => {
  it("hasta 999 no cambia; 1.000, 12.345 y 999.999 bajan un escalón cada uno", () => {
    expect(escalonCifras(formatearNumero(999))).toBeNull();
    expect(escalonCifras(formatearNumero(1000))).toBe("cifras-5");
    expect(escalonCifras(formatearNumero(12345))).toBe("cifras-6");
    expect(escalonCifras(formatearNumero(123456))).toBe("cifras-7");
    expect(escalonCifras(formatearNumero(999999))).toBe("cifras-7");
  });

  it("más de 999.999 se queda en el último escalón", () => {
    expect(escalonCifras(formatearNumero(1_234_567))).toBe("cifras-7");
  });
});
