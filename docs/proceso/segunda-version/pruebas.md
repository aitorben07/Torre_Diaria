# Pruebas de segunda-version (probador independiente)

Fecha: 2026-11-09. Rama `segunda-version`, commit 49aca57. Windows 10, Chromium de Playwright.

## Veredicto

**APROBADO salvo: G1** (`npm run e2e` no salió en verde en la ejecución completa: 1 prueba intermitente falló y por ello 2 pruebas de rendimiento no se ejecutaron; ver Fallo 1).

El resto de requisitos revisados se cumplen o están cubiertos por las pruebas automáticas que pasan. Ningún fallo de producto encontrado jugando.

## Ejecuciones

| Comando | Resultado |
|---|---|
| `npm test` | 24 archivos, 282 pruebas, todo verde (15,7 s) |
| `npm run check` | 0 errores, 0 avisos, 2 hints (`execCommand` obsoleto en el copiado) |
| `npm run build` | correcto |
| `npm run e2e` (12,6 min) | 156 pasan, **1 falla**, 31 saltadas, 2 no ejecutadas (los dos `rendimiento-*`, que dependen de los demás proyectos) |
| `npx playwright test --no-deps --project=rendimiento-escritorio --project=rendimiento-movil` | 2 pasan: escritorio mediana 16 ms, p95 18 ms; móvil CPU x4 mediana 17 ms, p95 31 ms (límite 33) |
| La prueba que falló, repetida sola en móvil 3 veces | 3 de 3 pasan (34 a 43 s cada una) |
| `npm run medir:duracion` | novato 83 s (60-150), medio 170 s (120-300), experto 302 s (240-720); ninguna partida llega al tope; medallas: novato bronce o más 63 %, medio plata o más 57 %, experto oro 73 % |
| `npm run medir:economia` | novato primera compra a los 10,9 min (≤12), 2 artículos al día 7; medio 3 artículos al día 7, catálogo completo el día 14; experto catálogo completo el día 7 (no antes) |
| `npm run medir:niveles` | sin fallos ni umbrales distintos; el novato gana 1-5 (10, 10, 10, 10, 9 de 10); medio 10/10 en todos; experto 3 estrellas 10/10; mediana ganada del medio 30,1 s |

## Requisitos

