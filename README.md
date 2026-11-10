# Torre Diaria

Juego web de apilar piezas con un solo toque. Al abrir la página se ve la pantalla de inicio, con el logo y «Jugar»: las piezas van de lado a lado y hay que soltarlas sobre la torre. Acertar de lleno da perfectos y combos; cada caída cuesta una vida. Aparte hay un reto diario con las mismas piezas para todos, 10 niveles con estrellas, piezas especiales, objetos de ayuda y una tienda de objetos, temas y escenarios que se ganan jugando, con música propia. Cualquier resultado se comparte con una imagen generada y un enlace para retar a un amigo. Se juega sin registrarse, en el móvil o en el ordenador.

No hay servidor ni ranking compartido: todo el progreso se guarda en el navegador. Está publicado en Cloudflare Pages: https://torre-diaria.pages.dev/ (desde el 2026-11-09; lo publicado es la segunda versión: la tercera, que describe este README, aún no se ha desplegado). El código está en GitHub (`aitorben07/Torre_Diaria`, público).

Diseño completo en [`docs/diseno/diseno-juego.md`](docs/diseno/diseno-juego.md) (la tercera versión, en su apartado 10), plan de anuncios (sin implementar) en [`docs/diseno/anuncios.md`](docs/diseno/anuncios.md) y tienda, vídeos y pagos (solo interfaces) en [`docs/diseno/tienda-y-pagos.md`](docs/diseno/tienda-y-pagos.md). El proceso de cada versión está en `docs/proceso/`.

## Cómo se juega

- **Inicio:** siempre al abrir, con el logo arriba: «TORRE» sobre «DIARIA» como letras apiladas, la «O» es la pieza con ojos que cuelga del gancho y las dos «I» son pilas de piezas (SVG en el HTML, sin imágenes; el favicon sale de la misma geometría en `src/juego/logo.ts`). Detrás se mece una pieza sobre el muelle. «Jugar» empieza una partida libre; debajo, las fichas «Reto de hoy», «Niveles» y «Tienda», y arriba las monedas y la rueda de Ajustes. Con el foco en «Jugar», Espacio o Intro no sueltan ninguna pieza.
- **Un toque** (o Espacio o Intro) suelta la pieza que cuelga. Al quedarse quieta aparece la siguiente.
- **Velocidad (reglas 3):** la primera pieza va a 1,3 m/s y llega al centro en 2,0 s; cada pieza soltada sube 0,025 m/s hasta 3,4. Con un combo de 5 o más va un 8 % más deprisa; cada caída da un respiro (4 piezas menos de subida). Detalle en `docs/diseno/diseno-juego.md`, apartado 10.9.
- **Pausa:** el botón del HUD, Escape o P (y al cambiar de pestaña). En libre y niveles: «Seguir», «Ajustes» e «Inicio»; en el reto oficial y su repetición, sin «Inicio».
- **Vidas:** se empieza con 3. Si algo cae de la plataforma, se pierde una vida, se retira lo caído y se sigue con lo que quede en pie. Sin vidas, fin.
- **Precisión:** a 0,16 m o menos del centro de la pieza más alta es un **perfecto** (desde la pieza 100, a 0,08 m) y la pieza se coloca justo encima (imán); a 0,35 m o menos, un **bueno**.
- **Puntos:** 10 por pieza colocada; un perfecto suma 10 × el combo (perfectos seguidos, hasta ×5); un bueno, 5; cada 5 m de altura nueva, 50. Cada 5 perfectos seguidos dan una vida (como mucho 3). Lo ganado no se resta al caer. Ejemplos en `docs/diseno/diseno-juego.md`, apartado 2.3.
- **Base cementada:** como mucho hay 12 piezas con física; las de abajo se vuelven piedra, así que una partida larga no se derrumba entera.
- **Piezas especiales:** una en cada tramo de 8 piezas desde la 8, elegida por la semilla e igual para todos. **Dorada:** puntos ×2 y +10 monedas al colocarla. **Pegajosa:** se queda unida a lo que toca. **Cemento:** al soltar la siguiente, ella y lo de debajo se vuelven piedra. La primera vez de cada una sale un aviso de 2,5 s sin parar la partida. En los niveles, desde el 4.
- **Objetos de ayuda** (solo en libre y niveles, nunca en el reto diario): **reloj de arena** (las 5 piezas siguientes a ×0,6), **cemento** (la pieza que cuelga pasa a ser de cemento) y **corazón** («¿Seguir?» con 1 vida al perder la última, una vez por partida y solo en la libre). Se desbloquean tras 2, 4 y 6 partidas, con 2 de regalo, y se compran en la Tienda (120, 180 y 250 monedas; como mucho 9 de cada uno). El reloj y el cemento van en la barra de la partida; con 0, «+» abre la Tienda con la partida en pausa.

## Modos

