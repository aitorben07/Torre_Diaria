# Torre Diaria, tercera versión. Pruebas del probador

Fecha: 2026-11-10. Rama `tercera-version`, commit probado `591f5cc`. Al terminar, `git log` y `git status` siguen en ese commit y en esa rama (solo hay cambios sin confirmar de fin de línea en `.github/workflows/pruebas.yml` y `docs/diseno/anuncios.md`: `git diff` no muestra ninguna línea cambiada).

## Veredicto

**APROBADO salvo: L6 completo (5 partidas libres, 3 niveles y 1 reto jugados a mano con música encendida, y la escucha de la música, D3).**

Aviso al coordinador: los requisitos económicos de L3 (medio sin plan, experto y medio con vídeos) **no se cumplen** con las cifras medidas hoy. Ya constan en `estado.md` como decisión («se propone en la revisión final ×1,5») y por eso no los cuento como fallo, pero siguen sin cumplirse hasta que el usuario decida. Si no los consideras cubiertos por esa decisión, el veredicto es FALLA por L3. Ver «Desviaciones declaradas».

No encontré fallos funcionales. Sí hay defectos menores de pantalla y capturas desactualizadas (apartado «Fallos»).

## Comprobaciones automáticas (repetidas por mí)

| Comprobación | Resultado |
|---|---|
| `npm test` | 35 archivos, 454 pruebas, todas pasan (25,8 s) |
| `npm run check` | 0 errores, 0 avisos, 3 sugerencias |
| `npm run build` | correcto |
| `npm run build:demo` (`astro build --mode demo --outDir dist-demo`) | correcto |
| `npm run e2e` completo, en primer plano | 237 pasan, 84 saltadas, **0 fallan**, 25,8 min (sin repeticiones ni intermitencias). Las saltadas son por diseño: `capturas.spec` exige `CAPTURAS=1` y varias pruebas de solo DOM corren solo en escritorio (R17) |
| `npm run medir:duracion` | novato 60,1 s (rango 60-150), medio 145,1 s (120-300), experto 261,8 s (240-720). Cadencia: 2,63 / 2,48 / 2,45 s. Primera pieza ≈2,0 s. Bronce o más del novato 60 %, plata o más del medio 57 %, oro del experto 77 %. Especiales por partida: 1,8 / 6,1 / 15,6 |
| `npm run medir:niveles` | sin fallos. Novato gana 1-5 en ≥ 9 de 10; medio ≥ 8 de 10 en todos; experto 10 de 10 con 3 estrellas; mediana del medio al ganar 31,7 s |
| `npm run medir:economia` | ver «Desviaciones declaradas» |
| Rendimiento en e2e | escritorio mediana 16,0 ms, p95 18,0 ms; móvil emulado mediana 17,0 ms, p95 28,0 ms (límite 33) con música; el tic de música: media 0,04-0,07 ms |

## Requisitos

