import { describe, expect, it } from "vitest";
import { ACORDES, CORCHEAS, duracionPista, ESCALA, frecuencia, INICIO, midiDe, MOTIVO_FIN, PARTIDA, PISTAS } from "./partituras.ts";
import { NOTAS_EFECTOS, NOTAS_PERFECTO } from "./sonido.ts";

const clase = (midi: number) => ((midi % 12) + 12) % 12;
/** Do mayor: Do, Re, Mi, Fa, Sol, La y Si. */
const DO_MAYOR = [0, 2, 4, 5, 7, 9, 11];

describe("partituras (D2)", () => {
  it("las alturas MIDI y las frecuencias son las de siempre: La 4 = 440 Hz, Do 5 = 523 Hz", () => {
    expect(midiDe("A4")).toBe(69);
    expect(midiDe("C4")).toBe(60);
    expect(frecuencia(69)).toBe(440);
    expect(Math.round(frecuencia(midiDe("C5")))).toBe(NOTAS_PERFECTO[0]);
  });

  for (const pista of Object.values(PISTAS)) {
    describe(pista.nombre, () => {
      it("todas las notas de la melodía están en Do, Re, Mi, Sol o La (la escala del perfecto)", () => {
        const fuera = pista.compases.flatMap((c, i) => c.notas.filter((n) => n.instrumento === "marimba" && !ESCALA.includes(clase(n.midi) as 0)).map((n) => `${i + 1}:${n.midi}`));
        expect(fuera).toEqual([]);
      });

      it("las del bajo y el colchón son notas del acorde de su compás", () => {
        const fuera = pista.compases.flatMap((c, i) =>
          c.notas.filter((n) => (n.instrumento === "bajo" || n.instrumento === "colchon") && !ACORDES[c.acorde].includes(clase(n.midi))).map((n) => `${i + 1}:${n.instrumento}:${n.midi}`),
        );
        expect(fuera).toEqual([]);
      });

      it("ninguna nota sale de Do mayor ni de un registro cómodo", () => {
        for (const c of pista.compases) {
          for (const n of c.notas) {
            if (n.instrumento === "bombo" || n.instrumento === "cepillo") continue;
            expect(DO_MAYOR).toContain(clase(n.midi));
            expect(n.midi).toBeGreaterThanOrEqual(41);
            expect(n.midi).toBeLessThanOrEqual(84);
          }
        }
      });

      it("la melodía cae en el acorde en el primer y el tercer tiempo de cada compás", () => {
        for (const c of pista.compases) {
          for (const n of c.notas.filter((n) => n.instrumento === "marimba" && n.corchea % 4 === 0)) expect(ACORDES[c.acorde]).toContain(clase(n.midi));
        }
      });

      it("frases de al menos 8 compases y ninguna nota se sale del compás", () => {
        expect(pista.compases.length % 8).toBe(0);
        expect(pista.compases.length).toBeGreaterThanOrEqual(16);
        for (const c of pista.compases) for (const n of c.notas) expect(n.corchea + n.duracion).toBeLessThanOrEqual(CORCHEAS);
      });

      it("las notas de cada compás van en orden y cada capa es de 0 a 2 (R-2)", () => {
        for (const c of pista.compases) {
          const corcheas = c.notas.map((n) => n.corchea);
          expect(corcheas).toEqual([...corcheas].sort((a, b) => a - b));
          for (const n of c.notas) expect([0, 1, 2]).toContain(n.capa);
        }
      });
    });
  }

  it("inicio a 88 BPM y partida a 104 BPM, fijos (impacto §5); la de partida no se repite antes de un minuto", () => {
    expect(INICIO.bpm).toBe(88);
    expect(PARTIDA.bpm).toBe(104);
    expect(duracionPista(INICIO)).toBeCloseTo(43.6, 1);
    expect(duracionPista(PARTIDA)).toBeGreaterThan(60);
  });

  it("en el inicio no hay percusión; en la partida, solo desde la capa 2, y el bajo desde la 1", () => {
    expect(INICIO.compases.flatMap((c) => c.notas).some((n) => n.instrumento === "bombo" || n.instrumento === "cepillo")).toBe(false);
    for (const n of PARTIDA.compases.flatMap((c) => c.notas)) {
      const capa = n.instrumento === "bombo" || n.instrumento === "cepillo" ? 2 : n.instrumento === "bajo" ? 1 : 0;
      expect(n.capa).toBe(capa);
    }
  });

  it("el motivo de fin es Sol, Mi y Do en la marimba y dura 1,5 s o menos", () => {
    const marimba = MOTIVO_FIN.filter((n) => n.instrumento === "marimba").map((n) => clase(n.midi));
    expect(marimba).toEqual([7, 4, 0]);
    expect(Math.max(...MOTIVO_FIN.map((n) => n.tiempo + n.duracion))).toBeLessThanOrEqual(1.5);
    for (const n of MOTIVO_FIN) expect(ACORDES.C).toContain(clase(n.midi));
  });

  it("todos los efectos están en la pentatónica de Do, también las estrellas (T6, impacto §5)", () => {
    for (const f of NOTAS_EFECTOS) {
      const midi = Math.round(69 + 12 * Math.log2(f / 440));
      expect(Math.abs(frecuencia(midi) - f)).toBeLessThan(1);
      expect(ESCALA).toContain(clase(midi));
    }
  });
});