| Requisito | Cómo se comprobó | Resultado |
|---|---|---|
| G1 | Ejecutar los cuatro comandos | Test, check y build bien. e2e: 1 falla intermitente. **No cumplido en esa ejecución** (Fallo 1) |
| G2 Determinismo | `grep` en `src/logica`: solo `Math.random` en `semilla.ts` (código libre); sin `Date.now`, `performance.now`, `Math.sin`, `Math.cos`; `planck` solo en `simulacion.ts`, `puntuacion.ts` (un comentario), tests | Cumplido |
| G3 Pantalla igual a Node | Prueba e2e `partida.spec.ts` dentro de los 156 verdes | Cumplido |
| G4 Pruebas doradas | Existen en Vitest (verdes). No revisé el texto de cada commit | Cumplido en lo que se ve; mensajes de commit sin comprobar uno a uno |
| G5 Enlaces | En navegador, escritorio y móvil: `?reto=1.5<img src=x onerror=alert(1)>`, `?libre=<script>alert(1)</script>`, `abc`, `ABC.1`, 8 caracteres, puntos 1000000, vacío: no hay diálogo, no hay `img` ni `script` inyectado y se abre la partida libre. Sin `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval` ni `document.write` en `src/` | Cumplido |
| G6 CSP | `public/_headers`: la única diferencia con `main` es `font-src 'self'`. `dist/index.html` solo tiene un `<script type=module src>` y ningún `style="` ni `<style>` | Cumplido |
| G7 Mismo origen, sin errores | En mi recorrido (libre, pantallas, URL, `localStorage` bloqueado, migración) 0 errores de consola y 0 peticiones ajenas; e2e verde | Cumplido |
| G8 Peso | JS de `dist/` con `gzip -9`: 79.663 bytes (≤150 KB); `.woff2`: 18.668 + 41.344 = 60 KB (≤80 KB); sin audio ni PNG en `dist/`; `fuentes/OFL.txt` presente | Cumplido |
| G9 Licencias | `npm query "*"`: MIT, ISC, BSD, Apache-2.0, OFL-1.1 (la fuente), también MPL-2.0, BlueOak, CC0, 0BSD y un `Apache-2.0 AND LGPL-3.0-or-later` (casi seguro `sharp`/libvips de Astro, transitivo y de compilación). Sin GPL ni AGPL | Cumplido (la LGPL transitiva queda anotada; no se identificó el paquete) |
| G10 Almacenamiento falla | Navegador con `localStorage` que lanza al acceder: se juega una partida hasta el fin y se abren Retos, Niveles y Colección sin errores; Vitest y e2e verdes | Cumplido |
| B1-B5 núcleo | Vitest y e2e verdes; en navegador: al abrir `/` está `data-estado="jugando"` y `data-modo="libre"`; vidas a 0 tras 3 caídas; Intro y Espacio (sin foco en un botón) reinician con otra semilla; el aviso «Toca para soltar» aparece en la primera partida y no tras recargar; sin la palabra «Práctica» en la interfaz (solo en una prueba que la prohíbe) | Cumplido |
| B3/B4 duración | `medir:duracion`, tabla arriba | Cumplido |
| A1 Fuente/CSP | Dos `.woff2` y licencia en `dist/`; fuente cargada en las capturas | Cumplido |
| A2-A5 arte y jugosidad | Revisé las capturas del proyecto y las mías (móvil 390 y Pixel 7, escritorio 1280x800): sin emojis, sin textos cortados, sin solapes apreciables, botones ≥44 px (medidos en el fin), sin scroll horizontal. e2e de arte, sonido y háptica verdes (salvo la intermitente) | Cumplido, con Fallo 1 en la prueba de efectos |
| A2 fotogramas | Prueba de rendimiento ejecutada aparte | Cumplido en este equipo |
| C1-C3 progreso, monedas, colección | Vitest y e2e verdes; capturas de Colección con vistas previas, precios y estados | Cumplido. No compré yo nada a mano en el navegador |
| C4 misiones | Aplazadas por decisión aceptada | No aplica |
| C5 economía | `medir:economia`, arriba | Cumplido (el experto completa el catálogo exactamente el día 7, no antes) |
| D1-D3 retos, calendario, rachas, enlaces | Vitest y e2e verdes; en navegador: calendario abierto en escritorio y móvil, `?reto=1.5` muestra «Tu amigo hizo 5 puntos en el día #1», `?reto=` de un día futuro y malformados abren la libre | Cumplido |
| E1-E3 niveles | Vitest, e2e y `medir:niveles` verdes; capturas del mapa y de la ficha del nivel | Cumplido. No jugué un nivel a mano |
| F1-F3 compartir | En navegador sin `navigator.share`: aparecen «Descargar imagen» y «Copiar texto», la descarga baja `torre-diaria-libre.png`, la vista previa es un lienzo reducido; `?libre=a1b2c3.300` muestra «Tu amigo hizo 300 puntos en esta partida». Con `share` simulado y los demás modos, solo por e2e | Cumplido; la rama con `share` real no se probó fuera de las simulaciones |
| G1-G de anuncios (bloque G) | e2e de anuncios verde; ningún botón de anuncio visible en mis recorridos; `dist/` sin `crazygames`, `poki`, `googlesyndication` ni `adsbygoogle` | Cumplido |
| Migración v1 | Con solo `torre-diaria:resultado` `{dia:16, puntos:7, ...}` y fecha 2026-11-20: se crea `torre-diaria:progreso` con `diarios[16] = {piezas:7, puntos:0, enSuDia:true, reglas:1}`, racha 0, y la clave v1 sigue ahí. Coincide con `impacto.md` §5 (I2: sin convertir puntos ni racha), que prevalece sobre el `puntos === 70` del texto original de C1 | Cumplido |
| H1 README | Hay mediciones con fecha 2026-11-09 y la descripción de modos, bronce 550, plata 2.400, oro 4.000 | Cumplido (leído por encima, no línea a línea) |
| Objetivo del usuario | Se entiende al instante: al abrir ya se juega, con un solo aviso. Sin emojis en el cuerpo (`\p{Extended_Pictographic}` es falso en el DOM del fin). Anuncios solo como interfaz vacía | Cumplido |

## Fallos