- **Partida libre** («Jugar» y «Otra vez»): una semilla nueva cada vez y sin límite. Cuenta para el récord, las monedas y los escenarios por altura.
- **Retos diarios** (ficha «Reto de hoy» del inicio): calendario con todos los días desde el 2026-11-05 (día 1). El primer intento de cada día es el oficial y da medalla por puntos y monedas; el de hoy suma racha. Con las reglas 3: bronce 450, plata 2.600 y oro 6.750. Los días jugados con las reglas 2 conservan su medalla con los umbrales de entonces (550, 2.400 y 4.000). Los días pasados se pueden jugar como «atrasados» (medalla sí, racha no) y los ya jugados, repetir sin que cuente. Un congelador (200 monedas, como mucho 2) salva la racha si falta un día. El día cambia a medianoche UTC.
- **Niveles** (ficha «Niveles» del inicio): 10 niveles del Puerto en un mapa a pantalla completa que se lee de abajo arriba, con un camino en zigzag y cada nivel como una pegatina (número, estrellas o candado); el nivel actual late con un aro. Arriba, «Volver» (vuelve al inicio o al fin, de donde se abrió), las estrellas y las monedas; abajo, «Jugar nivel N». Tocar un nivel abre su ventana con el objetivo y los umbrales de estrellas. Cada uno tiene un objetivo corto («Coloca 5 piezas», «Llega a 8 m con 2 vidas», «Llega a 10 m en 18 piezas»…) y hasta 3 estrellas por puntos. El nivel siguiente se abre al completar el anterior. El 10 es el jefe. Con las reglas 3, los niveles 1 a 3 empiezan a 1,1 m/s y no tienen especiales; el 4 pide 14 piezas a 1,5 m/s, el 7, 16 piezas con 1 vida, y el 8, 750 puntos (tabla en Mediciones).

## Economía y tienda

Una sola moneda, que se gana jugando: 1 por pieza colocada, +1 por perfecto, +5 por cada 5 m y +10 por cada dorada colocada en las partidas libres y el reto; el reto diario oficial da de 15 a 100 según la medalla más 10 por día de racha (hasta 7); cada estrella nueva de nivel, 20, y los 10 niveles con 3 estrellas, 200 una vez. Repetir un nivel sin mejorar no da nada.

La **Tienda** (antes Colección) abre siempre en la pestaña **Objetos** (reloj, cemento, corazón y congelador de racha); en **Piezas** se compran 6 temas (Riso gratis; Madera 300, Caramelo 980, Neón 1.680, Mármol 2.520 y Oro 4.200) y en **Escenarios** se equipan 3: Puerto (gratis), Ciudad (25 m en libre o una racha de 3) y Nubes (50 m o una racha de 7). La pantalla de fin muestra siempre el siguiente objetivo cercano.

**Pagos y vídeos con premio: solo interfaces.** En la web no se cobra nada, no hay vídeos y no se ve ningún botón de vídeo, de compra con dinero ni la pestaña Monedas. El diseño (paquetes `monedas-1000`, `monedas-3000`, `monedas-8000` y `pack-ayudas`; 60 monedas por vídeo cada 4 h; 1 objeto al día con vídeo; «Ver vídeo» en «¿Seguir?») está programado y probado con implementaciones simuladas, y se puede ver en la **compilación de demostración** (`npm run build:demo`, abajo), que no se despliega. Lo que haría falta para activarlo está en `docs/diseno/tienda-y-pagos.md`, apartado 7.

## Ajustes y música

Ajustes (rueda del inicio o «Ajustes» en la pausa): **Música**, **Sonidos** y **Vibración** (solo si el navegador vibra) por separado, créditos y licencias con la privacidad, y la versión de las reglas. Los efectos reducidos siguen al sistema (`prefers-reduced-motion`).

La música es original y sintetizada con WebAudio, sin archivos de audio: una pista para el inicio (88 BPM) y otra para la partida (104 BPM) en Do mayor, con capas que entran con la altura, el combo y la velocidad, y bajan con cada caída; los efectos van en la misma escala. Las notas se programan desde el bucle de fotogramas con 0,2 s de anticipación.

## Compartir

Al acabar cualquier partida (libre, reto o nivel), y en la ficha de un día jugado en Retos, se genera una **imagen PNG de 1080×1350** con la torre real (hasta 40 piezas; el resto, «+N»), los puntos, los datos de la partida y el dominio, con el tema y el escenario equipados. Se ve en miniatura en el fin.

- **Compartir:** si el navegador admite compartir archivos, se envían la imagen y el texto; si solo admite texto, el texto, y se ofrece «Descargar imagen». Sin compartir del sistema: «Descargar imagen» y «Copiar texto».
- **Texto, sin emojis:** `Torre Diaria #16: 1.240 puntos, 18,4 m, racha de 5 días.` / `¿Me superas? https://<origen>/?reto=16.1240`. En libre: `Torre Diaria: 2.310 puntos y 27,1 m en partida libre.` / `¿Me superas? https://<origen>/?libre=a1b2c3.2310`. En un nivel: `Torre Diaria: nivel 3 con 3 estrellas.` / `Juega en https://<origen>/`.
- **Enlaces:** `?reto=<día>.<puntos>` abre el aviso del reto de ese día (si no se ha jugado, es su intento oficial). `?libre=<código>.<puntos>` (código de 1 a 7 caracteres `[0-9a-z]`) hace jugar la misma partida libre del amigo. Los dos aceptan puntos hasta 999.999, miden 20 caracteres como mucho y, si no encajan en el formato, se ignoran. El origen sale de `location.origin`, sin dirección fija en el código.