| Requisito | Cómo se comprobó | Resultado |
|---|---|---|
| R1 tests, check, build, e2e | Ejecutados los cuatro | Cumple (casilla marcada) |
| R2 determinismo | `src/proyecto.test.ts` en `npm test` y `grep Math.random src/logica`: solo `semilla.ts` | Cumple |
| R3 pantalla igual a Node, R4 | `partida.spec.ts` en el e2e completo | Cumple (en verde). No revisé el texto de los commits para R4 |
| R5 enlaces seguros | Sin `innerHTML`, `outerHTML` ni `insertAdjacentHTML` en `src/` salvo pruebas; a mano `?reto=` y `?libre=` con `<img src=x onerror>` en 3 tamaños: no se inyecta nada y salen en el inicio | Cumple |
| R6 CSP | `git diff main -- public/_headers` vacío. `dist/index.html`: 0 `style="`, 0 `<style`, el único `<script>` es externo | Cumple (casilla marcada) |
| R7 mismo origen y sin errores | Peticiones y consola vigiladas en mis recorridos y en e2e | Cumple |
| R8 peso | JS de `dist/` 92.974 B con `gzip -9` (≤ 150 KB); fuentes 60.012 B (≤ 80 KB) | Cumple (casilla marcada). No comprobé que esté anotado en el README |
| R9 licencias | `git diff main -- package.json`: solo scripts, sin dependencias nuevas | Cumple (casilla marcada). No ejecuté `npm query` |
| R10 almacenamiento que falla | A mano con `localStorage` que lanza `SecurityError` (escritorio, 390, 320): arranca en inicio, se juega y se llega al fin sin errores. Además e2e y Vitest | Cumple |
| R11 sin audio ni mapas de bits | `dist/` solo tiene css, html, js, txt y 2 woff2 | Cumple (casilla marcada) |
| R12 sin botones inútiles en la web | A mano en producción (escritorio, 390, 320): inicio sin «Monedas gratis», sin botones de vídeo ni de pago visibles; la pestaña «Monedas» está oculta (`isVisible` falso); en «¿Seguir?» el botón de vídeo está `hidden`. En la demo, a 390: banda «Demostración: no se cobra nada y los vídeos son de prueba», pestaña Monedas con «Ver vídeo», 1.000 / 3.000 / 8.000 monedas con precio en € y «Pack de ayudas». e2e `demo` (5 pruebas) en verde: comprar suma 1.000 y recargar no repite, vídeo de 60 con «Disponible en 1 min» a las 3 h 59, objeto gratis, «Ver vídeo» en «¿Seguir?» | Cumple (casilla marcada) |
| R13 reto sin objetos ni «¿Seguir?» | A mano con progreso con objetos: reto oficial en 390 y 320, sin barra de objetos, sin «¿Seguir?» hasta el fin. Vitest y `objetos.spec` | Cumple |
| R14 sin textos de demo en `dist/` | `grep` de «Demostración», «Vídeo de prueba» y «pagosSimulados» en `dist/`: ninguno. Solo quedan nombres de clase CSS `banda-demo`, `capa-demo` y `panel-demo`, sin texto visible | Cumple (casilla marcada) |
| R15 botones ≥ 44 px, sin desplazamiento horizontal | A mano: inicio, ajustes, pausa, fin, mapa, tienda y retos en 1280×800, 390×844 y 320×568: 0 botones menores de 44 px y 0 desbordes (salvo el matiz de la pestaña «Escenarios» en 320, ver fallo 2). No probé 360×640 ni 1280×600 a mano (los cubre `pantalla.spec` y `marcador.spec` en e2e) | Cumple con un matiz menor |
| Pedido: música acorde | Pruebas Vitest de escala y duración en verde; `data-musica` pasa a `partida:0` al jugar. **No pude juzgar el sonido** | Sin comprobar (oído) |
| Pedido: ajustes con música y sonidos por separado | A mano en 3 tamaños: Música, Sonidos y Vibración cambian `aria-checked`, se guardan (`ajustes` en `torre-diaria:progreso`) y se mantienen al recargar. Créditos con Bricolage Grotesque, planck y «Música original compuesta en código» | Cumple |
| Pedido: pestaña inicial con jugar, niveles, tienda | Inicio con logo `<h1>` «Torre Diaria», «Jugar», tarjetas «Reto de hoy», «Niveles» y «Tienda», fichas de monedas y ajustes. Sin HUD y sin caída de piezas (`data-pasos` no existe) | Cumple |
| Pedido: mapa principal y lo demás en márgenes | `#mapa` mide 800 de 800 px (escritorio), 844 de 844 (390) y 568 de 568 (320); HUD oculto; fichas en las esquinas; «Jugar nivel N» arranca el nivel 1; la ventana del nivel abre al tocar y se cierra con Escape | Cumple |
| Pedido: logo adaptado y atractivo | Captura a 320 y 390: logo con piezas con ojos, gancho y muelle; `h1` de 352 px en 390 y de 287,5 px en 320 (cabe en la columna menos 2 rem) | Cumple |
| Pedido: la puntuación no se sale con más de 1.000 | Partida real en 320×568 hasta 1.200 puntos: clase `cifras-5`, letra 32,8 px, `scrollWidth` 116 = `clientWidth` 116, sin desborde (captura revisada). 999.999 en 320 con `marcador.spec` (5 tamaños) en verde. La ficha de monedas con 999.999 cabe en 3 tamaños | Cumple |
| Pedido: piezas especiales con mejoras | En 320, una partida a mano mostró `data-especial` = dorada, pegajosa y cemento. Del efecto solo vi la captura del cemento («¡A PIEDRA!», ola gris) y el «+10» de la dorada en mi partida a 320; las gotas de la pegajosa no las vi. `especiales.spec` en verde (escritorio). Si se entienden sin leer el aviso: no valorado | Cumple (comprobado a mano solo en la lógica y la pantalla; la comprensión queda sin comprobar) |
| Pedido: 3 objetos con monedas, vídeo o dinero | Barra de reloj y cemento con su número; el reloj baja la velocidad de 1,3 a 0,78 (×0,6) y gasta una unidad; con corazón, «¿Seguir?» ofrece corazón (tienes 1), 250 monedas y «No, ver resultado»; «Usar corazón» sigue con 1 vida. Tienda: comprar reloj con 600 monedas deja 480 y «Tienes 3» (partía de 2). Vídeo y dinero: solo en la demo | Cumple |
| Pedido: monedas con dinero y vídeo cada x horas | Solo en la demo (60 monedas cada 4 h; 1.000, 3.000, 8.000 y pack con precios simulados). En la web no se ofrece | Cumple |
| Pedido: arranque menos lento con velocidades que progresan | Primera pieza ≈ 2,0 s (antes 3,4 s); cadencia inicial medio 2,48 s; `data-velocidad` 1,3 m/s al inicio, con +0,025 por pieza | Cumple |
| Migración desde un guardado v2 | A mano con un progreso v2 con 999.999 monedas, `sonido: false`, un día jugado con reglas 2, niveles y racha: carga en el inicio, Música y Sonidos quedan apagados, saldo 999.999 sin cortarse, Retos se abre. Vitest cubre campos y 10 casos raros | Cumple |
| Pausa | A mano: el botón abre «Pausa» con «Seguir», «Ajustes» e «Inicio»; con la pausa `data-pasos` no cambia (6054 → 6054 en 1,5 s); Ajustes desde la pausa y volver a Seguir funciona. En el reto, texto de pausa visto en e2e | Cumple |
| Tienda | Pestañas Objetos, Piezas y Escenarios en la web; el saldo 999.999 cabe en 3 tamaños | Cumple |
| L1 duración y medallas | `medir:duracion` (tabla de arriba) | Cumple. El novato queda a 0,1 s del mínimo de 60 s |
| L2 niveles | `medir:niveles` | Cumple |
| L3 economía | `medir:economia` | **No cumple 3 de 5 puntos (desviación declarada)** |
| L4 peso y rendimiento | JS 92.974 B; p95 móvil 28 ms | Cumple |
| L5 README | Búsqueda: el README ya no dice «Al abrir la página ya se está jugando» ni nombra la barra con Colección | Cumple en esos dos puntos; el resto no lo leí |
| Bloques 0, B, C1, D1-D2, E1, H1-H2, I1-I2, K1-K2 (lógica pura) | `npm test` en verde (454 pruebas) | Cumple por Vitest; no revisé cada enunciado de la lista contra su prueba |
| L6 comprobación a mano | Ver «Sin comprobar» | Sin comprobar (en parte) |