1. **Prueba e2e intermitente, gravedad baja (de las pruebas, no del producto) pero incumple G1.** `e2e/arte.spec.ts:52` «cada evento lanza su efecto…» en el proyecto `movil` falló en `npm run e2e` completo con `expect(c[tipo]).toBeGreaterThan(0)` y valor `undefined` (línea 74: falta el contador de algún tipo; no se ve cuál, el mensaje solo muestra `undefined`). Pasos: `npm run e2e` con 2 hilos y el equipo cargado. Esperado: todo verde. Obtenido: 1 fallo, y como los proyectos `rendimiento-*` dependen de los otros, no se ejecutaron. Repetida sola, 3 de 3 pasa (34-43 s). Causa probable: la prueba depende de tiempos de la partida real (suelta hasta 20 intentos buscando el hito de 5 m) y en carga no llega a algún evento. Sugerencia: que la prueba comprima su espera o relea los contadores con `waitForFunction` hasta que estén todos.
2. **Observación menor, gravedad muy baja.** Tras pulsar «Descargar imagen» el foco queda en ese botón y Espacio vuelve a pulsarlo en lugar de «Otra vez». Es el comportamiento normal de un botón con foco; sin foco en un botón, Espacio e Intro sí reinician. No se considera fallo.
3. **Observación de equilibrio, no es fallo.** El jugador medio y el experto sacan 3 estrellas en 10 de 10 intentos en los 10 niveles, y los niveles 1 a 3 y 5 tienen umbral de 3 estrellas de 100 con partidas de 140 a 200 puntos: los niveles son fáciles para quien juega con cuidado. Cumple los mínimos del plan.

## Sin comprobar

- Móvil real, táctil real, vibración real y rendimiento fuera de este equipo.
- Sonido real (WebAudio con dispositivo de audio) y `navigator.share` real de un sistema operativo; solo hay pruebas con simulaciones.
- Firefox y WebKit (`npm run e2e:motores`, informativo): no lo ejecuté.
- No jugué a mano un nivel completo, una compra en la Colección ni un reto diario desde el calendario hasta la medalla; eso lo cubren los e2e verdes, que no he auditado línea a línea.
- G4: no leí los mensajes de commit de las pruebas doradas una a una.
- Identidad del paquete con licencia `Apache-2.0 AND LGPL-3.0-or-later` (transitivo).
- Las capturas de `docs/proceso/segunda-version/capturas/` se vieron por muestreo (móvil: fin, Retos, Niveles, Colección; escritorio: fin con imagen), no las 32.

## Procesos

Los dos servidores de vista previa que lancé (PIDs 11748 y 15484, puertos 4411 y 4412) los cerré por PID desde el propio script. Al terminar no hay procesos `node` ni de Chromium míos vivos y los puertos 4329, 4411 y 4412 no tienen ningún proceso escuchando (solo conexiones en TIME_WAIT). Mis scripts temporales están en el directorio temporal de la sesión, fuera del proyecto.

## Vuelta 2

**Veredicto: APROBADO.** G1 queda resuelto; no hay fallos ni requisitos sin comprobar.

| Corrección | Cómo se comprobó | Resultado |
|---|---|---|
| G1: prueba de efectos A3 | Diff desde 2fe8dc8: mismos 9 eventos exigidos más `sacudidaMax`, sin bajar ninguna comprobación; cada pieza se suelta a por el efecto que falta. Repetida 10 veces (5 en escritorio y 5 en móvil) | Cumplido, 10/10 |
| F3: foco tras «Descargar imagen» | Una línea en `principal.ts` (`botonOtraVez().focus()`) y prueba nueva: foco en `#boton-otra-vez`, Espacio empieza otra partida, 0 descargas extra. Repetida 4 veces en escritorio | Cumplido, 4/4 (se omite en móvil por diseño) |
| E2: niveles 4 y 6-10 | Diff de `niveles.ts`, `niveles.test.ts` y `niveles.spec.ts` (actualizados al cambio, sin relajar). `medir:niveles`: el medio gana 6/10 o más en todos (nivel 10: 6/10), mediana 30,7 s, 0 umbrales iguales, 0 fallos | Cumplido |

Comprobaciones completas:
- `npm test`: 282 de 282.
- `npm run check`: 0 errores y 0 avisos (2 hints).
- `npm run build`: bien.
- `npm run e2e`: 160 superadas, 32 omitidas, 0 fallos (14 min). Rendimiento: escritorio mediana 16,0 ms y p95 18,0 ms; móvil p95 27,0 ms.

