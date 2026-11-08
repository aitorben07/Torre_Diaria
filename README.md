# Torre Diaria

Juego web de apilar piezas con un solo toque. Cada día hay un reto con la misma secuencia de piezas para todos; se juega sin registrarse, en el móvil o en el ordenador. Al acabar se copia o se comparte una tarjeta con emojis, la puntuación, el número de día y un enlace para retar a un amigo. También hay partidas de práctica.

En esta fase no hay ranking compartido ni servidor: el resultado del día se guarda solo en el navegador (ver `docs/proceso/version-inicial/tareas.md`, D3). Aún no está desplegado en ningún sitio.

## Cómo jugar

Una pieza va de lado a lado sobre la plataforma. Toca la pantalla o pulsa Espacio o Intro para soltarla; la siguiente aparece arriba, y así hasta que algo cae de la plataforma y se acaba. Desde el inicio se elige entre el reto de hoy, la práctica o, si se abrió un enlace de reto, la partida del amigo.

## Reglas

> **Segunda versión en curso (rama `segunda-version`).** El núcleo ya tiene vidas, perfectos con imán, combos, hitos de altura y partida libre al abrir (ver `docs/diseno/diseno-juego.md`, apartado 2, y «Mediciones de la segunda versión» más abajo). Las reglas de este apartado son las de la v1 hasta que el bloque H de `docs/proceso/segunda-version/tareas.md` reescriba este README.

- **Puntuación: piezas colocadas.** La partida acaba cuando una pieza cae de la plataforma. La puntuación son las **piezas colocadas**: las que estaban en pie (centro por encima de la plataforma y dentro de sus 4 m de ancho) en el momento de soltar la última pieza. No cuenta esa última ni se resta lo que se derrumbe después. Tras la caída, la escena sigue moviéndose sin piezas nuevas hasta que todo está quieto o pasan 180 pasos (3 s); es solo animación y no cambia los puntos. La altura y las formas de la tarjeta son las de las piezas colocadas.
- **Un intento oficial al día.** El reto de hoy (misma secuencia para todos, derivada de la fecha UTC) cuenta una sola vez; el resultado se guarda en `localStorage` y, al volver, se muestra con su tarjeta. Después se puede jugar práctica, que no se guarda. Si el almacenamiento falla, el juego funciona sin guardar.
- **El día cambia a medianoche UTC** (la 1:00 en España en invierno, las 2:00 en verano). El día 1 es el 2026-11-05 (`DIA_1` en `src/logica/semilla.ts`, supuesto D5).
- **Enlace de reto:** `?reto=<día>.<puntos>` (por ejemplo `?reto=12.34`). Quien lo abre juega la secuencia de ese día y ve la puntuación a batir. Si el día es hoy y aún no ha jugado, esa partida es su intento oficial; si es otro día, no se guarda como oficial. Los formatos no válidos o de días futuros se ignoran. El origen del enlace sale de `location.origin`, sin dirección fija en el código.

## Uso

Necesita Node 22 o posterior (probado con Node 24.18.0 y npm 11.16.0).

```sh
npm ci                                  # instalar
npx playwright install chromium         # navegador de las pruebas e2e (una vez)
npm run dev                             # servidor de desarrollo
npm test                                # pruebas de la lógica (Vitest)
npm run e2e                             # pruebas en Chromium de escritorio y móvil (Playwright)
npm run e2e:motores                     # prueba informativa en Firefox y WebKit (no bloquea)
npm run check                           # comprobación de tipos (astro check)
npm run build                           # compila a dist/
npm run preview                         # sirve dist/
npm run medir                           # mide el tiempo de jugar() en Node
npm run medir:duracion                  # mide la duración de las partidas con jugadores simulados
```

`npm run e2e` compila y sirve `dist/` en el puerto 4329 antes de probar. Para las pruebas, el contenedor `#juego` expone su estado en atributos `data-*` (`estado`, `fase`, `x`, `toques`, `puntos`, `altura`, `semilla`). La partida que se compara con `jugar` en Node toca con un `pointerdown` lanzado dentro de la página cuando la pieza pasa por el centro, porque un toque desde Playwright llega cientos de milisegundos tarde con varios navegadores en paralelo; las demás pruebas usan toques y teclas reales. `npm run e2e:motores` necesita `npx playwright install firefox webkit`.