## Guardado

Todo va en una clave de `localStorage`, `torre-diaria:progreso`, con versión (3): monedas, temas y escenarios, récord libre, retos diarios (con la versión de las reglas de cada día), racha, estrellas de los niveles, ajustes de música, sonidos y vibración, estadísticas y partidas terminadas, y desde la v3 también los objetos de ayuda, las horas de los vídeos con premio, las compras con dinero (`{ id, producto, monedas, fecha }`, las 50 últimas) y los avisos de especiales ya vistos.

**Migración de la v2:** solo se añaden campos, así que un guardado v2 se lee entero y se completa con los valores por defecto (la música queda apagada si el sonido lo estaba; las partidas terminadas parten de las libres jugadas). Volver a la v2 lee el guardado v3, pero al guardar borra los campos nuevos. Cada día guarda los índices de sus piezas como tramos (`"0-11,13-40"`) y la imagen de un día pasado se rehace con la semilla. Cada guardado relee la clave antes de escribir, así que dos pestañas no se pisan las monedas. Si el almacenamiento falla (modo privado, cuota), el juego funciona sin guardar.

**Migración de la v1:** si no hay progreso v2 ni v3, el día jugado con la v1 (clave `torre-diaria:resultado`) se marca como jugado con las reglas anteriores, en piezas, sin medalla, monedas ni racha; no se convierten puntos. También se migran el récord libre y el aviso visto de `torre-diaria:libre`. Las claves de la v1 no se borran.

## Uso

Necesita Node 22 o posterior (probado con Node 24.18.0 y npm 11.16.0).

```sh
npm ci                                  # instalar
npx playwright install chromium         # navegador de las pruebas e2e (una vez)
npm run dev                             # servidor de desarrollo
npm test                                # pruebas de la lógica (Vitest)
npm run check                           # comprobación de tipos (astro check)
npm run build                           # compila a dist/
npm run build:demo                      # compilación de demostración en dist-demo/ (no se despliega)
npm run preview                         # sirve dist/
npm run e2e                             # pruebas en Chromium de escritorio, móvil y demostración (Playwright)
npm run e2e:motores                     # prueba informativa en Firefox y WebKit (no bloquea)
npm run medir                           # tiempo de jugar() y coste por paso en Node
npm run medir:duracion                  # duración, puntos y medallas con jugadores simulados
npm run medir:economia                  # ritmo de monedas y compras
npm run medir:niveles                   # comprueba los niveles y propone los umbrales de estrellas
CAPTURAS=1 npx playwright test e2e/capturas.spec.ts --project=escritorio   # capturas para revisar
```

`npm run e2e` compila y sirve `dist/` en el puerto 4329 y `dist-demo/` en el 4330 (proyecto `demo`, solo escritorio) y corre con 2 hilos. Las pruebas de fotogramas (`e2e/rendimiento.spec.ts`) van en dos proyectos aparte (`rendimiento-escritorio` y `rendimiento-movil`) que corren al final y de uno en uno, porque en paralelo con el resto la carga del equipo falsea la medida; con la variable `CI` se saltan. Para las pruebas, el contenedor `#juego` expone su estado en atributos `data-*` (`estado`, `modo`, `fase`, `x`, `objetivo`, `toques`, `puntos`, `altura`, `semilla`, `opciones`, `nivel`, `estrellas`…). Las piezas que una prueba quiere tirar o centrar se sueltan con un `pointerdown` lanzado dentro de la página, porque un toque desde Playwright llega cientos de milisegundos tarde con carga; la partida completa de `e2e/partida.spec.ts` y las pruebas de entrada usan toques y teclas reales. `npm run e2e:motores` necesita `npx playwright install firefox webkit`.

### Compilación de demostración

`npm run build:demo` (`astro build --mode demo --outDir dist-demo`) compila igual que la web, pero con pagos y vídeos simulados: una banda fija dice «Demostración: no se cobra nada y los vídeos son de prueba», la Tienda tiene la pestaña Monedas con paquetes de prueba (la compra abre «Pago simulado» con «Pagar» y «Cancelar»), los objetos muestran «≈ X,XX €» y «Gratis con vídeo», y «¿Seguir?» ofrece «Ver vídeo» (un vídeo de prueba de 3 s). Se elige con `import.meta.env.MODE`, así que `dist/` no lleva nada de esto (lo comprueba `e2e/compilacion.spec.ts`). Para verla: `npm run build:demo` y `npx astro preview --outDir dist-demo`. **No se despliega nunca.**

### CI

