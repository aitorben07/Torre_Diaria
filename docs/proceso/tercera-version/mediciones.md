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