### Desplegar en Cloudflare Pages (a mano, no se ha hecho)

```sh
npm run build
npx wrangler pages deploy dist --project-name torre-diaria
```

Requiere iniciar sesión en Cloudflare con la cuenta del propietario (`wrangler` no es dependencia del proyecto: `npx` lo descarga). `public/_headers` pone la CSP y las demás cabeceras de seguridad en Cloudflare Pages. El enlace de la tarjeta usa `location.origin`, así que cambiar de nombre o de dominio no exige tocar el código. Sin comprobar: que el nombre `torre-diaria.pages.dev` esté libre.

## Estructura

- `src/logica/`: lógica pura, sin navegador. `semilla.ts` (fecha UTC, número de día y generador), `piezas.ts` (secuencia y paleta), `simulacion.ts` (física con planck y `jugar(semilla, toques)`), `tarjeta.ts`, `reto.ts`, `registro.ts`.
- `src/juego/`: pantalla. `bucle.ts` (paso fijo), `dibujo.ts` (canvas), `pantallas.ts` (inicio, fin, copiar y compartir), `principal.ts` (entrada).
- `src/pages/index.astro` y `src/estilos.css`: la única página.
- `e2e/`: pruebas de Playwright. `scripts/medir-jugar.ts`: medición de tiempo. `scripts/duracion.ts` y `scripts/medir-duracion.ts`: jugadores simulados para medir la duración (D6).

## Por qué estas herramientas

- **Astro sin React (D1).** La estrategia pide React para interfaces de aplicación, pero aquí la interfaz es un lienzo y unos pocos botones: React solo añadiría peso. Astro compila a una página estática para Cloudflare Pages. La lógica está en `src/logica/` sin dependencias de interfaz, así que se puede cambiar.
- **planck para la física (D2).** Es Box2D en TypeScript (MIT): las pilas aguantan más estables que con matter-js, y hacer un motor propio estable cuesta mucho. Está fijado a la versión exacta `1.5.1` y solo lo importa `src/logica/simulacion.ts`; una prueba dorada falla si una actualización cambia los resultados.
- **Sin CI (D9).** La cuota de GitHub Actions va justa y el repositorio aún no está en GitHub. Las pruebas se ejecutan en local.

## Limitaciones y lo que no se ha comprobado

- **El resultado de una partida solo se garantiza igual en el mismo navegador.** Las piezas son las mismas para todos, pero planck usa `Math.sin`, `Math.cos` y `Math.atan2` en cada paso (`node_modules/planck/src/dynamics/Position.ts`, `src/common/Rot.ts`), y esas funciones pueden dar decimales distintos en otros motores. La misma secuencia de toques puede dar otra puntuación en Safari que en Chrome.
- **Sin comprobar:** Firefox (no se pudo ejecutar, ver Mediciones); Safari en iPhone y navegadores Android reales (solo se probó Chromium de escritorio y con emulación de móvil, y WebKit de Playwright, que no es Safari); la duración de las partidas con personas (solo hay jugadores simulados).
- **Los navegadores integrados de WhatsApp o Instagram guardan su propio resultado.** Si se abre el enlace ahí y luego en el navegador normal, no aparece el resultado del día y se puede repetir el intento oficial. Lo mismo pasa al borrar los datos del sitio: sin servidor no se puede evitar (D4).
- Sin ranking, sin servidor, sin CI (D9), sin `og:image` (D8) y sin repositorio en GitHub (D11). Toda la interfaz va en español.

## Segunda fase: ranking compartido

No está hecha. Haría falta una base D1 y Pages Functions en la cuenta de Cloudflare, y decidir sobre nombres y moderación (D3). Sin registro, cualquier puntuación enviada desde el navegador se puede falsificar, salvo que el servidor vuelva a simular la partida con `jugar(semilla, toques)`. **Eso no cabe tal cual en 10 ms de CPU por petición** (límite de un Worker gratuito): simular una partida de 43 piezas tarda del orden de 1 a 2 s en Node (ver Mediciones), 100 veces o más. Además, ni un Worker con V8 reproduce al bit una partida de Chrome (ver la última medición), así que habría que validar con margen (por ejemplo, solo los puntos) o pasar a una física sin trigonometría del sistema. Hay que medirlo en un Worker real antes de decidir.