`.github/workflows/pruebas.yml` ejecuta `npm ci`, `npm run check`, `npm test` y `npm run build` en un trabajo, y las e2e (solo Chromium, `npm run e2e:ci`: las de `npm run e2e` sin los proyectos `rendimiento-*`, que en CI se saltan) repartidas en 3 trabajos a la vez con `--shard=N/3` (cada uno compila lo suyo), en cada pull request y al subir a `main`, con caché de npm y de Chromium, `concurrency` que cancela la ejecución anterior de la misma rama y un tope de 30 minutos por trabajo. Solo corre si el repositorio es público (`if: ${{ !github.event.repository.private }}`): en GitHub Actions los repositorios públicos no gastan cuota, pero uno privado sí. Si el repositorio pasa a privado, los trabajos no se ejecutan.

### Desplegar en Cloudflare Pages (a mano)

Proyecto `torre-diaria` (Pages clásico, rama de producción `main`, subida directa sin Git), creado el 2026-11-09 con `wrangler pages project create torre-diaria --production-branch main --force`; el `--force` solo hizo falta al crearlo. Para cada nueva versión:

```sh
npm run build
npx wrangler pages deploy dist --project-name torre-diaria
```

Requiere iniciar sesión en Cloudflare con la cuenta del propietario (`wrangler` no es dependencia del proyecto: `npx` lo descarga). `public/_headers` pone la CSP (todo de `'self'`, sin orígenes externos ni `'unsafe-inline'`; `img-src` admite además `data:` por el favicon en SVG) y las demás cabeceras de seguridad. La imagen para compartir no necesita nada más: se dibuja en un `<canvas>` y se descarga con un enlace `blob:` temporal. Comprobado tras el primer despliegue: la web responde 200 con la CSP de `public/_headers`, carga sin errores de consola y se puede jugar.

## Estructura

- `src/logica/`: lógica pura, sin navegador. `semilla.ts` (fecha UTC, número de día, generador y código de partida libre), `piezas.ts` (secuencia), `simulacion.ts` (física con planck, vidas, objetivos de nivel, especiales, ayudas y `jugar(semilla, toques, opciones)`), `ritmo.ts` (curva de velocidad v3), `especiales.ts`, `puntuacion.ts` (puntos, combo y vidas), `niveles.ts`, `economia.ts`, `diarios.ts` (medallas por versión de reglas y racha), `catalogo.ts`, `objetos.ts` (objetos de ayuda), `tienda.ts` (productos de dinero y acreditación), `recompensas.ts` (política de vídeos con premio), `progreso.ts` (guardado v3 y migración), `tarjeta.ts`, `reto.ts` (enlaces `?reto=` y `?libre=`) y `registro.ts` (lectura de la v1).
- `src/juego/`: pantalla. `flujo.ts` (máquina de estados pura de las pantallas), `principal.ts` (une todo con el DOM), `inicio.ts` (pantalla de inicio), `bucle.ts` (paso fijo), `dibujo.ts` (lienzo), `efectos.ts`, `sonido.ts` y `haptica.ts` (jugosidad), `musica.ts`, `secuenciador.ts` y `partituras.ts` (música), `logo.ts`, `temas.ts` (paleta, temas y escenarios), `pantallas.ts` (HUD, pausa, «¿Seguir?» y fin), `retos.ts`, `mapa.ts` (niveles) y `tienda.ts` (la Tienda, antes Colección), `imagen.ts` y `compartir.ts` (imagen PNG y compartir), `anuncios.ts` y `pagos.ts` (interfaces sin proveedor) y `demo.ts` (solo en la compilación de demostración).
- `src/pages/index.astro` y `src/estilos.css`: la única página.
- `e2e/`: pruebas de Playwright. `scripts/`: jugadores simulados y mediciones.

## Anuncios

No hay anuncios ni pagos. `src/juego/anuncios.ts` define la interfaz `Anuncios` y `anunciosNulos`, que no hace nada; las llamadas (`partidaEmpieza`, `partidaPara` e `intersticial` al pulsar «Otra vez» o «Siguiente nivel») salen de las transiciones del flujo y se prueban con Vitest. Los vídeos con premio (monedas, objeto y «seguir») tienen botón solo si `disponible("recompensado")`: en la web, nunca. `src/juego/pagos.ts` hace lo mismo con los pagos (`pagosNulos`). No hay SDK, ni peticiones a otros orígenes, ni botones de anuncio o de compra con dinero. La compilación elige la implementación con `PUBLIC_PLATAFORMA` (solo existe la web) y, en la demostración, con `import.meta.env.MODE`. El plan está en `docs/diseno/anuncios.md` y `docs/diseno/tienda-y-pagos.md`.

## Por qué estas herramientas

- **Astro sin React (D1 de la v1, S13).** La interfaz es un lienzo y unos pocos paneles; React añadiría peso sin necesidad. Astro compila a una página estática para Cloudflare Pages.
- **planck para la física (D2).** Box2D en TypeScript (MIT), fijado a la versión exacta `1.5.1` y solo importado por `src/logica/simulacion.ts`; las pruebas doradas fallan si una actualización cambia los resultados.
- **Bricolage Grotesque** (OFL-1.1) empaquetada desde npm: solo los subconjuntos latino y latino extendido del eje de peso. Licencia en `dist/fuentes/OFL.txt`.
- **Sonido y música sintetizados con WebAudio**, sin archivos de audio. Imágenes, iconos, estrellas y corazones se dibujan en canvas, SVG o CSS: `dist/` no lleva imágenes de mapa de bits.
- **GitHub Actions (S21):** gratis en repositorios públicos.

