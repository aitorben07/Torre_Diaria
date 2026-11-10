# Torre Diaria: tercera versión. Mediciones

Cifras que anota el desarrollador al medir; el documentador las pasa al README en L5. Todas con `npm run medir:duracion` (días 1 a 30, jugadores simulados de `scripts/duracion.ts`), en Node, salvo que se diga otra cosa.

- **Primera:** segundo de la primera suelta (mediana de los días).
- **Cadencia:** mediana, por partida, de los segundos entre las sueltas 1 a 10; luego mediana de los días.
- **10.ª:** segundo en que se coloca la décima pieza (mediana de los días).
- **Duración y puntos:** medianas de los días.

## B2. Arranque con las constantes de la v2 (2026-11-09)

Lógica de la rama antes del bloque B (igual que `main`): 1,0 m/s, +0,03 por pieza, `AMPLITUD` 3,4 m, `HUECO_COLGADA` 2,5 m.

| Perfil | Primera | Cadencia | 10.ª | Duración | Puntos |
|---|---|---|---|---|---|
| Novato (±180 ms) | 3,42 s | 3,93 s | 40,48 s | 83,2 s | 567,5 |
| Medio (±90 ms) | 3,38 s | 3,80 s | 38,38 s | 169,8 s | 2.430 |
| Experto (±40 ms) | 3,40 s | 3,78 s | 38,34 s | 302,3 s | 5.435 |

Coinciden con `impacto.md` 2.1 salvo la cadencia, 0,02 a 0,03 s más alta: aquí es la mediana de las 9 esperas entre las sueltas 1 a 10 de cada partida.

## B2. Arranque con las reglas 3 (2026-11-09)

Constantes de B1 (`impacto.md` §5): 1,3 m/s, +0,025 por pieza soltada, tope 3,4, respiro de 4 tras caer, racha ×1,08 con combo ≥ 5, `AMPLITUD` 2,6 m y `HUECO_COLGADA` 1,8 m. Sin piezas especiales ni objetos (llegan en H e I1; se vuelve a medir en L1).

| Perfil | Primera | Cadencia | 10.ª | Duración | Puntos | Piezas |
|---|---|---|---|---|---|---|
| Novato (±180 ms) | 2,02 s | 2,63 s | 29,10 s | 60,1 s | 467,5 | 18 |
| Medio (±90 ms) | 1,98 s | 2,48 s | 24,91 s | 134,6 s | 2.392,5 | 51,5 |
| Experto (±40 ms) | 2,00 s | 2,45 s | 24,88 s | 260,4 s | 6.270 | 118,5 |

- Requisitos de B2: primera pieza en el centro a los 2,6 / 1,3 = 2,0 s (≤ 2,0); ventana del perfecto 0,16 / 1,3 = 123 ms (≥ 90); cadencia del medio 2,48 s (≤ 2,6); duraciones dentro de sus rangos (novato 60 a 150, medio 120 a 300, experto 240 a 720); ninguna partida al tope de 30 min. Se cumplen todos sin ajustar las constantes.
- **Margen del novato: 0,1 s** sobre el mínimo de 60 s (impacto midió 62,4 s con su prototipo; aquí el ritmo sube al soltar y la caída lo baja al cerrar el episodio). L1 lo vuelve a medir con las especiales; si baja de 60, la opción recomendada es subir `RESPIRO_CAIDA` antes que tocar la cadencia.
- Arranque un 35 % más rápido: la décima pieza del medio, a los 24,9 s en lugar de 38,4 s.
- Medallas con los umbrales provisionales de las reglas 3 (los de la v2): novato con bronce o más el 43 % de los días (la v2: 63 %), medio con plata o más el 50 %, experto con oro el 90 %. L1 recalcula `UMBRALES[3]`.
- Tiempo de la medición: novato 6,2 s, medio 16,8 s y experto 44,1 s. `scripts/duracion.test.ts` tarda unos 5 s.

## Fotogramas del móvil emulado tras A y B (2026-11-09, pendiente para L4)

`npx playwright test --project=rendimiento-movil --no-deps` (Pixel 7 con la CPU ×4, 20 s jugando sola con perfectos), en este equipo y sin otras pruebas a la vez:

| Código | p95 | Mediana | Piezas en 20 s |
|---|---|---|---|
| v2 (`2ef61cb`) | 25 y 29 ms | 16 y 17 ms | 5 |
| Reglas 3 con el HUD de la v2 | 32 y 32 ms | 18 y 17 ms | 8 y 10 |
| Rama tras A y B | 33 y 33 ms | 18 y 21 ms | 8 |
| Rama tras A y B, al final de `npm run e2e` | 36 ms (falla, límite 33) | 19 ms | 8 |