## Mediciones de la segunda versión (2026-11-06, bloque B)

Node 24.18.0 en este equipo Windows. Las cifras caducan: repítelas tras cambiar el código.

- **Duración y puntos (B4, `npm run medir:duracion`, días 1 a 30):** tres jugadores simulados sueltan cada pieza la primera vez que pasa por el objetivo (el centro de la pieza más alta), con un error de tiempo uniforme fijado por semilla. La duración es pasos/60 e incluye los episodios de caída. Ninguna partida llega al tope de 30 minutos y dos ejecuciones dan las mismas cifras.

  | Perfil | Error | Duración mediana (rango) | Piezas | Puntos | Perfectos | Monedas | Tiempo del script |
  |---|---|---|---|---|---|---|---|
  | novato | ±180 ms | **83,2 s** (48,9 a 115,7) | 19 (10 a 29) | 567,5 (205 a 1.200) | 13 | 38,5 | 12,6 s |
  | medio | ±90 ms | **169,8 s** (113,5 a 202,1) | 49 (30 a 63) | 2.430 (1.725 a 3.220) | 42 | 112 | 26,4 s |
  | experto | ±40 ms | **302,3 s** (110,6 a 370,3) | 105,5 (30 a 130) | 5.435 (1.725 a 6.670) | 96,5 | 231 | 50,5 s |

  Cumple los objetivos (novato de 60 a 150 s, medio de 120 a 300 s, experto de 240 a 720 s). Para llegar se ajustaron las constantes del plan: velocidad inicial 1,3 → 1,0 m/s, aumento 0,035 → 0,03 por pieza, tope 4,2 → 3,4 m/s y tolerancia del perfecto 0,12 → 0,16 m. Con las del plan, las medianas (10 días) eran 52, 82 y 200 s. **Sin comprobar con personas**: en la v1 las partidas reales duraron la mitad que las simuladas.
- **Coste por paso con el cementado (B3, `npm run medir`):** con un jugador que suelta siempre sobre el objetivo (semilla `2026-11-09`), 0,068 ms por paso tras la pieza 10 y 0,069 ms tras la 150: cociente **1,01** (límite: 2). Partida de 40 piezas (semilla `2026-11-06`, 8.117 pasos): mediana de 640 ms.
- **Tamaño (`npm run build`):** el JavaScript de `dist/` ocupa 227.991 bytes y **52.612 bytes con `gzip -9`** (presupuesto: 150 KB); el CSS, 2.662 bytes (1.170 con gzip). Sin fuentes, imágenes ni audio.

## Mediciones de la segunda versión (2026-11-08, bloques C y D)

Node 24.18.0 y Chromium de Playwright en este equipo Windows. Las cifras caducan.

- **Medallas del reto diario (D1, `npm run medir:duracion`, días 1 a 30, 74 s):** umbrales bronce 550, plata 2.400 y oro 4.000 puntos (medianas de novato y medio y percentil 25 del experto, redondeados a 50 hacia abajo; al más cercano, la plata quedaba en 2.450 y el medio solo la sacaba el 40 % de los días). Novato con bronce o más el **63 %** de los días; medio con plata o más el **57 %**; experto con oro el **73 %** (objetivo: 50 % o más cada uno).
- **Ritmo de la economía (C5, `npm run medir:economia`, 45 días, 26 s):** 10 partidas reales por perfil reutilizadas; cada día el reto diario (partida, premio por medalla y por racha) y partidas libres hasta los minutos del plan (novato 10, medio 15, experto 25; sin misiones ni niveles). Compra el tema más barato que falte en cuanto puede (precios 300, 980, 1.680, 2.520 y 4.200: 9.680 en total).

  | Perfil | Monedas al día | Primera compra | Temas el día 7 | Catálogo completo |
  |---|---|---|---|---|
  | novato | 404 | **10,9 min** de juego (objetivo ≤ 12) | 2 | día 25 |
  | medio | 751 | 8 min | **3** (objetivo 3 a 6) | **día 14** (objetivo 10 a 30) |
  | experto | 1.404 | 5,4 min | 5 | **día 7** (objetivo: no antes del 7) |

  Cumple, pero el experto va justo: llega el mismo día 7. **Sin comprobar con personas.**