## Desviaciones declaradas

`npm run medir:economia`:

- Medio sin plan: catálogo completo el día 9 (L3 pide entre 10 y 30). **No cumple.**
- Experto: catálogo completo el día 4 (pide no completarlo antes del día 7). **No cumple.**
- Medio con vídeos: catálogo completo el día 8 (pide no antes del día 10). **No cumple.**
- Cumplen: novato primera compra a los 6,8 min (≤ 12); medio con 4 temas el día 7 (3 a 6); medio con objetos completa el día 11; una partida del medio da 155 monedas y el reloj cuesta 120.

Causa: las doradas dan monedas extra. El desarrollador no tocó los precios de los temas y propone subirlos ×1,5 en la revisión final (`estado.md`). La decisión corresponde al usuario.

R17: el e2e local tarda 25,8 min; el requisito del CI era ≤ 20 min. Ya anotado en `estado.md` y `mediciones.md`.

## Fallos

Ninguno funcional. Defectos menores:

1. **Capturas de `docs/proceso/tercera-version/capturas/` desactualizadas (gravedad baja).** Pasos: abrir `escritorio-inicio.png`, `movil-inicio.png`, `movil-especial-cemento-efecto.png`. Esperado: el estado final. Obtenido: la tarjeta pone «Colección / Piezas y escenarios» (hoy es «Tienda / Objetos y piezas»), y las capturas de especiales muestran la barra inferior con sonido, vibración, racha y estrellas, que ya no existe. Las capturas solo se regeneran con `CAPTURAS=1` y no se rehicieron tras J/E. Lo demás de las capturas (emojis, textos, solapes) no mostró cortes ni solapes graves.
2. **Pestaña «Escenarios» apretada en 320 px (gravedad baja).** Pasos: 320×568, Inicio, Tienda. Esperado: texto dentro del botón. Obtenido: `scrollWidth > clientWidth` en «Escenarios» (caja 211-298 de 320) y en la captura el texto toca el borde derecho.
3. **Barra de objetos tapa la base de la torre en 320×568 (gravedad baja, solo estética).** Pasos: con reloj y cemento, pulsar «Jugar». Esperado: la barra no tapa el muelle. Obtenido: los dos botones redondos cubren el muelle y el arranque de la torre.
4. **Mapa en 320 con 0 estrellas (gravedad baja).** Pasos: abrir Niveles en 320×568 sin progreso. Esperado: el último nodo visible no queda bajo las fichas. Obtenido: un nodo del borde superior queda parcialmente bajo «Puerto» y las estrellas.
5. **CSS de demostración en producción (gravedad muy baja).** `dist/_astro/*.css` lleva las clases `.banda-demo`, `.capa-demo` y `.panel-demo` aunque la web no las use. No hay texto ni código de demo (R14 cumple).

