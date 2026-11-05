# Pruebas de version-inicial (probador, 2026-11-05)

**Veredicto: APROBADO salvo: D6 (duración 30-90 s, falla para jugadores poco cuidadosos), casos límite manuales sin comprobar (localStorage bloqueado en navegador real, cambio de pestaña a mitad de partida, retos inválidos probados a mano), T10 Firefox y T9 CPU de móvil real.**

Nota sobre el entorno: en la segunda mitad de la sesión el shell de Windows dejó de responder (procesos Node/Chromium colgados de mis scripts de casos límite, que se quedaron esperando; un intento de cerrarlos en bloque fue denegado por el permiso). Por eso los casos límite manuales y el commit quedaron sin hacer desde esta sesión (ver "Sin comprobar").

## Comprobaciones globales (ejecutadas por mí)

| Comprobación | Resultado |
|---|---|
| `npm ci` | pasa, 0 vulnerabilidades |
| `npm run build` | pasa, genera `dist/index.html`, `_headers`, un JS y un CSS |
| `npm test` | pasa: 8 archivos, 69 pruebas |
| `npm run check` | 0 errores, 0 avisos, 1 sugerencia (`document.execCommand` en desuso, es el plan B de copiar) |
| `npm run e2e` vez 1 | 40 pasan, 8 omitidas (motores), 2,1 min |
| `npm run e2e` vez 2 | 40 pasan, 8 omitidas, 2,0 min |
| Tercera ejecución (T10 pide 3) | sin hacer (el shell se bloqueó); hay 2 seguidas sin fallos |

## Requisitos

| Req | Comprobación | Resultado |
|---|---|---|
| T1 build/ci/test/e2e | ejecutados (arriba) | pasa |
| T1 tsconfig strict | `extends: astro/tsconfigs/strict` | pasa |
| T1 sin `.github` | `ls .github` no existe | pasa |
| T1 licencias directas | astro, planck MIT/Apache; el README lo indica | pasa |
| T1 sin GPL/AGPL; LGPL anotada | `npm query "*"`: solo `@img/sharp-win32-x64` (Apache-2.0 AND LGPL-3.0-or-later), documentado en README | pasa |
| T1 planck exacto | `"planck": "1.5.1"` | pasa |
| T1 sin React | `npm ls react` vacío | pasa |
| T2, T3, T4, T5, T6, T7 (lógica) | 69 pruebas de Vitest pasan; no revisé una a una el contenido de cada prueba | pasa (por las pruebas del proyecto) |
| T2 `Math.random` solo en semilla de práctica | grep: única aparición `semilla.ts:62` | pasa |
| T4 solo `simulacion.ts` importa planck | grep: solo simulacion.ts y tests | pasa (los `.test.ts` importan planck; `src/juego/bucle.test.ts` lo hace, ver Fallos F2) |
| T4 sin Math.random/Date.now/performance.now/sin/cos en simulacion.ts | grep sin resultados en src/logica y src/juego (excluyendo tests) | pasa |
| T4 medición de `jugar` en README | README: mediana 1.002 ms con fecha | pasa (cifra leída, no repetida) |
| T8 dist sin imágenes/audio/fuentes | `find dist` no halla ninguno | pasa |
| T8 toque/Espacio/scroll/DPR/5 pasos/data-toques | cubiertos por la suite e2e y Vitest (pasan en los dos proyectos); además en mi partida móvil 390x844 `scrollWidth <= innerWidth` no medido a mano | pasa (suite) |
| T9 reiniciar/práctica/compartir/copiar/Abort/reto 1.5/reto de hoy ya jugado | suite e2e pasa (2 veces) | pasa (suite) |
| T10 partida completa < 60 s, tarjeta, consola, mismo origen, equivalencia con `jugar` | suite e2e pasa (2 veces) | pasa |
| T10 equivalencia exacta | altura se compara con 9 decimales, no al bit | pasa con la desviación declarada (ver abajo) |
| T10 3 ejecuciones seguidas | solo 2 hechas | sin comprobar (la tercera) |
| T10 motores anotados en README | README: WebKit 1 de 5 exactas / 5 de 5 mismos puntos; Firefox "sin comprobar" | pasa (anotado) |
| T10 Firefox | no ejecutado | sin comprobar |
| T11 `_headers` con CSP | leído: CSP sin orígenes externos, nosniff, Referrer-Policy | pasa |
| T11 sin `<style>`/`<script>` en línea | solo `<script type="module" src=...>` externo; sin `<style>` | pasa |
| T11 metadatos | `og:title`, `og:description`, viewport con `width=device-width` en `index.astro`/dist | pasa |
| T11 JS < 150 KB gzip | medido por mí: 50.412 bytes (README dice 50.110, nivel 9; difiere por nivel de gzip) | pasa |
| T11 README con comandos, motivos, 4 avisos, 2 mediciones | leído | pasa |
| T11 sin despliegue ni remoto | `git remote -v` vacío, `.github` inexistente | pasa |
| T11 CSP aplicada en Playwright sin errores | `e2e/csp.spec.ts` pasa | pasa |