- **Guardado (C1):** progreso vacío, 393 bytes; 365 días de una partida larga de experto (180 piezas en tres tramos) ocupan **47.125 bytes** (límite: 100 KB), unos 128 bytes por día, porque cada día guarda los índices de sus piezas como tramos (`"0-59,62-121,125-184"`) y no las formas.
- **Tamaño (`npm run build`):** el JavaScript de `dist/` ocupa 290.052 bytes y **73.234 bytes con `gzip -9`** (presupuesto: 150 KB); el CSS, 12.102 bytes (3.615 con gzip). Fuentes sin cambios.

## Mediciones de la segunda versión (2026-11-08, bloque A)

Chromium de Playwright sin GPU en este equipo Windows. Las cifras caducan.

- **Tamaño (`npm run build`):** el JavaScript de `dist/` ocupa 258.229 bytes y **63.029 bytes con `gzip -9`** (presupuesto: 150 KB); el CSS, 6.583 bytes (2.400 con gzip). **Fuentes: 60.012 bytes** en dos `.woff2` de Bricolage Grotesque (presupuesto: 80 KB); en español solo se descarga el latino, 41.344 bytes (límite: 45 KB). Licencia OFL en `dist/fuentes/OFL.txt`. Sin imágenes ni audio.
- **Fotogramas (A2, `e2e/arte.spec.ts`, 20 s de partida jugando sola):** escritorio 1280×800, mediana 16 ms y p95 23 ms (límites 17,5 y 25); móvil (Pixel 7, ratio 2) con la CPU 4 veces más lenta, mediana 17 ms y p95 31 ms (objetivo 33 ms, así que `RATIO_MAXIMO` sigue en 2). Antes de pintar fondo, piezas y grano aparte, el móvil daba p95 131 ms, y el dibujo de la v1, 69 ms. **Sin medir en un móvil real.**
- **Audio:** en este equipo, abrir el `AudioContext` tarda de 0,4 a 6 s. Por eso se crea justo después del primer gesto y no dentro de él, y las pruebas que no prueban el sonido usan un `AudioContext` mudo. En iPhone, el interruptor de silencio apaga WebAudio, y el sonido puede empezar en el segundo toque.

## Mediciones (2026-11-05)

Son las de la v1 (`main`); las de duración y tiempo de `jugar` ya no valen para la segunda versión.

Las cifras caducan: repítelas tras cambiar el código.