## Limitaciones y lo que no se ha comprobado

- **Duración, dificultad y economía sin probar con personas.** Todas las cifras salen de jugadores simulados, que en la v1 duraban el doble que las partidas reales. En los niveles, el experto simulado no falla ningún perfecto, así que las 3 estrellas piden una partida casi sin fallos; con personas pueden quedar difíciles o fáciles.
- **Fotogramas sin medir en un móvil real.** Solo con Chromium de escritorio y emulando un Pixel 7 con la CPU 4 veces más lenta; en headless el lienzo se pinta por software en el hilo principal, así que la emulación es más pesimista que un móvil con GPU. En pantallas táctiles el lienzo usa como mucho 1,25 píxeles por píxel CSS (desde la v3; antes 1,5), así que en móviles de alta densidad se ve algo menos nítido que en escritorio. Las pruebas fijan la fecha con `page.clock`, que también sustituye `requestAnimationFrame` por temporizadores: los fotogramas se miden con ese reloj.
- **Sonido en iPhone:** con el interruptor de silencio, WebAudio no suena; y como el `AudioContext` se abre justo después del primer gesto, el sonido puede empezar en el segundo toque. iOS no vibra.
- **Compartir sin probar en dispositivos reales.** Las pruebas simulan `navigator.share` y `navigator.canShare`. En Safari, si compartir llega tarde respecto al toque, da `NotAllowedError` y se ofrece descargar la imagen.
- **Igualdad entre pantalla y Node** solo en el mismo navegador y con partidas cortas: planck usa `Math.sin`, `Math.cos` y `Math.atan2`, que pueden diferir en el último decimal entre motores (y entre Chrome y Node). Por eso las pruebas comparan la altura con 9 decimales. En otros navegadores la misma secuencia de toques puede dar otra puntuación.
- **En los niveles 1, 2, 3 y 5** (lentos y cortos) el medio simulado saca 3 estrellas siempre.
- **Reglas 3 en lo ya publicado:** los enlaces `?reto=` y `?libre=` compartidos con la v2 comparan puntos de reglas distintas (el enlace no lleva versión). Repetir o jugar atrasado un día de la v2 se hace con las reglas 3. Recargar la página durante el reto oficial lo reinicia sin que cuente (viene de la v2).
- **Economía de las reglas 3 más rápida que su objetivo** (`npm run medir:economia`, 2026-11-10): el medio completa los temas el día 9 (objetivo 10 a 30) y el experto el día 4 (objetivo: no antes del 7). Pendiente de decidir en la revisión final (por ejemplo, precios de los temas ×1,5).
- **Pagos y vídeos sin proveedor:** solo se ven en la compilación de demostración. Lo comprado solo viviría en `localStorage` (sin restaurar compras) y harían falta cuentas, precios y asesoría (`docs/diseno/tienda-y-pagos.md`).
- **La música, sin escuchar con personas ni en un móvil real;** su coste en el móvil emulado está en las mediciones. En la primera visita, la del inicio no suena hasta el primer toque (política de reproducción automática).
- **Sin comprobar a mano la tercera versión** (partidas con la música, si las especiales se entienden sin el aviso y si «¿Seguir?» molesta): lo anota el probador en `docs/proceso/tercera-version/pruebas.md`. El CI de GitHub no ha corrido aún con la v3: su duración (R17) solo está medida en local.
- **Los navegadores integrados de WhatsApp o Instagram guardan su propio progreso**; al borrar los datos del sitio se pierde todo (sin servidor no se puede evitar).
- **Sin comprobar:** Firefox (Windows no deja ejecutarlo en este equipo), Safari en iPhone y navegadores Android reales. El CI en GitHub sí está comprobado: la primera ejecución (2026-11-09, push a `main`) pasó en 7 min 47 s, con un tiempo máximo de 30 minutos.
- Sin ranking, sin servidor, sin `og:image` y sin misiones diarias (aplazadas). Toda la interfaz va en español.

## Segunda fase: ranking compartido

No está hecha. Haría falta una base D1 y Pages Functions en Cloudflare, y decidir sobre nombres y moderación. Sin registro, cualquier puntuación enviada se puede falsificar, salvo que el servidor vuelva a simular la partida con `jugar(semilla, toques, opciones)`. Eso no cabe tal cual en 10 ms de CPU por petición (límite de un Worker gratuito): una partida de 40 piezas tarda unos 640 ms en Node. Además, ni un Worker con V8 reproduce al bit una partida de Chrome, así que habría que validar con margen.

## Mediciones

En este equipo Windows con Node 24.18.0 y Chromium de Playwright. Las cifras caducan: repítelas con el comando indicado tras cambiar el código.

### 2026-11-10 (tercera versión)