La subida viene sobre todo del ritmo: con la cadencia nueva caen 8 a 10 piezas en 20 s en lugar de 5, con sus efectos de perfecto. El HUD nuevo suma como mucho 1 ms. El límite de A2 (p95 ≤ 33 ms) queda justo y la prueba puede fallar con el equipo cargado. No se ha tocado ni el límite ni los efectos (fuera de los bloques A, C1 y B); escritorio sigue en mediana 16 ms y p95 18 ms.

## Duración con las piezas especiales (H e I1, 2026-11-09)

`npm run medir:duracion` tras los bloques H e I1: dorada, pegajosa y cemento de la semilla (una por tramo de 8 desde la pieza 8), sin objetos (los jugadores simulados no los usan).

| Perfil | Primera | Cadencia | 10.ª | Duración | Puntos | Piezas |
|---|---|---|---|---|---|---|
| Novato (±180 ms) | 2,02 s | 2,63 s | 29,10 s | 60,1 s | 485 | 18 |
| Medio (±90 ms) | 1,98 s | 2,48 s | 24,91 s | 145,1 s | 2.640 | 55 |
| Experto (±40 ms) | 2,00 s | 2,45 s | 24,88 s | 261,8 s | 7.102,5 | 124,5 |

- El novato sigue en 60,1 s (mínimo 60): no baja, así que no se ha tocado `RESPIRO_CAIDA`. Si L1 lo ve por debajo de 60, la opción recomendada sigue siendo subirlo.
- El arranque no cambia (la primera especial es la pieza 8). El medio dura 10,5 s más (la pegajosa y el cemento sujetan la torre) y los puntos suben por las doradas: medio +248, experto +833.
- Medallas con los umbrales provisionales: novato bronce o más el 47 % (antes 43 %), medio plata o más el 63 % (antes 50 %), experto oro el 100 % (antes 90 %). L1 recalcula `UMBRALES[3]` con estas reglas.
- Tiempo de la medición: novato 17,3 s, medio 28,6 s y experto 48,4 s (con otras tareas a la vez en el equipo).

## Música: fotogramas, coste y peso (D4, 2026-11-09)

`npx playwright test --project=rendimiento-escritorio --project=rendimiento-movil --no-deps --workers=1`, 20 s jugando sola con perfectos y el `AudioContext` real. «Sin música» es la misma prueba con `ajustes.musica: false` (los efectos siguen sonando), en una copia temporal de la prueba que no se ha subido. Las dos van alternadas en cada vuelta, con el Chrome del usuario abierto en el equipo.

| Vuelta | Escritorio con música | Escritorio sin música | Móvil ×4 con música | Móvil ×4 sin música |
|---|---|---|---|---|
| 1 | p95 23 ms | 22 ms | 32 ms | 31 ms |
| 2 | 20 ms | 18 ms | 52 ms (el equipo, ocupado) | 32 ms |
| 3 | 27 ms | 21 ms | 36 ms | 32 ms |

- Mediana: 16 ms en escritorio y 17 a 18 ms en el móvil, con y sin música.
- La música sube el p95 unos 2 a 4 ms. Con el móvil ya en 31 a 34 ms sin ella, pasa del límite de 33 ms (pendiente de L4, como antes) y el de escritorio (25 ms) queda justo: de 18 a 27 ms con música en 5 vueltas.
- `programar` por fotograma: media de 0,03 a 0,13 ms, p95 de 0 a 1 ms (`performance.now` va a saltos de 1 ms aquí) y algún máximo suelto de 7 a 30 ms en 20 s.
- Con la mitad de nodos por compás (marimba de un oscilador, colchón de uno por nota y menos percusión) no se ve mejora clara en el móvil: 38 y 36 ms antes; 36, 36, 32, 52 y 36 ms después (escritorio: 23 y 23 antes; 25, 18, 23, 20 y 27 después). Con una copia que contaba las notas sin crear ningún nodo, el móvil dio 34 y 35 ms y el escritorio 21 y 24 ms: el coste no está en los nodos de las notas ni en `programar`. No se ha quitado la percusión en táctil (lo que proponía impacto §5): no cambiaría la cifra. Lo decide el revisor con L4.
- JavaScript de `dist/` con `gzip -9`: 88.612 bytes (antes del bloque D, 84,9 KB): la música y sus partituras suman unos 3,7 KB. Presupuesto, 150 KB.
- Grabación de la música con `OfflineAudioContext` (no está en el repositorio): 77 s con 14 s de inicio, partida con las capas 0, 1 y 2, una caída, efectos y el motivo de fin. RMS de -26 a -25 dBFS y pico de 0,47.
- `npm run e2e` completo tras el bloque D (2026-11-10): 207 pasan, 60 se saltan y falla solo `rendimiento-movil` (p95 35 ms, límite 33); `rendimiento-escritorio` pasa con p95 20 ms. Dura 18,9 min con 2 hilos.