- **Pruebas (`npm test`):** 79 pruebas en 10 archivos, todas pasan.
- **Tamaño de la compilación (`npm run build`):** el JavaScript de `dist/` ocupa 221.723 bytes sin comprimir y **50.499 bytes con gzip** (nivel 9: `gzip -9 -c`), por debajo del presupuesto de 150 KB. El CSS, 1.835 bytes (899 con gzip). `dist/` entero, 226.987 bytes en 4 archivos (`index.html`, `_headers`, un JS y un CSS). No hay imágenes, audio ni fuentes.
- **Código en línea:** con `build.inlineStylesheets: 'never'`, Astro no deja ningún `<style>` ni `<script>` en línea en `dist/index.html` (el script se sirve como módulo externo). La CSP no necesita `'unsafe-inline'` ni hashes, así que no se usa la CSP integrada de Astro.
- **Tiempo de `jugar` en Node (`npm run medir`):** partida de 43 piezas soltadas (41 colocadas, 5.489 pasos, semilla `2026-11-06`), Node 24.18.0 en este equipo Windows, 5 ejecuciones por medición. Es ruidoso: cuatro mediciones el mismo día dieron medianas de 1,1 s (rango de 1,0 a 1,3 s), 2,2 s, 1,9 s y 2,6 s (rangos de 1,0 a 5,3 s), probablemente por la carga del equipo. Cifra prudente: **de 1 a 2,6 s por partida**, unos 0,2 a 0,5 ms por paso. Queda muy por encima de los 10 ms de CPU por petición de un Worker gratuito.
- **Duración de las partidas (D6, `npm run medir:duracion`, repetido el 2026-11-05):** dos jugadores simulados en Node sueltan cada pieza la primera vez que pasa por el centro, con un error de tiempo uniforme fijado por semilla: el **cuidadoso** de ±60 ms y el **descuidado** de ±150 ms. Se juegan los días 1 a 10; la duración es pasos/60 e incluye la escena que sigue hasta quedar quieta (como mucho 3 s).
  - **Cuidadoso:** mediana de **57,6 s** (49,9 a 68,7 s, de 15 a 20 piezas).
  - **Descuidado:** mediana de **38,0 s** (25,4 a 62,7 s, de 6 a 18 piezas).
  - Cumple el objetivo (descuidado ≥ 30 s, cuidadoso ≤ 90 s) y ninguna partida llega al tope de 10 minutos. Con los días 11-20, 41-50 y 101-110 (medido antes, sin repetir hoy) las medianas quedan entre 52 y 56 s (cuidadoso) y entre 36 y 48 s (descuidado). Antes de suavizar el inicio (vaivén desde 1,2 m/s, cima del triángulo al 50 %, primeras 5 piezas solo de formas fáciles), las partidas duraban de 12 a 23 s de mediana: por eso se cambió.
  - Es orientativo: los jugadores simulados sueltan siempre en la primera pasada; una persona que espera a otra pasada alarga la partida. `scripts/duracion.test.ts` comprueba el objetivo en cada `npm test`. **Sin comprobar con humanos:** el probador midió de 9 a 43 s a mano con el inicio anterior; no hay medición manual con el inicio actual.
- **Prueba de motores (`npm run e2e:motores`), comparando con `jugar` en Node 24.18.0 (sin repetir hoy; datos de la vuelta de pruebas):**
  - **WebKit 27.2 de Playwright:** mismos puntos en 5 de 5 partidas, pero puntos y altura idénticos al bit solo en 1 de 5; en las otras 4 la altura difiere en el último decimal (por ejemplo, 2,3434351896686842 frente a 2,3434351896686847). WebKit de Playwright no es Safari de iPhone: es orientativo.
  - **Firefox 157 de Playwright: sin comprobar.** Se instaló, pero Windows no deja ejecutar `firefox.exe` en este equipo (`spawn UNKNOWN`, «Permission denied»). `npm run e2e:motores` falla por eso en el proyecto `firefox`.
- **Equivalencia entre la pantalla y Node (sin repetir hoy):** en Chromium de escritorio y móvil, `jugar` en Node con los toques registrados en la pantalla da **siempre los mismos puntos**, pero la altura solo es idéntica al bit en 5 de 10 partidas; en las demás difiere en el último decimal (`e2e/partida.spec.ts` la compara con 9 decimales). El motivo: en 20.000 ángulos, `Math.sin`, `Math.cos` y `Math.atan2` dan un valor distinto en 5.361 de 60.000 casos entre Chrome 156 y Node 24 (V8 13.6), aunque los dos usan V8.

## Licencias

Todas las dependencias directas son MIT o Apache-2.0. En el árbol completo (`npm query "*"`) no hay GPL ni AGPL. Hay licencias que no son MIT/ISC/BSD/Apache pero sí permisivas, y todas son de herramientas de compilación que no llegan a `dist/`: `lightningcss` (MPL-2.0), `lru-cache`, `sax` y `common-ancestor-path` (BlueOak-1.0.0), `mdn-data` (CC0-1.0) y `tslib` (0BSD). La única LGPL es `@img/sharp-win32-x64` (Apache-2.0 AND LGPL-3.0-or-later), los binarios de `sharp`, dependencia opcional de Astro para procesar imágenes: solo se usa al compilar y no llega a `dist/`. Lo que llega a `dist/` es código propio y planck (MIT).