El detalle, con las variantes probadas, está en `docs/proceso/tercera-version/mediciones.md`.

- **Pruebas:** `npm test`, 454 pruebas en 35 archivos, todas pasan; `npm run check`, sin errores. `npm run e2e`, 237 pasan y 84 se saltan (capturas y pruebas de un solo proyecto: teclado, solo táctil o solo escritorio), en unos **26 min** con 2 hilos (25 min 49 s y 26 min 54 s en las dos últimas ejecuciones, las dos sin fallos). En CI no se ha medido aún (R17 pide ≤ 20 min allí).
- **Tamaño (`npm run build` y `gzip -9 -c` de cada `.js`):** el JavaScript de `dist/` ocupa **93.029 bytes con `gzip -9`** (v2: 79.889; presupuesto: 150 KB); planck son unos 54,8 KB de ellos. Sin imágenes ni audio.
- **Fotogramas (A2 y D4, proyectos `rendimiento-*` de `npm run e2e`, 20 s jugando sola con la música sonando):** escritorio 1280×800, mediana 16 ms y p95 18 ms (límites 17,5 y 25); móvil (Pixel 7) con la CPU 4 veces más lenta y el lienzo a 1,25 píxeles por píxel CSS, mediana 17 a 18 ms y **p95 31 ms** al final de `npm run e2e` en tres ejecuciones (límite 33). Con el lienzo a 1,5 píxeles por píxel CSS, el móvil daba de 32 a 34 ms (35 a 36 al final de `npm run e2e`); un perfil con la traza de DevTools mostró el coste repartido en el pintado del lienzo por software, y con 1,25 da de 29 a 31 ms (`npx playwright test --project=rendimiento-movil --no-deps --workers=1`, cuatro vueltas). **Sin medir en un móvil real.**
- **Guardado (C1, `src/logica/progreso.test.ts`):** 365 días de partidas largas de experto con los tres objetos al máximo y 50 compras, **52.607 bytes** (límite 100 KB). Un guardado v2 se lee entero (pruebas de «guardado v3 con migración aditiva»).
- **Coste por paso con especiales (`npm run medir`):** 0,097 ms por paso tras la pieza 10 y 0,014 ms tras la 150 (cociente 0,14; límite 2). Partida de 40 piezas: mediana de 400 ms.
- **Duración y medallas (L1, `npm run medir:duracion`, días 1 a 30, 1 min 57 s):** con las reglas 3 y las especiales; los jugadores simulados no usan objetos.

  | Perfil | Primera pieza | Entre piezas (1 a 10) | Décima pieza | Duración | Puntos | Especiales por partida |
  |---|---|---|---|---|---|---|
  | novato (±180 ms) | 2,02 s | 2,63 s | 29,1 s | **60,1 s** | 485 | 1,8 |
  | medio (±90 ms) | 1,98 s | 2,48 s | 24,9 s | **145,1 s** | 2.640 | 6,1 |
  | experto (±40 ms) | 2,00 s | 2,45 s | 24,9 s | **261,8 s** | 7.102,5 | 15,6 |

  Objetivos: primera pieza en el centro en ≤ 2,0 s, ≤ 2,6 s entre piezas para el medio y las duraciones de la v2 (novato de 60 a 150 s: queda a 0,1 s del mínimo). Medallas de las reglas 3 (bronce 450, plata 2.600, oro 6.750): novato con bronce o más el **60 %** de los días, medio con plata o más el **57 %** y experto con oro el **77 %**.
- **Niveles (L2, `npm run medir:niveles`, 72 s):** cada perfil juega cada nivel 10 veces. El novato gana los niveles 1 a 5 en 9 o 10 de 10; el medio gana cada nivel en 8 de 10 o más; el experto saca 3 estrellas siempre. Mediana de duración de las partidas ganadas por el medio, **31,7 s** (objetivo de 30 a 120).

  | Nivel | Objetivo | Vidas | Velocidad | p2 | p3 | Novato: ganadas | Medio: ganadas, 3 estrellas y s al ganar |
  |---|---|---|---|---|---|---|---|
  | 1 | Coloca 5 piezas | 3 | 1,1 | 150 | 200 | 10 | 10, 10, 14,5 s |
  | 2 | Llega a 3 m | 3 | 1,1 | 50 | 100 | 10 | 10, 10, 11,7 s |
  | 3 | Haz 4 perfectos | 3 | 1,1 | 50 | 100 | 10 | 10, 10, 11,8 s |
  | 4 | Coloca 14 piezas | 3 | 1,5 | 800 | 900 | 9 | 10, 4, 33,2 s |
  | 5 | Haz un combo de 4 | 3 | 1,0 | 50 | 100 | 9 | 10, 10, 12,6 s |
  | 6 | Llega a 8 m | 2 | 1,7 | 800 | 850 | 1 | 10, 9, 46,3 s |
  | 7 | Coloca 16 piezas | 1 | 1,8 | 750 | 1.000 | 0 | 9, 1, 38,6 s |
  | 8 | Consigue 750 puntos | 3 | 1,6 | 750 | 800 | 0 | 10, 2, 42,3 s |
  | 9 | Llega a 10 m en 18 piezas | 3 | 1,7 | 850 | 900 | 0 | 8, 3, 39,6 s |
  | 10 (jefe) | Llega a 14 m | 2 | 1,6 | 1.200 | 1.250 | 0 | 9, 9, 87,3 s |