## L1. Duración y medallas con las reglas 3 (2026-11-10)

`npm run medir:duracion` con todo dentro (reglas 3, especiales, sin objetos: los jugadores simulados no los usan), días 1 a 30.

| Perfil | Primera | Cadencia | 10.ª | Duración | Puntos | Piezas | Especiales por partida |
|---|---|---|---|---|---|---|---|
| Novato (±180 ms) | 2,02 s | 2,63 s | 29,10 s | 60,1 s | 485 | 18 | 1,8 |
| Medio (±90 ms) | 1,98 s | 2,48 s | 24,91 s | 145,1 s | 2.640 | 55 | 6,1 |
| Experto (±40 ms) | 2,00 s | 2,45 s | 24,88 s | 261,8 s | 7.102,5 | 124,5 | 15,6 |

- Mismas cifras que tras H e I1: no ha cambiado nada de la simulación desde entonces. No se tocan `ritmo.ts` ni `especiales.ts`.
- Requisitos de B2: primera pieza en el centro a 2,0 s (geométrico: 2,6 / 1,3); ventana del perfecto 123 ms; cadencia del medio 2,48 s (≤ 2,6); duraciones dentro de rango; ninguna al tope de 30 min. **Novato 60,1 s, a 0,1 s del mínimo:** no baja, así que `RESPIRO_CAIDA` sigue igual.
- Especiales que llegan a colgar, de media por partida: 1,8, 6,1 y 15,6 (el Anexo G estimaba 1, 5 y 12; las partidas son algo más largas que entonces).
- **`UMBRALES[3]`** con la regla de la v2 (S26), redondeando a 50 hacia abajo: bronce = mediana del novato (485) → **450**; plata = mediana del medio (2.640) → **2.600**; oro = percentil 25 del experto (6.785, el 8.º de 30 ordenados) → **6.750**. `UMBRALES[2]` (550, 2.400, 4.000) no cambia (R16).
- Medallas con los umbrales nuevos: novato con bronce o más el **60 %** de los días, medio con plata o más el **57 %**, experto con oro el **77 %** (objetivo: 50 % o más cada uno).
- Tiempo de la medición: novato 9,8 s, medio 31,6 s y experto 71,1 s; 1 min 57 s en total.

## L2. Niveles con las reglas 3 (2026-11-10)

`npm run medir:niveles` (10 intentos por nivel y perfil, en Node, 72 s).

- **Antes de tocar nada** (tabla de la v2 con las reglas 3): todos los requisitos de ganar y de estrellas se cumplían, pero la mediana de duración del medio al ganar bajó a **24,2 s** (requisito: 30 a 120). Los niveles 1 a 3 a 0,9 m/s ya duraban 14 a 17 s, y el 4 y el 7, 27 y 24 s. Cuatro niveles proponían otros `p2` y `p3`.
- **Cambios:** niveles 1 a 3 de 0,9 a **1,1 m/s** (primera pieza en el centro a 2,4 s; antes 2,9 y en la libre 2,0); nivel 4, **14 piezas a 1,5 m/s** (antes 12 a 1,7; con 16 a 1,7 el novato ganaba 3 de 10 y con 13 a 1,7 la mediana quedaba en 30,2 s); nivel 7, **16 piezas** con 1 vida (antes 12); nivel 8, **750 puntos** (antes 600). Los `p2` y `p3` de los niveles 4, 6, 7, 8 y 10 se recalculan con la regla de la v2.

| Nivel | Objetivo | Vel. | Novato gana | Medio gana / 3★ | Experto 3★ | Medio, s al ganar | `p2` / `p3` |
|---|---|---|---|---|---|---|---|
| 1 | Coloca 5 piezas | 1,1 | 10 | 10 / 10 | 10 | 14,5 | 150 / 200 |
| 2 | Llega a 3 m | 1,1 | 10 | 10 / 10 | 10 | 11,7 | 50 / 100 |
| 3 | Haz 4 perfectos | 1,1 | 10 | 10 / 10 | 10 | 11,8 | 50 / 100 |
| 4 | Coloca 14 piezas | 1,5 | 9 | 10 / 4 | 10 | 33,2 | 800 / 900 |
| 5 | Haz un combo de 4 | 1,0 | 9 | 10 / 10 | 10 | 12,6 | 50 / 100 |
| 6 | Llega a 8 m con 2 vidas | 1,7 | 1 | 10 / 9 | 10 | 46,3 | 800 / 850 |
| 7 | Coloca 16 piezas con 1 vida | 1,8 | 0 | 9 / 1 | 10 | 38,6 | 750 / 1.000 |
| 8 | Consigue 750 puntos | 1,6 | 0 | 10 / 2 | 10 | 42,3 | 750 / 800 |
| 9 | Llega a 10 m en 18 piezas | 1,7 | 0 | 8 / 3 | 10 | 39,6 | 850 / 900 |
| 10 | Llega a 14 m con 2 vidas (jefe) | 1,6 | 0 | 9 / 9 | 10 | 87,3 | 1.200 / 1.250 |