Juego real en el navegador (escritorio, Chromium, script temporal ya borrado): el nivel 7 (12 piezas con 1 vida) y el nivel 10 (14 m con 2 vidas) se ganaron soltando a ≤0,12 m del objetivo. La pantalla muestra «Meta: 14 m» y las vidas, y el fin dice «Superado: …». El nivel 8 da 3 estrellas siempre al ganar, como anota el código (los puntos son el objetivo).

Notas, sin fallo:
- El nivel 10 con el jugador medio simulado gana 6 de 10 veces. Es difícil pero ganable.
- Los niveles 6 y siguientes salvo el 8 no los gana el novato simulado. Es intencionado.
- Procesos: Playwright abrió y cerró sus servidores y navegadores. No lancé nada propio, no queda ningún proceso mío ni puerto ocupado por mí (4329 lo usa solo `npm run e2e`).

## Vuelta 3

**Veredicto: APROBADO.** Los 6 arreglos del revisor hacen lo que dicen, sin relajar pruebas ni seguridad. No hay fallos.

| Arreglo | Cómo se comprobó | Resultado |
|---|---|---|
| Cobro de partida libre repetida | Diff desde 4625a73: `id` = semilla + nº de partida + código al azar; `cobrarLibre` devuelve `{progreso, monedas, nuevoRecord, nuevo}` y el fin muestra solo lo guardado. En navegador: `?libre=a1b2c3.1` jugada 3 veces (con recarga y con «Otra vez»): partidas 1, 2, 3 y monedas 4, 8, 12, cada una cobrada. Con récord sembrado en 10 y la misma semilla repetida: el récord pasa a 50 y se guarda, la repetición suma partida y monedas | Cumplido |
| CI a 30 min | `.github/workflows/pruebas.yml` y README | Cumplido |
| «Usar» reaparece | `pintarFin` pone `hidden = false`; prueba e2e nueva (Ciudad, luego Nubes) en verde | Cumplido |
| 700 ms en todos los botones del fin | `finListo()` en Copiar, Compartir, Descargar y Usar. En navegador: toque a ~150 ms en Compartir, 0 llamadas a `navigator.share`; pasados 700 ms, 1 llamada. Prueba e2e nueva con los 4 botones (300 ms) en verde | Cumplido |
| Reto que cruza la medianoche UTC y racha | `diaEmpezada` se usa en `registrarOficial`, `rachaDeHoy` y la cola de la tarjeta; la racha se difiere (`rachaPendiente`) con un reto oficial en marcha y se revisa al acabar o al empezar otra. Pruebas e2e nuevas en verde | Cumplido |
| Tarjeta de v1 y repeticiones sin `?reto=` | `enlace()` en `tarjeta.ts` enlaza solo el origen si `enPiezas` o `repeticion`; pruebas unitarias y e2e nuevas en verde | Cumplido |
| Código muerto e imagen de la ficha con el tema | Quita `generarPNG`, `leerResultado`, `enPausa` (sin usos restantes: compila y `check` limpio); la clave de imagen es día+tema+escenario; e2e de cambio de tema genera PNG distinto | Cumplido |
| Seguridad intacta | `src/logica/reto.ts` y `semilla.ts` no aparecen en el diff: el validador de `?reto=` y `?libre=` no cambió | Cumplido |

Comprobaciones completas:
- `npm test`: 284 de 284 (24 archivos).
- `npm run check`: 0 errores y 0 avisos (2 hints).
- `npm run build`: bien.
- `npm run e2e` completo en primer plano: 169 superadas, 33 omitidas, 0 fallos (14,0 min). Coincide con el README (169 y 33), sin diferencia. Rendimiento: escritorio mediana 16,0 ms y p95 19,0 ms; móvil p95 28,0 ms.

Notas, sin fallo:
- En el fin, el texto accesible de las monedas se lee «+44 monedas» porque se concatenan el número visible («+4») y el texto para lectores («4 monedas»); es solo cómo lo junta `textContent`, no un error de cobro.
- La misma semilla jugada igual da el mismo récord (50); por eso para ver «superar» sembré un récord previo de 10.

Sin comprobar: igual que en vueltas anteriores (móvil real, sonido real, `navigator.share` real, Firefox y WebKit). El cruce real de la medianoche UTC solo se cubre con la prueba e2e simulada.

Procesos: mis dos scripts temporales (`e2e/tmp-vuelta3.spec.ts`) se borraron. Playwright abrió y cerró sus propios servidores y navegadores; no lancé nada propio, no queda ningún proceso mío ni puerto ocupado por mí.