## Partidas jugadas (D6, requisito de duración 30-90 s)

Compilación servida con `astro preview`. Jugador automatizado con toques reales de Playwright (touchscreen.tap en móvil 390x844, tecla Espacio en escritorio 1280x800), apuntando a distintos niveles de precisión y con pausa humana de 150-400 ms entre piezas. Sin errores de consola en ninguna.

Jugador descuidado (tolerancia 0,5 y 0,9 del centro):

| Pantalla | Piezas | Puntos | Duración |
|---|---|---|---|
| móvil (oficial) | 6 | 5 | 16,5 s |
| móvil (práctica) | 7 | 6 | 18,1 s |
| móvil (práctica) | 7 | 6 | 15,8 s |
| móvil (práctica) | 3 | 2 | 9,6 s |
| escritorio (oficial) | 5 | 4 | 11,4 s |
| escritorio (práctica) | 5 | 4 | 14,0 s |
| escritorio (práctica) | 8 | 7 | 16,7 s |

Jugador cuidadoso (tolerancia 0,12 a 0,3):

| Pantalla | Piezas | Puntos | Duración |
|---|---|---|---|
| móvil | 15 | 14 | 38,0 s |
| móvil | 19 | 18 | 42,8 s |
| móvil | 16 | 14 | 39,3 s |
| móvil | 5 | 4 | 13,8 s |
| escritorio | 3 | 2 | 9,3 s |
| escritorio | 8 | 7 | 22,4 s |
| escritorio | 5 | 4 | 14,7 s |

Conclusión D6: 14 partidas, de 9 a 43 s. Solo 3 de 14 (todas del jugador cuidadoso en móvil) alcanzan los 30 s. Las partidas de un jugador medio-descuidado duran 10-20 s, por debajo del mínimo de 30 s del plan. El máximo observado fue 43 s, lejos de 90 s. El plan dice que esto es un supuesto sin medir, y la medición lo contradice: FALLA como requisito D6 si se interpreta como obligatorio. Mi bot no es un jugador humano, así que es orientativo, pero el desarrollador debe valorar subir la dificultad inicial más tarde o ablandarla (piezas más anchas/más lentas al principio) para alargar las partidas.

Legibilidad (capturas en `docs/proceso/version-inicial/capturas/`):
- Móvil: la torre y las piezas se leen bien, el contador en la barra superior es claro, los botones son grandes. Es divertido y fácil de entender. La tarjeta de fin se ve bien, con emojis legibles y el texto de la tarjeta completo.
- Escritorio: columna central estrecha (480 px) sobre fondo oscuro; legible, pero muy estrecho.
- En móvil sobra mucho cielo arriba (la torre ocupa la mitad inferior): estético, no incumple ningún requisito. En 390x844 la tarjeta de fin tapa la parte superior de la torre.
- Mi bot no dejó caer piezas de forma imposible; el juego se siente justo en mis partidas.

## Valoración de las desviaciones declaradas

1. Altura comparada con 9 decimales en vez de al bit entre Chrome y Node: el plan pedía "misma altura"; la diferencia es del orden de 1e-15 y el motivo (trigonometría de V8 distinta entre Chrome y Node) está medido y documentado en el README. No incumple la intención (los puntos son idénticos); acéptese como desviación razonable, pero la segunda fase no podrá validar al bit.
2. Firefox sin comprobar: el plan lo permite expresamente («si no se pueden instalar, se declara sin comprobar»). No incumple.
3. Mucho cielo en móvil: no es un requisito del plan; es una mejora estética opcional.

## Fallos

- **F1 (D6, duración).** Pasos: jugar 14 partidas como arriba. Esperado: duración de 30 a 90 s para un jugador medio. Obtenido: 9 a 43 s; descuidado 10-20 s.
- **F2 (menor).** `src/juego/bucle.test.ts` importa `planck` (es un archivo de prueba, no de producción). T8 pide que ningún archivo de `src/juego/` importe planck; el grep lo encuentra. Es una prueba de test, no un fallo de producto, pero literalmente incumple «buscar el texto». Conviene excluirlo del texto del requisito o quitar la importación.

## Sin comprobar