- Requisitos: novato gana los niveles 1 a 5 en 9 de 10 o más (≥ 6); medio gana cada nivel en 8 de 10 o más (≥ 6); experto con 3 estrellas en 10 de 10 en todos (≥ 3); **mediana del medio al ganar 31,7 s** (30 a 120); `umbralesDistintos: 0`, `fallos: []`.
- El margen de la mediana es pequeño (1,7 s): los niveles cortos (1, 2, 3 y 5, de 12 a 15 s) son casi la mitad de las victorias. Si otra medida la baja de 30, lo siguiente sería alargar el 1 o el 5.
- Las estrellas ya guardadas no se recalculan: el progreso guarda estrellas y no puntos, y una partida peor no cambia la mejor marca (`niveles.test.ts`, «mejorar de 1 a 3 estrellas…»). Quien sacó 3 estrellas en el 4 con 650 puntos las conserva.
- La prueba dorada del nivel 1 cambia por la velocidad: toques 142 a 852, 972 pasos y 3,535045 m (antes 173 a 996, 1.116 pasos y 3,678103 m; mismos puntos, piezas y perfectos).

## L3. Economía con objetos y vídeos (2026-11-10)

`npm run medir:economia` (45 días, muestra de 10 partidas por perfil, 42 s). Desde L3 cada partida cuenta sus monedas con las de las doradas (`Resultado.monedas`) y hay dos planes más: **objetos** (el medio compra 1 objeto al día y el experto 2, el más barato de los desbloqueados que no esté al máximo; no los usan) y **vídeos** (4 vídeos de monedas al día, 240 monedas; el objeto con vídeo no da monedas).

| Perfil | Plan | Monedas al día | Primera compra | Temas el día 7 | Catálogo completo | Objetos comprados |
|---|---|---|---|---|---|---|
| Novato | temas | 519 | 6,8 min | 3 | día 19 | — |
| Novato | vídeos | 759 | 1 min | 3 | día 13 | — |
| Medio | temas | 1.113 | 4,7 min | 4 | **día 9** | — |
| Medio | objetos | 1.113 | 6,8 min | 4 | día 11 | 21 |
| Medio | vídeos | 1.353 | 2 min | 4 | **día 8** | — |
| Experto | temas | 2.428 | 4,6 min | 5 | **día 4** | — |
| Experto | objetos | 2.428 | 4,6 min | 5 | día 5 | 21 |
| Experto | vídeos | 2.668 | 4,6 min | 5 | día 4 | — |

Monedas medianas por partida: novato 42, medio 155, experto 350,5. Reloj: 120.

| Requisito de L3 | Medido | ¿Cumple? |
|---|---|---|
| Novato: primera compra en ≤ 12 min | 6,8 min | Sí |
| Medio: 3 a 6 temas el día 7 | 4 | Sí |
| Medio: catálogo completo entre los días 10 y 30 | día 9 | **No** |
| Experto: no completa antes del día 7 | día 4 | **No** |
| Con objetos, el medio completa entre los días 10 y 30 | día 11 | Sí |
| Con vídeos, el medio no completa antes del día 10 | día 8 | **No** |
| Una partida mediana del medio da para un reloj | 155 ≥ 120 | Sí |

- **Las reglas 3 dan muchas más monedas que la v2** (medio 1.113 al día frente a 751; experto 2.428 frente a 1.404): las partidas son más largas en piezas (cadencia más rápida, pegajosa y cemento sujetan la torre) y las doradas dan +10. Sin las doradas (como medía la v2) ya pasaba: medio día 11 y experto día 5.
- No se puede arreglar con lo que L3 deja tocar (`PRECIOS_OBJETOS` y `MONEDAS_VIDEO`): los dos requisitos sin objetos ni vídeos fallan por los precios de los temas y las monedas por pieza. **No se ha cambiado:** subir los precios de los temas o bajar las monedas por partida toca la economía de un juego ya publicado, y lo decide la revisión final. Opción recomendada para entonces: multiplicar los precios de los temas por 1,5 (Madera 450, Caramelo 1.470, Neón 2.520, Mármol 3.780, Oro 6.300; se mediría de nuevo), que no quita nada a quien ya compró.
- `PRECIOS_OBJETOS` (120, 180, 250) y `MONEDAS_VIDEO` (60) se quedan: el reloj cabe en una partida del medio, los objetos ya retrasan el catálogo del medio dos días y el vídeo, uno.