- **Economía (L3, `npm run medir:economia`, 45 días, 42 s):** con las monedas de las doradas. Plan «temas»: como en la v2; «objetos»: el medio compra 1 objeto al día y el experto 2; «vídeos»: 4 vídeos de monedas al día (solo en la simulación: en la web no hay vídeos).

  | Perfil | Plan | Monedas al día | Primera compra | Temas el día 7 | Catálogo completo |
  |---|---|---|---|---|---|
  | novato | temas | 519 | **6,8 min** (objetivo ≤ 12) | 3 | día 19 |
  | medio | temas | 1.113 | 4,7 min | **4** (objetivo 3 a 6) | **día 9** (objetivo 10 a 30: no se cumple) |
  | medio | objetos | 1.113 | 6,8 min | 4 | día 11 |
  | medio | vídeos | 1.353 | 2 min | 4 | **día 8** (objetivo: no antes del 10) |
  | experto | temas | 2.428 | 4,6 min | 5 | **día 4** (objetivo: no antes del 7) |

  Monedas por partida libre mediana del medio: 155; un reloj cuesta 120. Los precios de los temas no se han cambiado (lo decide la revisión final; propuesta, ×1,5).
- **Música (D4):** `programar` cuesta de 0,03 a 0,13 ms de media por fotograma. JavaScript de la música y sus partituras, unos 3,7 KB con gzip.

Las secciones siguientes son de la segunda versión (reglas 2) y se dejan como referencia.

### 2026-11-09 (bloques E a H)

- **Pruebas:** `npm test`, 284 pruebas en 24 archivos, todas pasan. `npm run e2e`, 169 pasan y 33 se saltan (capturas, pruebas de un solo proyecto y de teclado), en unos 15 minutos con 2 hilos.
- **Tamaño (`npm run build`, y `gzip -9 -c` de cada archivo):** el JavaScript de `dist/` ocupa 312.454 bytes y **79.889 bytes con `gzip -9`** (presupuesto: 150 KB); el CSS, 17.841 bytes (4.865 con gzip); fuentes sin cambios (60.012 bytes). Sin imágenes ni audio.
- **Fotogramas (A2, `npm run e2e`, proyectos `rendimiento-*`, 20 s jugando sola):** escritorio 1280×800, mediana 16 ms y p95 de 17 a 18 ms (límites 17,5 y 25); móvil (Pixel 7) con la CPU 4 veces más lenta, mediana de 16 a 20 ms y **p95 de 26 a 31 ms** en cinco ejecuciones con el lienzo a 1,5 píxeles por píxel CSS (objetivo 33 ms). Con 2, el mismo móvil daba 35 ms (medido el 2026-11-08 por el coordinador), por eso en táctil se limita a 1,5. **Sin medir en un móvil real.**
- **Imagen para compartir (F1, `e2e/compartir.spec.ts`):** PNG de 1080×1350 de unos 215 KB (217.767 y 219.376 bytes en las dos capturas de `docs/proceso/segunda-version/capturas/`) (límite 600 KB).
- **Niveles (E2, `npm run medir:niveles`, 20 s):** cada perfil juega cada nivel 10 veces con errores distintos. `p3` es la mediana de puntos del experto al ganar y `p2` la del medio, redondeadas a 50 hacia abajo; si empatan, `p2` queda 50 por debajo. Por debajo de unos 1,8 m/s el medio simulado (90 ms de error) hace siempre perfecto y empata con el experto, así que del nivel 4 en adelante la pieza empieza a 1,6-1,8 m/s y los objetivos son más largos que en el Anexo 1 (para que la mediana de duración no baje de 30 s). Sin fallos: el novato gana los niveles 1 a 5 en 7 de 10 o más; el medio gana todos en 9 o 10 de 10 salvo el jefe (6 de 10); el experto saca 3 estrellas siempre. El medio saca 3 estrellas siempre en los niveles 1, 2, 3, 5 y 8 y en 3 o 4 de 10 en los demás. Mediana de duración de las partidas ganadas por el medio, **30,7 s** (de 16 s en el nivel 5 a 53 s en el jefe; objetivo de 30 a 120 s). Para que hubiera hueco entre dos umbrales, el nivel 3 pide 4 perfectos (no 2) y el 5 un combo de 4 (no de 3).

  | Nivel | Objetivo | Vidas | Velocidad | p2 | p3 | Novato: ganadas | Medio: ganadas, 3 estrellas, puntos y duración al ganar |
  |---|---|---|---|---|---|---|---|
  | 1 | Coloca 5 piezas | 3 | 0,9 | 150 | 200 | 10 | 10, 10, 200 puntos, 21,4 s |
  | 2 | Llega a 3 m | 3 | 0,9 | 50 | 100 | 10 | 10, 10, 140, 17,4 s |
  | 3 | Haz 4 perfectos | 3 | 0,9 | 50 | 100 | 10 | 10, 10, 140, 17,4 s |
  | 4 | Coloca 12 piezas | 3 | 1,7 | 600 | 650 | 7 | 10, 4, 625, 32,0 s |
  | 5 | Haz un combo de 4 | 3 | 1,0 | 50 | 100 | 9 | 10, 10, 140, 16,0 s |
  | 6 | Llega a 8 m | 2 | 1,7 | 650 | 750 | 0 | 9, 3, 650, 39,4 s |
  | 7 | Coloca 12 piezas | 1 | 1,8 | 550 | 650 | 0 | 10, 3, 583, 33,3 s |
  | 8 | Consigue 600 puntos | 3 | 1,6 | 550 | 600 | 1 | 10, 10, 610, 30,6 s |
  | 9 | Llega a 10 m en 18 piezas | 3 | 1,7 | 850 | 900 | 0 | 9, 4, 855, 39,6 s |
  | 10 (jefe) | Llega a 14 m | 2 | 1,6 | 1.050 | 1.100 | 0 | 6, 4, 1.133, 52,7 s |

