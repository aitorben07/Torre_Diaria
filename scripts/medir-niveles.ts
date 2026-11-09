// Juega cada nivel 10 veces por perfil (E2) y comprueba los requisitos de
// `niveles.ts`. Escribe una línea por nivel con lo medido y los umbrales `p2` y
// `p3` que propone (mediana del medio y del experto al ganar, redondeadas a 50)
// junto a los de la tabla, y al final los fallos. Sale con código 1 si hay
// alguno o si la tabla no coincide con lo propuesto.
// Uso: npm run medir:niveles
import { NIVELES } from "../src/logica/niveles.ts";
import { mediana } from "./duracion.ts";
import { fallos, medirTodo, umbrales } from "./niveles.ts";

const inicio = performance.now();
const medidas = medirTodo();
let distintos = 0;
for (const nivel of NIVELES) {
  const de = (perfil: string) => medidas.find((m) => m.nivel === nivel.numero && m.perfil === perfil)!;
  const propuestos = umbrales(de("medio"), de("experto"));
  if (!propuestos || propuestos.p2 !== nivel.p2 || propuestos.p3 !== nivel.p3) distintos++;
  console.log(
    JSON.stringify({
      nivel: nivel.numero,
      ...Object.fromEntries(
        ["novato", "medio", "experto"].map((perfil) => {
          const m = de(perfil);
          return [perfil, { ganadas: m.ganadas, tresEstrellas: m.tresEstrellas, puntos: m.puntosGanadas, segundos: m.segundosGanadas?.toFixed(1) ?? null }];
        }),
      ),
      tabla: { p2: nivel.p2, p3: nivel.p3 },
      propuestos,
    }),
  );
}
const segundos = medidas.filter((m) => m.perfil === "medio").flatMap((m) => m.medidas.filter((x) => x.victoria).map((x) => x.segundos));
const errores = fallos(medidas);
console.log(
  JSON.stringify({
    medianaSegundosMedioGanadas: Number(mediana(segundos).toFixed(1)),
    umbralesDistintos: distintos,
    fallos: errores,
    tiempoS: Number(((performance.now() - inicio) / 1000).toFixed(1)),
  }),
);
if (errores.length > 0 || distintos > 0) process.exitCode = 1;