## Sin comprobar

- **L6 completo.** No jugué 5 partidas libres, 3 niveles y 1 reto enteros con música encendida y anotando la duración y la cadencia que se percibe: mis partidas automáticas no miden la sensación. Jugué a mano (con script) unas 6 partidas libres cortas, un nivel arrancado y un reto oficial hasta el fin. No valoré si «¿Seguir?» molesta ni si las especiales se entienden sin leer el aviso.
- **D3, escucha de la música** (no cansa en 5 min, encaja con el juego): no automatizable y no puedo oír.
- **Ganar un nivel y volver al mapa centrando el siguiente** y los avisos de objeto nuevo en el fin: solo por e2e (escritorio), no a mano.
- **Retos con `localStorage` bloqueado y la ficha de la partida guardada** en móvil: solo por e2e en escritorio.
- **360×640 y 1280×600 a mano:** no se probaron a mano.
- **Pausa del reto oficial («Abandonar el reto»)**: solo por e2e en escritorio.
- **CI en GitHub Actions** (tiempo de la segunda compilación, K3): no accesible.
- **Marcador con 999.999 en el juego real:** probé 1.200 real y 999.999 solo con el texto inyectado en `marcador.spec` (5 tamaños).
- **R4** (commits de pruebas doradas) y **`npm query`** de licencias: no los revisé.

## Procesos y puertos

Los servidores de la prueba (4329, 4330, 4401 y 4402) y los navegadores los lanzó y cerró Playwright. Al terminar no queda ningún proceso `node` ni `chrome` mío, ningún puerto en escucha (solo conexiones `TIME_WAIT` sin dueño) y borré mi carpeta temporal `tmp-verif/` y `test-results/`. No modifiqué código, pruebas del producto ni `estado.md`. En `tareas.md` solo marqué las casillas R1, R6, R8, R9, R11, R12 y R14.