- Casos límite manuales con navegador (enlace de reto inválido o con HTML, reto de hoy ya jugado, localStorage bloqueado, cambio de pestaña): mi script se bloqueó y el shell dejó de responder. Lo que sí cubre la suite e2e (que pasó dos veces): reto con HTML tratado como inválido, reto de hoy tras jugar, partida sin consola/CSP. localStorage bloqueado y datos corruptos están cubiertos solo por pruebas de Vitest de `registro.ts`, no por un navegador real. Cambio de pestaña: solo Vitest del acumulador/bucle, no probado a mano.
- Tercera ejecución de `npm run e2e` (se hicieron dos).
- Firefox, Safari real y Android reales.
- Commit de este informe y las capturas: no se pudo hacer porque el shell dejó de responder; las capturas están creadas en `docs/proceso/version-inicial/capturas/` y `pruebas.md` guardado, pendientes de `git add` y commit.
- Servidores `astro preview` en los puertos 4400 y 4401 y procesos de Playwright quedaron abiertos por mí y deberían cerrarse.

## Vuelta 2

**Veredicto de la vuelta 2: FALLA (un fallo menor, F3, de puntuación; F1 y F2 quedan resueltos con una reserva sobre la duración).**

### Comprobaciones repetidas
- `npm test`: 10 archivos, 77 pruebas, todas pasan.
- `npm run check`: 0 errores, 0 avisos, 1 aviso informativo (`document.execCommand` obsoleto, es la alternativa prevista para Copiar).
- `npm run e2e` (escritorio y móvil): 48 pasan, 8 omitidas (las de motores, que no entran en este comando).
- `npm run medir:duracion`: mediana 54,6 s cuidadoso (49,9-66,8) y 36,7 s descuidado (25,0-59,7). Reproduce lo que dijo el desarrollador.

### Requisitos
| Requisito | Cómo se comprobó | Resultado |
|---|---|---|
| F2: planck fuera de `src/juego` | `npm test` y `npm run check` | cumplido |
| Casos límite (localStorage bloqueado, pestaña oculta, retos inválidos) | `e2e/limites.spec.ts` dentro de `npm run e2e` y capturas `movil-localstorage-bloqueado.png`, `movil-reto-html.png`, `movil-reto-valido.png`, `movil-reto-hoy-ya-jugado.png` | cumplido |
| Cámara sigue la torre en móvil y la tarjeta no tapa la cima | captura `movil-fin-camara-12piezas.png` (torre de 8,5 m visible bajo la tarjeta) | cumplido |
| D6: duración 30-90 s | script de medición (ver abajo) y 4 partidas reales con Playwright | cumplido en simulación; con reserva en partidas reales |

### Valoración del script de duración
`scripts/duracion.ts` usa la clase `Partida` real (no una versión trucada). Cada jugador simulado suelta la pieza la primera vez que pasa por el centro, con un error de tiempo aleatorio (±60 ms o ±150 ms) fijado por semilla. Es un jugador razonable, aunque optimista: no duda ni espera, y siempre apunta al centro.

### Partidas reales con Playwright (móvil, toques reales, lectura de `data-x`)
Con un bot que toca cuando |x| < umbral, el tiempo real fue:
- umbral 0,15: 32,5 s, 6 puntos
- umbral 0,4: 20,8 s y 23,3 s, 4 y 5 puntos
- umbral 0,8: 13,1 s, 2 puntos

Un jugador tosco acaba en 13-23 s, por debajo de los 30 s de D6. El bot es más impreciso que el jugador «descuidado» simulado (que da 10 piezas de mediana), por lo que no contradice la medición, pero indica que el suelo de 30 s solo se cumple si el jugador apunta con cuidado. Es una observación, no un fallo reproducible contra un criterio exacto: D6 no define el nivel de torpeza. Recomendación: revisar con jugadores humanos.

### Fallos
**F3 (menor). La puntuación cuenta piezas que se están cayendo.**
- Código: `src/logica/simulacion.ts`, `sigueEnPie` = `y >= 0 && |x| <= LIMITE_X`. `puntos` es el número de piezas que cumplen eso en el instante en que otra pieza cruza `y = 0` y termina la partida.
- Plan (T4): «número de piezas soltadas que **siguen sobre la plataforma** al acabar».
- Esperado: una torre derrumbada solo cuenta las piezas que de verdad quedan sobre la plataforma.
- Obtenido: las piezas aún en el aire o resbalando fuera de la plataforma, pero con `y >= 0`, cuentan (una torre derrumbada marcó 17).
- Valoración: incumple la letra del plan, aunque la regla de fin de partida sí coincide con lo implementado. El plan es ambiguo en cómo se decide «sobre la plataforma», y el código usa el criterio más laxo. Altera `puntos`, la tarjeta y la prueba dorada; si se corrige, hay que regenerar los valores fijos y documentarlo.
- Arreglo posible: contar solo las piezas con el centro dentro del ancho de la plataforma, o esperar a que todo esté quieto antes de contar al acabar.

### Sin comprobar
- Duración con jugadores humanos reales: no hay forma de probarlo aquí; solo bots.
- Motores Firefox y WebKit (`npm run e2e:motores`): no se ejecutaron en esta vuelta.

### Limpieza
Los servidores de Playwright se cierran solos al terminar; se borró el archivo de prueba temporal. Se comprobó que no queda ningún proceso vivo.
