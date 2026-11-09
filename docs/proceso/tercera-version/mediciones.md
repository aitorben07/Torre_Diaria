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