### 2026-11-08 (bloques A, C y D)

- **Medallas del reto diario (D1, `npm run medir:duracion`, días 1 a 30, 74 s):** umbrales bronce 550, plata 2.400 y oro 4.000 (medianas del novato y del medio y percentil 25 del experto, redondeados a 50 hacia abajo). Novato con bronce o más el **63 %** de los días; medio con plata o más el **57 %**; experto con oro el **73 %** (objetivo: 50 % o más cada uno).
- **Ritmo de la economía (C5, `npm run medir:economia`, 45 días, 26 s):** cada día el reto diario y partidas libres hasta los minutos del plan (novato 10, medio 15, experto 25; sin misiones ni niveles), comprando el tema más barato que falte.

  | Perfil | Monedas al día | Primera compra | Temas el día 7 | Catálogo completo |
  |---|---|---|---|---|
  | novato | 404 | **10,9 min** de juego (objetivo ≤ 12) | 2 | día 25 |
  | medio | 751 | 8 min | **3** (objetivo 3 a 6) | **día 14** (objetivo 10 a 30) |
  | experto | 1.404 | 5,4 min | 5 | **día 7** (objetivo: no antes del 7) |

- **Guardado (C1, `src/logica/progreso.test.ts`):** progreso vacío, 393 bytes; 365 días de partidas largas de experto, **47.125 bytes** (límite 100 KB).
- **Fuentes (A1, `e2e/compilacion.spec.ts`):** 60.012 bytes en dos `.woff2` (presupuesto 80 KB); en español solo se descarga el latino, 41.344 bytes (límite 45 KB).
- **Audio:** abrir el `AudioContext` tarda de 0,4 a 6 s en este equipo; por eso se crea justo después del primer gesto y las pruebas que no prueban el sonido usan uno mudo.

### 2026-11-06 (bloque B)

- **Duración y puntos (B4, `npm run medir:duracion`, días 1 a 30):** jugadores simulados que sueltan cada pieza la primera vez que pasa por el objetivo, con un error de tiempo uniforme fijado por semilla. Ninguna partida llega al tope de 30 minutos.

  | Perfil | Error | Duración mediana (rango) | Piezas | Puntos | Monedas |
  |---|---|---|---|---|---|
  | novato | ±180 ms | **83,2 s** (48,9 a 115,7) | 19 | 567,5 | 38,5 |
  | medio | ±90 ms | **169,8 s** (113,5 a 202,1) | 49 | 2.430 | 112 |
  | experto | ±40 ms | **302,3 s** (110,6 a 370,3) | 105,5 | 5.435 | 231 |

  Objetivos: novato de 60 a 150 s, medio de 120 a 300 s, experto de 240 a 720 s. Para llegar se ajustaron velocidad inicial (1,0 m/s), aumento (0,03 por pieza), tope (3,4 m/s) y tolerancia del perfecto (0,16 m). **Sin comprobar con personas.**
- **Coste por paso con el cementado (B3, `npm run medir`):** 0,068 ms por paso tras la pieza 10 y 0,069 ms tras la 150 (cociente 1,01; límite 2). Partida de 40 piezas: mediana de 640 ms.

## Licencias

Las dependencias directas son MIT o Apache-2.0, y la fuente, OFL-1.1. En el árbol completo (`npm query "*"`) no hay GPL ni AGPL. Las licencias que no son MIT/ISC/BSD/Apache son de herramientas de compilación que no llegan a `dist/`: `lightningcss` (MPL-2.0), `lru-cache`, `sax` y `common-ancestor-path` (BlueOak-1.0.0), `mdn-data` (CC0-1.0), `tslib` (0BSD) y `@img/sharp-win32-x64` (Apache-2.0 AND LGPL-3.0-or-later, opcional de Astro). Lo que llega a `dist/` es código propio, planck (MIT) y Bricolage Grotesque (OFL-1.1).
