# Torre Diaria: tercera versión. Tareas

Plan del 2026-11-09. Rama `tercera-version` (`.git/HEAD` apunta a ella). Base: el código de la rama leído hoy (`src/logica/*.ts`, `src/juego/sonido.ts`, `flujo.ts`, `anuncios.ts`, `pantallas.ts`, `src/pages/index.astro`, `src/estilos.css`, `public/_headers`, `scripts/duracion.ts`, `scripts/economia.ts`, `playwright.config.ts`, `package.json`), el `README.md`, `docs/diseno/diseno-juego.md`, `docs/diseno/anuncios.md`, `docs/proceso/segunda-version/` y las capturas de la v2.

## Cambios [impacto] incorporados (prevalecen sobre el resto del plan)

El coordinador incorpora **todos** los cambios del apartado 5 de `impacto.md` («Cambios al plan», líneas 371-526). Donde una tarea de abajo o un anexo contradiga ese apartado, manda `impacto.md` §5.

- **Velocidad medida (B1/B2):** 1,3 m/s inicial, +0,025 por pieza, `AMPLITUD` 2,6, `HUECO_COLGADA` 1,8, sin `VEL_SUELO`; velocidad redondeada a centésimas tras multiplicadores; `soltarEnExtremo` con umbral 2,2 m. Se vuelve a medir en L1 con las especiales (novato queda a 2,4 s del mínimo de 60 s).
- **Medallas por versión de reglas (R16 nuevo):** los días jugados con reglas 2 conservan medalla con sus umbrales; reglas 3 tiene los suyos.
- **Recortes R-1 a R-10 aceptados:** sin «Efectos reducidos» propio (se sigue el sistema); música con tempo fijo y capas 0-2; pausa del reto oficial sin «Abandonar»; «¿Seguir?» solo en partida libre; sin premios de objetos en niveles; «+» con 0 unidades abre la Tienda sobre la partida en pausa; sin logo en canvas; «Pack de ayudas» repetible en vez de lote de inicio único; sin «Cómo se juega»; sin ficha «Monedas gratis» en el inicio. La compilación de demo (K3) se mantiene con `astro build --mode demo --outDir dist-demo`.
- **Música (D1/D2):** sin temporizador propio, notas programadas desde el bucle de fotogramas con 0,2 s de anticipación; `AudioContext` falso que cuenta nodos en pruebas; nota de la estrella dentro de la escala.
- **Marcador (A):** desde 1.000 el número no cabe; récord y meta bajo el número; caben 999.999 en 320 px.
- **Pagos (C1, J1, K1, K3, K4):** compras guardadas con producto y monedas (desistimiento), precios en céntimos, nada pagado se recorta por topes, sin ofertas únicas ni textos que empujen a comprar; R14 busca textos visibles en `dist/`, no nombres de funciones.
- **Resto:** H1 generador por tramo; H2 monedas de la dorada vía `PartidaAcabada.doradas` y pegajosa sin unirse a la plataforma; H3 especiales en la imagen solo con `reglas ≥ 3`; I1 distancia acumulada para que el reloj no haga saltar la pieza; E2 Espacio con «Jugar» enfocado no suelta pieza; R17 duración del e2e (CI ≤ 20 min, a medir); decisiones V1-V5 para la revisión final.

## Resumen

Nueve pedidos del usuario en un solo cambio: música que acompañe al juego, ajustes con música y sonidos por separado, una pantalla de inicio desde la que se elige qué hacer, un mapa de niveles a pantalla completa, un logo propio, el marcador que se desborda desde 1.000 puntos, piezas especiales, tres objetos de ayuda con su tienda (monedas, vídeo o dinero) y un arranque más rápido. Los pagos y los vídeos quedan como interfaces probadas con implementaciones nulas y simuladas: no se cobra nada ni se integra ningún proveedor.

Las decisiones de fondo (apartado «Decisiones»):

- **Una sola moneda**, sin gemas, sin ruleta, sin cofres al azar y sin vidas que limiten las partidas.
- **Piezas especiales:** no se compran. Salen de la semilla y son iguales para todos.
- **Objetos de ayuda:** solo en la partida libre y en los niveles, nunca en el reto diario.
- **Música:** original y sintetizada con WebAudio, en la misma escala que los sonidos del perfecto.
- **Velocidad:** más rápida al principio y con altibajos según lo que pasa en la partida (caídas, rachas, objetos). Es la versión 3 de las reglas.

## Objetivo

Al abrir la web se ve el logo y un botón «Jugar» sobre el puerto, con el reto de hoy, los niveles y la tienda a un toque. La partida arranca con más ritmo, suena una música que crece con la torre, salen piezas especiales y se pueden usar objetos de ayuda ganados o comprados con monedas.

## Fuera de alcance

- Cobrar dinero real, mostrar anuncios reales o integrar Stripe, AdSense, AdMob, Poki, CrazyGames o tiendas de apps. Solo interfaces, implementaciones nulas (en la web) y simuladas (en pruebas y en una compilación de demostración que no se despliega).
- Fijar los precios en euros de los paquetes de monedas: los decide el usuario al activar los pagos (ver Bloqueantes).
- Desplegar en Cloudflare Pages: se propone en la revisión final.
- Misiones diarias, logros, eventos, ranking, cuentas, amigos y notificaciones (siguen aplazados, Anexo 1 de la v2, apartado 9).
- Más mundos o niveles: el mapa sigue con los 10 niveles del Puerto.
- Borrar o exportar el progreso, volumen con deslizadores, elegir canción, traducciones.
- Ruleta, cofres aleatorios, gemas, vidas o energía, ofertas con cuenta atrás y objetos antes de empezar la partida (Decisión T22).
- Icono de app o `manifest` con PNG (PWA). El logo se hace en SVG y en canvas.

## Requisitos globales (se comprueban al cerrar cada bloque)

Son los G1 a G10 de la v2, renumerados, más los nuevos R11 a R15. Si un bloque rompe uno, el bloque no está terminado.

- [ ] R1. `npm test`, `npm run check`, `npm run build` y `npm run e2e` pasan. Prueba: ejecutarlos.
- [ ] R2. **Determinismo.** En `src/logica/` solo hay `Math.random` en `semillaLibre`. `simulacion.ts` no contiene `Math.random`, `Date.now`, `performance.now`, `Math.sin` ni `Math.cos`. Solo `simulacion.ts` importa `planck`. Prueba: buscar el texto (lo hace ya `src/proyecto.test.ts`; se amplía a los archivos nuevos de `src/logica/`).
- [ ] R3. **Pantalla igual a Node.** `e2e/partida.spec.ts` sigue pasando en libre, reto diario y nivel, ahora también con objetos usados (`data-ayudas`) y con piezas especiales: mismos puntos y piezas, y altura con 9 decimales. Prueba: `npm run e2e`.
- [ ] R4. **Pruebas doradas.** Si cambian, el commit dice por qué y con qué valores. Prueba: `git log` y las pruebas.
- [ ] R5. **Enlaces seguros.** Lo que viene de la URL o del almacenamiento se escribe con `textContent`. Las pruebas de `?reto=` y `?libre=` con `<img src=x onerror=…>` siguen pasando. Prueba: `npm run e2e` y buscar `innerHTML` en `src/`.
- [ ] R6. **CSP.** `public/_headers` no cambia. `dist/index.html` no tiene `<script>` ni `<style>` en línea ni `style="`. Prueba: `git diff main -- public/_headers` vacío y `e2e/csp.spec.ts`.
- [ ] R7. Todas las peticiones van al mismo origen y no hay errores en consola. Prueba: las comprobaciones de `e2e/`.
- [ ] R8. **Peso.** JavaScript de `dist/` ≤ 150 KB con `gzip -9` (hoy 79.889 bytes); fuentes ≤ 80 KB. Prueba: medir y anotar en el README.
- [ ] R9. Licencias: dependencias directas MIT, ISC, BSD, Apache-2.0 u OFL-1.1. **No se añade ninguna dependencia nueva** en este cambio. Prueba: `git diff main -- package.json` sin dependencias nuevas y `npm query "*"`.
- [ ] R10. Si el almacenamiento falla, el juego funciona sin guardar. Prueba: Vitest con un almacén que lanza excepciones y la prueba e2e de `localStorage` bloqueado.
- [ ] R11. **Sin archivos de audio ni imágenes de mapa de bits** en `dist/` (ni `.mp3`, `.ogg`, `.wav`, `.m4a`, `.png`, `.jpg` ni `.webp`). Prueba: listar `dist/` (la prueba de `e2e/compilacion.spec.ts` se amplía).
- [ ] R12. **Ningún botón que no haga nada.** En la compilación web, sin proveedor de anuncios ni de pagos, no se ve ningún botón de vídeo, de compra con dinero ni la pestaña «Monedas» (regla de `docs/diseno/anuncios.md`, apartado 4). Prueba: Playwright recorriendo inicio, tienda, fin de libre, fin de nivel, «¿Seguir?» y Retos.
- [ ] R13. **Reto diario limpio.** En el reto oficial y en su repetición no hay barra de objetos, no se ofrece «¿Seguir?» y `jugar` rechaza ayudas en ese modo. Prueba: Vitest sobre el flujo y Playwright.
- [ ] R14. **Sin código de demostración en la web.** `dist/` no contiene los textos «Demostración», «Vídeo de prueba» ni «pagosSimulados». Prueba: buscar el texto en `dist/` tras `npm run build`.
- [ ] R15. Todos los botones miden ≥ 44×44 px, se llega a ellos con Tab y el foco se ve. No hay desplazamiento horizontal en 320×568, 360×640, 390×844, 1280×800 ni 1280×600. Prueba: Playwright (se amplía `e2e/pantalla.spec.ts` a las pantallas nuevas).

## Orden de los bloques

0 (documentos) → **A** (marcador) → **C1** (guardado v3) → **B** (ritmo) → **H** (piezas especiales) → **I1** (objetos en la simulación) → **E** (inicio, pausa y flujo) → **C2-C3** (ajustes) → **D** (música) → **F** (mapa) → **G** (logo) → **I2-I4** (inventario y barra de objetos) → **J** (tienda) → **K** (pagos y vídeos) → **L** (mediciones finales y cierre).

**Motivos del orden:**

- A va primero porque es un fallo visible y pequeño.
- C1 va antes que todo lo que guarda algo nuevo: hay una sola migración.
- B, H e I1 tocan la simulación y las reglas. Van juntos y antes de la interfaz para que las pruebas doradas cambien una sola vez.
- E reorganiza las pantallas, y D, F, G, I3 y J se montan sobre ellas.
- L vuelve a medir con todo dentro, porque las especiales y la curva de velocidad cambian duraciones, medallas y estrellas.

Cada bloque deja el juego jugable, con las pruebas en verde y un commit o varios que se pueden revisar por separado.

---

## Bloque 0. Documentos de diseño

### 0.1. Pasar los anexos a `docs/diseno/`

Actualizar `docs/diseno/diseno-juego.md` con los Anexos B a K de este archivo (inicio, ajustes, mapa, logo, música, especiales, objetos, tienda, curva de velocidad y guardado). Marcar como «Cambiado en la v3» lo que sustituyen:

- apartado 8 (abrir → partida libre);
- apartado 2.4 (curva);
- apartado 1.6 (sonido);
- apartado 1.7 (barra inferior);
- tabla del apartado 9 (potenciadores, vídeo con premio).

Actualizar `docs/diseno/anuncios.md`: los recompensados que ahora tienen llamada y botón, solo visibles con un adaptador (Anexo H y Anexo I). Crear `docs/diseno/tienda-y-pagos.md` con el Anexo I completo, incluido «Qué haría falta para activarlo».

Zonas: `docs/diseno/`.

Depende de: nada. El documentador lo vuelve a repasar en L5 con las cifras medidas.

Requisitos comprobables:
- [ ] `diseno-juego.md` tiene apartados de pantalla de inicio, ajustes, música, piezas especiales, objetos de ayuda y curva de velocidad v3. Prueba: leerlo.
- [ ] `tienda-y-pagos.md` existe con productos, interfaz `Pagos`, reglas de acreditación y la lista de requisitos para activar los pagos. Prueba: leerlo.
- [ ] `anuncios.md` ya no dice que los recompensados «no se llaman desde ninguna parte». Prueba: buscar el texto.

---

## Bloque A. Marcador que se desborda

### A1. Reproducir y arreglar el desborde de los puntos

El usuario dice que la puntuación se sale del marcador al pasar de 1.000. La causa no está confirmada (Decisión T28). En la captura `docs/proceso/segunda-version/capturas/movil-2-mitad.png`, «610» ya llena la pegatina, y la cabecera es una rejilla `1fr auto 1fr` con textos `nowrap` a los lados (`src/estilos.css:130-207`). Pasos:

1. Escribir primero la prueba que lo reproduce y comprobar que falla en `main`.
2. Arreglarlo:
   - columnas `minmax(0, 1fr) auto minmax(0, 1fr)`;
   - tamaño de letra que baja por escalones según el número de caracteres (clase puesta desde `pantallas.ts`, sin `style="`);
   - textos laterales con `text-overflow: ellipsis`.
3. Revisar también el número grande del fin (`.marcador .numero`, 3,4rem) y los contadores de monedas.

Zonas: `src/estilos.css` (`.hud`, `.hud-puntos`, `.marcador`, `.saldo`), `src/juego/pantallas.ts` (`pintarHud`), `e2e/marcador.spec.ts` (nuevo).

Depende de: nada.

Requisitos comprobables:
- [ ] Una prueba de Playwright escribe los puntos «999», «1.000», «12.345» y «999.999» en `#hud-puntos`, con «Combo ×12», «Récord 999.999» y «Meta: 10 m en 18» visibles. Recorre los tamaños 320×568, 360×640, 390×844, 1280×800 y 1280×600, y en `main` falla al menos en un caso. Prueba: ejecutarla contra `main` y anotar en el commit qué caso fallaba. Si no falla en ninguno, buscar la causa en el lienzo y en el fin antes de arreglar nada, y anotarlo.
- [ ] Tras el arreglo, en todos esos casos el `scrollWidth` del número es ≤ `clientWidth` de la pegatina. La pegatina queda dentro de la columna, y sus cajas no se cruzan con las de `#vidas` ni con las de `.lado`. Prueba: la misma prueba.
- [ ] Con 999.999 la letra de los puntos mide ≥ 24 px. Prueba: `getComputedStyle` en la misma prueba.
- [ ] En el fin, «999.999 puntos» cabe en el panel sin desplazamiento horizontal en 320×568. Prueba: Playwright.
- [ ] R1, R6 y R15. Prueba: las de cada uno.

---

## Bloque C (primera parte). Guardado v3

### C1. Progreso v3 con migración aditiva

`VERSION_PROGRESO = 3` en `src/logica/progreso.ts`, con los campos nuevos del Anexo K:

- `ajustes.musica` y `ajustes.efectosReducidos`;
- `objetos` (inventario y desbloqueos);
- `recompensas` (último vídeo de monedas, día y número de objetos por vídeo);
- `compras` (transacciones acreditadas);
- `vistos` (avisos de piezas especiales ya mostrados);
- `estadisticas.partidas`.

La migración solo añade campos: no cambia el nombre ni el tipo de ninguno de la v2 (Decisión T31). `ajustes.sonido` sigue en el guardado y ahora significa «sonidos» (efectos).

Zonas: `src/logica/progreso.ts`, `progreso.test.ts`.

Depende de: nada.

Requisitos comprobables:
- [ ] Un progreso v2 completo (fijado en la prueba) se lee como v3 con los mismos valores en todos los campos de la v2 y los nuevos por defecto. Prueba: Vitest.
- [ ] Con `ajustes.sonido: false` en la v2, al leer, `ajustes.musica` es `false`: quien silenció el juego no oye música de repente. Con `true`, también es `true`. Prueba: Vitest.
- [ ] Todas las claves y tipos de `progresoVacio()` de la v2 siguen en la v3 con el mismo tipo (comparación con una lista fijada en la prueba). Así el código de la v2 puede leer un guardado v3 si hay que volver atrás. Prueba: Vitest.
- [ ] `estadisticas.partidas` migrado = `libre.partidas` + número de días en `diarios` + número de niveles con estrellas. Prueba: Vitest.
- [ ] Con valores raros (objetos negativos o > 9, fechas futuras de vídeo, más de 50 transacciones, `version: 99`, tipos erróneos) no hay excepción y se obtiene un progreso válido con los valores acotados. Prueba: Vitest con 10 casos o más.
- [ ] 365 días de experto más el inventario lleno y 50 transacciones ocupan ≤ 100 KB. Prueba: Vitest.
- [ ] R10. Prueba: Vitest.

---

## Bloque B. Ritmo: velocidad más rápida al principio y que responde a lo que pasa

Diseño completo en el **Anexo J**. La velocidad deja de ser un dato fijo de cada pieza de la secuencia (`Pieza.velocidad`, `piezas.ts:86-88`): la calcula la `Partida` al colgar cada pieza con un «nivel de ritmo» que sube al soltar y baja al caer o al seguir, y unos multiplicadores (racha, reloj de arena). Las formas, medidas y colores de la secuencia **no cambian**.

### B1. Velocidad calculada por la partida y reglas v3

- `src/logica/ritmo.ts` nuevo y puro: `velocidadDe(ritmo, opciones)` y `siguienteRitmo(ritmo, evento)`, con constantes con nombre: `VEL_INICIAL`, `VEL_INCREMENTO`, `VEL_TOPE`, `VEL_SUELO`, `RESPIRO_CAIDA`, `RESPIRO_SEGUIR`, `RACHA_COMBO`, `RACHA_MULT` y `RELOJ_MULT`.
- `Partida` lleva el ritmo y expone la velocidad de la pieza que cuelga en `estado().colgada.velocidad`. `posicionVaiven` la usa en lugar de `piezaActual().velocidad`.
- Los niveles siguen pasando su velocidad inicial (`OpcionesPartida.velocidad`).
- `REGLAS = 3`. Los días guardados con `reglas: 2` se conservan tal cual, con su medalla (Decisión T2).
- `scripts/duracion.ts` calcula el momento del toque con la velocidad real de la pieza que cuelga (hoy usa `colgada.pieza.velocidad`).
- Se sustituye el requisito de la v2 «la velocidad nunca baja» (`piezas.test.ts:52-58`) por los de abajo (Decisión T24).

Zonas: `src/logica/ritmo.ts` (nuevo), `piezas.ts`, `simulacion.ts`, sus pruebas, `scripts/duracion.ts`.

Depende de: C1 (por `reglas`).

Requisitos comprobables:
- [ ] `velocidadDe` con una tabla de casos: pieza 0 da `VEL_INICIAL`; nunca baja de `VEL_SUELO` ni pasa de `VEL_TOPE`; tras una caída la siguiente pieza va más despacio que la anterior; con combo ≥ `RACHA_COMBO` se multiplica por `RACHA_MULT`; con el reloj, por `RELOJ_MULT`. Prueba: Vitest.
- [ ] Sin caídas, ni racha, ni objetos, la velocidad no baja de una pieza a la siguiente. Prueba: Vitest con una partida de 150 piezas del experto.
- [ ] Las formas, medidas y colores de las piezas 0 a 4 y 100 a 104 de `"2026-11-05"` son los de las pruebas doradas de la v2. Solo cambia la velocidad, o el campo deja de existir. Prueba: Vitest (`piezas.test.ts:75-90`).
- [ ] La misma semilla, toques y opciones dan el mismo resultado y los mismos eventos dos veces. Prueba: Vitest.
- [ ] Prueba dorada nueva de simulación con `REGLAS = 3` (puntos, piezas, perfectos, vidas, pasos y posiciones con 6 decimales). Prueba: Vitest.
- [ ] Un día guardado con `reglas: 2` sigue mostrando su medalla y sus puntos en Retos y no se puede volver a jugar como oficial. Prueba: Vitest sobre `diarios.ts` y Playwright con progreso sembrado.
- [ ] R2, R3 y R4. Prueba: las de cada uno.

### B2. Cadencia del arranque: medir antes y ajustar

Añadir a `scripts/duracion.ts` dos medidas por perfil: **cadencia inicial** (mediana de segundos entre sueltas de las piezas 1 a 10) y **segundos hasta colocar la décima pieza**. Hacer primero una medición con las constantes de la v2 y anotarla. Después fijar las constantes de B1, partiendo de la propuesta del Anexo J, hasta cumplir los requisitos. El ajuste definitivo, ya con piezas especiales, se repite en L1.

Zonas: `scripts/duracion.ts`, `scripts/medir-duracion.ts`, `scripts/duracion.test.ts`, constantes de `ritmo.ts`.

Depende de: B1.

Requisitos comprobables:
- [ ] Las cifras de la v2 (cadencia inicial y segundos hasta la décima pieza de cada perfil) están anotadas con fecha en el commit y en `docs/proceso/tercera-version/` (las anota el desarrollador en el commit; el documentador las pasa al README). Prueba: leerlo. *Valor de la v2: a medir. Estimación de este plan: unos 4 s por pieza al principio, porque la primera pieza tarda 3,4 s en llegar al centro a 1,0 m/s.*
- [ ] Tiempo hasta el centro de la primera pieza = `AMPLITUD / VEL_INICIAL` ≤ 2,0 s. Prueba: Vitest sobre las constantes.
- [ ] Ventana del perfecto en la primera pieza = `TOLERANCIA_PERFECTO / VEL_INICIAL` ≥ 0,09 s. El arranque sigue siendo asequible: el medio, de ±90 ms, acierta la mayoría. Prueba: Vitest sobre las constantes.
- [ ] Cadencia inicial del perfil medio ≤ 2,6 s (mediana de los días 1 a 30). Prueba: `npm run medir:duracion`.
- [ ] Las medianas de duración siguen en los rangos de la v2: novato de 60 a 150 s, medio de 120 a 300 s y experto de 240 a 720 s. Ninguna partida llega a 30 min. Prueba: `npm run medir:duracion`. Si no se cumple a la vez que la cadencia, manda la cadencia y se anota la desviación en Decisiones.
- [ ] `scripts/duracion.test.ts` sigue tardando ≤ 60 s. Prueba: el tiempo que muestra Vitest.

---

## Bloque H. Piezas especiales

Diseño en el **Anexo G**. Tres tipos: **dorada**, **pegajosa** y **cemento**. Salen de la semilla con un generador aparte, así que son iguales para todos y no cambian la secuencia de formas. Ni se compran ni se desbloquean fuera de la partida: dentro de cada partida van apareciendo más tipos según se avanza (Decisión T10).

### H1. Qué pieza es especial

`src/logica/especiales.ts`: `especialDe(semilla, indice, opciones)` → `null | "dorada" | "pegajosa" | "cemento"`, con un generador `crearGenerador(semilla + "|especiales")`. Reglas (propuesta, se miden en L1):

- ninguna antes de la pieza `PRIMERA_ESPECIAL = 8`;
- exactamente una en cada tramo de `TRAMO_ESPECIAL = 8` piezas, en una posición elegida por el generador;
- tipos posibles según el índice: dorada desde la 8, pegajosa desde la 16 y cemento desde la 24.

Opción de partida `especiales: boolean` (por defecto `true`). Los niveles 1 a 3 la ponen a `false`.

Zonas: `src/logica/especiales.ts` (nuevo), `especiales.test.ts`, `simulacion.ts` (opción), `niveles.ts`.

Depende de: B1.

Requisitos comprobables:
- [ ] La misma semilla da las mismas especiales en el mismo orden, se pidan en el orden que se pidan. Prueba: Vitest.
- [ ] Hay exactamente una especial en cada tramo de 8 desde la pieza 8, y ninguna antes. Prueba: Vitest con 50 semillas y 400 piezas.
- [ ] No sale pegajosa antes de la 16 ni cemento antes de la 24. Prueba: Vitest.
- [ ] Las formas, medidas y colores de la secuencia no cambian (las doradas de B1 siguen pasando). Prueba: Vitest.
- [ ] Con `especiales: false` no sale ninguna. Prueba: Vitest.

### H2. Lo que hace cada especial en la simulación

- **Dorada:** si cuenta como colocada, sus puntos de colocada valen el doble y da `MONEDAS_DORADA = 10` monedas más. Si cae, nada.
- **Pegajosa:** al contar como colocada, se une con una `WeldJoint` de planck a cada pieza que toca en ese momento (contactos tocando). Ya no resbala ni vuelca respecto a ellas.
- **Cemento:** al contar como colocada, ella y todas las piezas en pie por debajo de su cara superior pasan a cementadas en el siguiente `soltar()`. Se hace ahí y no al colocarse por lo que explica el comentario de `cementar` (`simulacion.ts:445-454`). Si alguna sigue moviéndose, se cementa en el siguiente `soltar()` en que esté quieta.

Nuevo evento `{ tipo: "especial", especial, indice, efecto }` para la pantalla. `Resultado.monedas` incluye las de las doradas.

Zonas: `src/logica/simulacion.ts`, `puntuacion.ts` (puntos y monedas de la dorada), pruebas.

Depende de: H1.

Requisitos comprobables:
- [ ] Dorada colocada con un perfecto de combo 1: puntos = 2 × `puntosDeColocada("perfecto", 1)` y monedas + 10. Prueba: Vitest con semilla y toques buscados y fijados.
- [ ] Pegajosa: con una semilla y toques fijados en los que, sin la unión, la pieza se desliza y cae (comprobado con `especiales: false`), con la unión se queda en su sitio. Su distancia a la pieza de apoyo varía < 1 cm en los 120 pasos siguientes. Prueba: Vitest.
- [ ] Cemento: tras el `soltar()` siguiente a colocarse, todas las piezas quietas con la cima por debajo de la suya tienen `cementada: true`. Prueba: Vitest.
- [ ] Una especial que cae no tiene efecto, y el episodio de caída cuesta una sola vida, como siempre. Prueba: Vitest.
- [ ] Prueba dorada de una partida con las tres especiales. Prueba: Vitest.
- [ ] R2, R3 y R4. Prueba: las de cada uno.

### H3. Dibujo y aviso la primera vez

- Aspecto de cada especial en `dibujo.ts` y `temas.ts`, igual en todos los temas (Anexo G). Se distinguen ya en el gancho, antes de soltar.
- `data-especial` en `#juego` con el tipo de la pieza que cuelga (para pruebas).
- La primera vez que cuelga cada tipo en ese navegador, aviso breve sin pausa: «Pieza pegajosa: se queda pegada donde cae», 2,5 s. Se guarda en `vistos`.
- Efecto al actuar: brillo y «+10» en la dorada; gotas en la pegajosa; ola gris que baja por la torre en la de cemento. Con movimiento reducido, sin la ola.

Zonas: `src/juego/dibujo.ts`, `temas.ts`, `efectos.ts`, `principal.ts`, `pantallas.ts`.

Depende de: H2, C1.

Requisitos comprobables:
- [ ] Con una semilla cuya pieza 8 es dorada, al colgar la pieza 8 `data-especial="dorada"` y aparece el aviso. Al recargar y volver a llegar, no aparece. Prueba: Playwright.
- [ ] El aviso no para la partida: `data-pasos` sigue subiendo mientras se ve. Prueba: Playwright.
- [ ] Capturas de las tres especiales en 390×844 en `docs/proceso/tercera-version/capturas/`. Prueba: existen y el revisor las compara con el Anexo G.
- [ ] El recuento de efectos (`data-efectos`) sube con cada evento `especial`. Prueba: Playwright.

---

## Bloque I (primera parte). Objetos de ayuda en la simulación

### I1. Reloj de arena, cemento y seguir en la `Partida`

Diseño en el **Anexo H**.

- `Partida.usar("reloj")`: las `RELOJ_PIEZAS = 5` piezas siguientes, contando la que cuelga, van a la velocidad × `RELOJ_MULT`. No se acumula: usarlo con uno activo no hace nada.
- `Partida.usar("cemento")`: la pieza que cuelga pasa a ser de cemento. No se puede si ya es especial.
- `Partida.seguir()`: solo en `fin` por quedarse sin vidas, una vez por partida. Pone 1 vida, aplica `RESPIRO_SEGUIR` al ritmo y cuelga la siguiente pieza.
- `OpcionesJugar.ayudas: Array<{ paso, tipo }>`: `jugar` las aplica en ese paso; el seguir, en el paso en que acabó. Con `modo: "reto"` en las opciones, `usar` y `seguir` no hacen nada (R13).
- La pantalla expone `data-ayudas` para R3.

Zonas: `src/logica/simulacion.ts`, `ritmo.ts`, pruebas.

Depende de: B1, H2.

Requisitos comprobables:
- [ ] Con el reloj, las 5 piezas siguientes van a la velocidad sin reloj × `RELOJ_MULT` (diferencia < 0,001 m/s) y la sexta vuelve a la normal. Prueba: Vitest.
- [ ] El cemento convierte la pieza que cuelga, y luego se comporta como en H2. Con una especial colgando, `usar("cemento")` devuelve `false` y no cambia nada. Prueba: Vitest.
- [ ] `seguir()` tras perder las vidas: vidas 1, fase `apuntando`, puntos sin cambios. Un segundo `seguir()` en la misma partida devuelve `false`. Prueba: Vitest.
- [ ] `jugar(semilla, toques, { ayudas })` da el mismo resultado que una `Partida` con las mismas ayudas en los mismos pasos. Prueba: Vitest.
- [ ] En modo reto, `usar` y `seguir` devuelven `false`, y `jugar` con ayudas da lo mismo que sin ellas. Prueba: Vitest (R13).
- [ ] R2, R3 y R4. Prueba: las de cada uno.

---

## Bloque E. Pantalla de inicio, pausa y flujo

Diseño en el **Anexo B**. Cambia la decisión de la v2 «al abrir ya se está jugando» (Decisión T3).

### E1. Flujo con inicio, pausa y paneles nuevos

En `src/juego/flujo.ts`:

- `Pantalla` añade `"inicio"` y `"pausa"`; `Panel` añade `"ajustes"` y `"tienda"` (este sustituye a `"coleccion"`).
- `abrir()` sin enlaces devuelve `inicio`. Con `?reto=` o `?libre=`, su aviso, como hoy.
- Acciones nuevas: `inicio` (desde el fin, la pausa o un panel), `pausar` y `seguirPartida`.
- Cerrar un panel abierto desde el inicio vuelve al inicio.
- En el reto oficial y su repetición se puede pausar. Desde la pausa solo se abre Ajustes, y «Abandonar» acaba la partida y la guarda como intento (Decisión T29).
- `anuncios.ts`: `partidaPara` al pausar y `partidaEmpieza` al seguir. Los intersticiales siguen solo en «Otra vez» y «Siguiente nivel».

Zonas: `src/juego/flujo.ts`, `flujo.test.ts`, `anuncios.ts`, `anuncios.test.ts`.

Depende de: nada del código nuevo (puede ir en paralelo a B, H e I1).

Requisitos comprobables:
- [ ] `abrir(null, hoy, null)` da `pantalla: "inicio"` y la orden `nada`. Con reto o libre, lo mismo que en la v2. Prueba: Vitest.
- [ ] Desde `inicio`: `libre` → `jugando`. `abrir` niveles, tienda, retos o ajustes → ese panel, y `cerrar` → `inicio`. Prueba: Vitest.
- [ ] Desde `jugando` en libre o nivel: `pausar` → `pausa`; `seguirPartida` → `jugando`; `inicio` → `inicio`. En oficial, desde `pausa`, `abrir` retos, niveles o tienda no hace nada; ajustes sí. Prueba: Vitest.
- [ ] Llamadas de anuncios: una partida libre con una pausa y «Otra vez» da `partidaEmpieza` 3 veces, `partidaPara` 2 e `intersticial("otra-vez")` 1. Prueba: Vitest.

### E2. Pantalla de inicio

Sobre el escenario equipado, con el muelle y una pieza meciéndose en el gancho (dibujo, sin física), se ven:

- el logo (G1; hasta que exista, el texto «Torre Diaria» en la tipografía del juego);
- arriba, las fichas de monedas (abre la Tienda) y de ajustes;
- el botón principal «Jugar» (partida libre);
- tres tarjetas: «Reto de hoy» (estado del día y racha), «Niveles» (siguiente nivel y estrellas) y «Tienda»;
- si hay vídeo disponible (K2), la ficha «Monedas gratis».

En la partida desaparece la barra de abajo de la v2. Espacio o Intro en el inicio equivalen a «Jugar».

Zonas: `src/pages/index.astro`, `src/estilos.css`, `src/juego/principal.ts`, `pantallas.ts`, `dibujo.ts` (escena de inicio), `src/juego/inicio.ts` (nuevo).

Depende de: E1.

Requisitos comprobables:
- [ ] Al cargar `/` sin parámetros, `data-estado="inicio"`. No cae ninguna pieza (`data-pasos` no sube en 2 s) y el HUD no se ve. Prueba: Playwright en escritorio y móvil.
- [ ] Un clic en «Jugar», o Espacio, empieza la partida libre (`data-estado="jugando"`, `data-modo="libre"`). El aviso «Toca para soltar» sale en la primera partida de ese navegador y no en la segunda. Prueba: Playwright.
- [ ] Con `?reto=1.5` y con `?libre=abc.300` se ven sus avisos, no el inicio, como en la v2. Prueba: las pruebas actuales adaptadas.
- [ ] La tarjeta del reto dice «Sin jugar» o la medalla de hoy, y la racha. Al tocarla se abre Retos. Prueba: Playwright con progreso sembrado.
- [ ] La tarjeta de niveles muestra el siguiente nivel disponible y las estrellas totales. Al tocarla se abre el mapa. Prueba: Playwright.
- [ ] En 360×640 todo el inicio cabe sin desplazamiento vertical, y en 320×568 sin desplazamiento horizontal. La ficha de monedas con 999.999 cabe sin cortarse. Prueba: Playwright (cajas y `scrollHeight`).
- [ ] R12 y R15. Prueba: las de cada uno.

### E3. Pausa y fin con «Inicio»

- Botón de pausa en el HUD (arriba a la izquierda, junto a las vidas), y también Escape o P. Panel de pausa con «Seguir», «Ajustes» e «Inicio». En el reto oficial, en lugar de «Inicio», «Abandonar el reto», con el aviso «Tu intento contará con N puntos» y una confirmación.
- Al volver de una pestaña oculta, la partida se queda en pausa con el panel abierto. Hoy sigue sola (Decisión T29).
- Fin: «Otra vez» sigue siendo el botón principal (un toque) y se añade «Inicio». En los niveles, además, «Mapa» y «Siguiente nivel», como hoy.

Zonas: `index.astro`, `estilos.css`, `principal.ts`, `pantallas.ts`, `bucle.ts` (solo si hace falta para la pausa).

Depende de: E1, E2.

Requisitos comprobables:
- [ ] En pausa, `data-pasos` no cambia en 2 s, y al seguir la pieza continúa desde la misma `data-x`. Prueba: Playwright.
- [ ] Una partida libre con una pausa en medio cumple R3 (pantalla igual a Node). Prueba: `e2e/partida.spec.ts` ampliada.
- [ ] Ocultar la pestaña (`visibilitychange` simulado) y volver deja `data-estado="pausa"`. Prueba: Playwright.
- [ ] En el reto oficial, «Abandonar el reto» y confirmar guarda el día con los puntos del momento y muestra el fin. Cancelar vuelve a la pausa. Prueba: Playwright.
- [ ] Desde el fin, «Inicio» lleva al inicio, y Espacio sigue siendo «Otra vez» pasados 700 ms. Prueba: Playwright.

### E4. Pruebas e2e adaptadas al inicio

`e2e/ayudas.ts`: `esperarLibre` pulsa «Jugar» desde el inicio. Revisar las 18 apariciones de `jugando` en 9 archivos de `e2e/` (contadas hoy con `grep`) y las capturas de `e2e/capturas.spec.ts`.

Zonas: `e2e/`.

Depende de: E2, E3.

Requisitos comprobables:
- [ ] `npm run e2e` pasa entero. Prueba: ejecutarlo.
- [ ] La duración de `npm run e2e` y la del CI quedan anotadas. El CI sigue por debajo de su tope de 30 min. Prueba: la salida de Playwright y la pestaña Actions. *Valor nuevo: a medir; hoy unos 15 min en local y 7 min 47 s en CI.*

---

## Bloque C (segunda parte). Ajustes

### C2. Panel de ajustes

Diseño en el **Anexo C**:

- interruptores de **Música**, **Sonidos** y **Vibración** (este último solo si existe `navigator.vibrate`);
- **Efectos reducidos**, con tres posiciones: Sistema, Sí o No;
- «Cómo se juega» (vuelve a mostrar el aviso del primer toque y una ficha con perfecto, vidas, especiales y objetos);
- «Créditos y licencias»;
- «Privacidad»;
- la versión («Reglas 3»).

Se abre desde el inicio (rueda dentada) y desde la pausa. Los interruptores de sonido y vibración de la barra de la v2 desaparecen.

Zonas: `index.astro`, `estilos.css`, `src/juego/ajustes.ts` (nuevo), `principal.ts`, `sonido.ts` (dos salidas, Bloque D), `haptica.ts`.

Depende de: C1, E1.

Requisitos comprobables:
- [ ] Cada interruptor cambia `aria-checked` o `aria-pressed` y se mantiene tras recargar (lectura de `torre-diaria:progreso`). Prueba: Playwright.
- [ ] Con Sonidos apagado y Música encendida, soltar una pieza no crea nodos de efectos, pero la música sigue programando notas. Con los dos apagados no se crea ningún nodo de audio. Prueba: Playwright con el envoltorio de `AudioContext` de la v2 contando nodos por salida.
- [ ] Sin `navigator.vibrate` no aparece Vibración. Con un `vibrate` simulado y Vibración apagada, un perfecto no lo llama. Prueba: Playwright con `addInitScript`.
- [ ] Efectos reducidos en «Sí», sin emular `prefers-reduced-motion`, deja la sacudida de cámara en 0 al caer una pieza. En «Sistema» con `reducedMotion: 'reduce'`, también. Prueba: Playwright.
- [ ] «Créditos y licencias» nombra Bricolage Grotesque (OFL-1.1), planck (MIT) y «Música original compuesta en código para Torre Diaria». Prueba: Playwright leyendo el texto.
- [ ] R15. Prueba: la suya.

### C3. Efectos reducidos en todo el juego

Los sitios que hoy miran `prefers-reduced-motion` (CSS y `efectos.ts`) pasan a una sola función `movimientoReducido(ajuste, sistema)`. En CSS, con una clase en `<html>` puesta desde TypeScript.

Zonas: `src/juego/efectos.ts`, `src/estilos.css`, `principal.ts`.

Depende de: C2.

Requisitos comprobables:
- [ ] `movimientoReducido` da la tabla de las 3 × 2 combinaciones de ajuste y sistema. Prueba: Vitest.
- [ ] No queda ningún `@media (prefers-reduced-motion` sin su equivalente con la clase (hoy hay 3, en `estilos.css:496`, `:971` y `:1409`). Prueba: buscar el texto.

---

## Bloque D. Música

Diseño en el **Anexo F**. Sintetizada con WebAudio en el mismo `AudioContext` que los efectos, con dos salidas (música y efectos) hacia una general. Sin archivos ni dependencias (Decisión T5).

### D1. Motor: secuenciador con anticipación y dos salidas

- `src/juego/secuenciador.ts`, puro: dadas una partitura, un tempo y una ventana de tiempo, devuelve las notas que caen en ella. Los cambios de tempo y de capa solo se aplican al empezar un compás.
- `src/juego/musica.ts`: un temporizador cada `TICK_MS = 25` programa las notas de los siguientes `ANTICIPACION_S = 0,1` s sobre `ctx.currentTime` (patrón de «A tale of two clocks», ver Fuentes). Instrumentos sintetizados: marimba, bajo, colchón y percusión suave.
- `sonido.ts` pasa a tener `salidaMusica` y `salidaEfectos`.
- Con la música apagada no hay temporizador ni nodos de música. Con la pestaña oculta o en pausa, la música se para.

Zonas: `src/juego/secuenciador.ts`, `musica.ts` (nuevos), `sonido.ts`, pruebas.

Depende de: C2 (ajuste de música).

Requisitos comprobables:
- [ ] Encadenar 1.000 ventanas consecutivas de tamaño al azar entre 10 y 200 ms da cada nota del bucle una sola vez, sin huecos ni repetidas, durante 3 vueltas al bucle. Prueba: Vitest sobre el secuenciador.
- [ ] Un cambio de tempo pedido a mitad de compás se aplica en el compás siguiente. Prueba: Vitest.
- [ ] En toda la página hay un solo `AudioContext`. Prueba: Playwright con el envoltorio que cuenta constructores.
- [ ] Con la música apagada, en 5 s de partida no se crea ningún oscilador conectado a la salida de música. Prueba: Playwright con el envoltorio.
- [ ] En pausa y con la pestaña oculta no se programa ninguna nota nueva (contador de notas sin cambios en 2 s). Prueba: Playwright.

### D2. Partituras originales

`src/juego/partituras.ts`: «inicio» (8 compases, unos 88 BPM), «partida» (16 compases en dos variaciones A y B, de 100 a 112 BPM según la velocidad), «fin» (motivo de 3 notas) y «victoria» (fanfarria de nivel). Todo en Do mayor pentatónica más las notas de los acordes, la misma escala que el perfecto (`NOTAS_PERFECTO`, `sonido.ts:9`). Comentario de autoría y licencia en el archivo.

Zonas: `src/juego/partituras.ts` (nuevo), pruebas.

Depende de: D1.

Requisitos comprobables:
- [ ] Todas las notas de melodía están en Do, Re, Mi, Sol y La (cualquier octava). Las del bajo y el colchón son notas del acorde de su compás. Prueba: Vitest.
- [ ] El bucle de inicio dura entre 18 y 25 s y el de partida entre 30 y 45 s a su tempo base. Prueba: Vitest (compases × pulsos × 60 / BPM).
- [ ] El motivo de fin dura ≤ 2 s y la fanfarria ≤ 3 s. Prueba: Vitest.

### D3. Música que acompaña a la partida

- Función pura `capaMusical({ combo, altura, velocidad, caidaReciente })` → 0 a 3:
  - 0: colchón y marimba;
  - 1: más bajo, desde 5 m o combo 2;
  - 2: más percusión, con combo 4 o velocidad ≥ 2,6 m/s;
  - 3: más contramelodía, con combo ≥ `RACHA_COMBO`.
- Tras una caída, la capa baja una y el filtro de la música se cierra durante 2 compases.
- El tempo sigue a la velocidad de la pieza (Anexo F).
- Transiciones: inicio → partida al empezar el compás; fin → para en el pulso siguiente y suena el motivo; nivel ganado → fanfarria; reto oficial con la misma música.
- `data-musica` en `#juego` con la pista y la capa (para pruebas).

Zonas: `src/juego/musica.ts`, `principal.ts`.

Depende de: D2, E2.

Requisitos comprobables:
- [ ] `capaMusical` da la tabla del Anexo F. Prueba: Vitest.
- [ ] En una partida con toques fijados que llega a combo 4, `data-musica` pasa a capa ≥ 2 en el compás siguiente. Tras una caída baja una. Prueba: Playwright.
- [ ] En el inicio, `data-musica` empieza por «inicio», y al pulsar «Jugar» pasa a «partida». Al acabar, a «fin». Prueba: Playwright.
- [ ] Escucha del usuario: la música no cansa en 5 min y encaja con el juego. Prueba: **no automatizable**, va a la revisión final.

### D4. Coste de la música

Zonas: `e2e/rendimiento.spec.ts`, README.

Depende de: D3.

Requisitos comprobables:
- [ ] Con la música encendida y un `AudioContext` real, en 20 s de partida en Chromium de escritorio: mediana entre fotogramas ≤ 17,5 ms y p95 ≤ 25 ms (los límites de la v2). Prueba: `rendimiento-escritorio` con `audioReal`.
- [ ] Móvil emulado (Pixel 7, CPU ×4) con música: p95 ≤ 33 ms. Prueba: `rendimiento-movil`. *A medir: en la v2 daba de 26 a 31 ms sin música; si no cabe, se anota y decide el revisor.*
- [ ] Tiempo medio de cada vuelta del temporizador de la música: anotado (a medir, sin umbral). Prueba: `performance.now` alrededor del tic, en una prueba de medición.
- [ ] R8 (JavaScript ≤ 150 KB con gzip). Prueba: medir.

---

## Bloque F. Mapa de niveles a pantalla completa

### F1. El mapa ocupa la pantalla y lo demás va a los márgenes

Diseño en el **Anexo D**. El mapa llena la zona de juego, se desplaza en vertical y el nivel actual queda centrado. En las esquinas, fichas pequeñas:

- arriba a la izquierda, «Inicio»;
- arriba en el centro, «Puerto»;
- arriba a la derecha, las estrellas y las monedas;
- abajo, el botón flotante «Jugar nivel N».

La ficha del nivel deja de estar fija encima del mapa: aparece como ventana al tocar un nivel, con objetivo, umbrales de estrellas, «Jugar» y «Cerrar». Sin HUD.

Zonas: `src/juego/mapa.ts`, `index.astro`, `estilos.css`, `principal.ts`.

Depende de: E1, E2.

Requisitos comprobables:
- [ ] La caja de `#mapa` mide ≥ 85 % del alto de la zona en 390×844 y en 1280×800 (en escritorio, dentro de la columna). Prueba: Playwright.
- [ ] Al abrir con el nivel 8 disponible, la ficha del 8 está entera a la vista y no la tapa ninguna ficha del margen (cajas sin cruce). Prueba: Playwright con progreso sembrado.
- [ ] «Jugar nivel N» empieza el nivel N con un clic. Tocar un nivel abre su ventana. Escape o «Cerrar» la cierran. Los niveles con candado no responden. Prueba: Playwright.
- [ ] El HUD y la barra de la v2 no se ven en el mapa. Prueba: Playwright (`toBeHidden`).
- [ ] Ganar el nivel 1 y volver al mapa centra el 2. Prueba: Playwright (adaptar `e2e/niveles.spec.ts`).
- [ ] R15 y sin `style="` (R6). Prueba: las de cada uno.

---

## Bloque G. Logo

### G1. Logo con la estética del juego

Hoy no hay logo visible en el juego: el `<h1>` es solo para lectores (`index.astro:36`). Lo que hace de logo es el favicon de tres bloques (`index.astro:8-18`) y el título «TORRE DIARIA» de la imagen para compartir (`imagen.ts:240`). Ver Decisión T27 y diseño en el **Anexo E**.

- `src/juego/logo.ts` define una sola geometría (letras, giros, colores, pieza con ojos, gancho) y dos salidas: SVG para el inicio y dibujo en canvas para la imagen de compartir.
- Favicon nuevo, solo el icono (pieza con ojos colgando del gancho sobre el muelle), en SVG en línea.

Zonas: `src/juego/logo.ts` (nuevo), `index.astro`, `imagen.ts`, `estilos.css`, capturas de referencia de `e2e/compartir.spec.ts`.

Depende de: E2.

Requisitos comprobables:
- [ ] En el inicio, el logo es un `<h1>` con nombre accesible «Torre Diaria» y su caja cabe en la columna menos 2 rem en 320×568. Prueba: Playwright.
- [ ] La imagen para compartir usa el mismo logo. La captura de referencia se regenera y el commit dice por qué. Prueba: `e2e/compartir.spec.ts`.
- [ ] El contraste entre las letras y el papel es ≥ 3:1 (texto grande). Prueba: Vitest con la tabla de pares de colores.
- [ ] `dist/` sigue sin imágenes de mapa de bits (R11), y el favicon sigue siendo un `data:image/svg+xml`. Prueba: listar y leer `dist/index.html`.
- [ ] Capturas del inicio con el logo en 390×844 y 1280×800, y del favicon a 16 y 32 px. Prueba: existen y el revisor las compara con el Anexo E.

---

## Bloque I (segunda parte). Inventario, barra de objetos y «¿Seguir?»

### I2. Inventario, desbloqueos y regalos

`src/logica/objetos.ts`, puro:

- catálogo de los 3 objetos con precio en monedas y máximo `MAX_OBJETO = 9`;
- desbloqueo por partidas terminadas (reloj a las 2, cemento a las 4, corazón a las 6), y con cada desbloqueo, `REGALO_DESBLOQUEO = 2` unidades;
- premios de primera victoria en los niveles 3, 6 y 9 (1 reloj, 1 cemento y 1 corazón);
- `comprarObjeto`, `gastarObjeto` y `objetosNuevos(antes, despues)`.

Zonas: `src/logica/objetos.ts` (nuevo), `objetos.test.ts`, `progreso.ts`, `niveles.ts`.

Depende de: C1, I1.

Requisitos comprobables:
- [ ] Con 1 partida terminada no hay ningún objeto desbloqueado. Con 2, el reloj, con 2 unidades. Con 6, los tres. El regalo se da una sola vez aunque se relea el progreso. Prueba: Vitest.
- [ ] Comprar con monedas insuficientes no cambia nada. Con suficientes resta el precio exacto y suma 1. Con 9 no compra. Prueba: Vitest.
- [ ] Ganar el nivel 3 por primera vez da 1 reloj; repetirlo no da nada. Prueba: Vitest.
- [ ] Gastar con 0 devuelve el mismo progreso. Prueba: Vitest.

### I3. Barra de objetos en la partida y «¿Seguir?»

- En la libre y en los niveles, con algún objeto desbloqueado, hay una barra abajo con dos botones redondos, reloj y cemento, con su número. Activos solo con la pieza colgando.
- Con 0 unidades, el botón muestra «+» y abre una pequeña tienda en pausa: comprar con monedas o, si hay vídeo, «Ver vídeo».
- **«¿Seguir?»** al quedarse sin vidas en libre o nivel, una vez por partida, solo si se cumplen las dos condiciones:
  - tiene con qué pagar: un corazón, monedas para comprarlo o un vídeo disponible;
  - en libre, los puntos son ≥ 30 % del récord (o el récord es 0).

  Opciones: «Usar corazón (tienes N)», «250 monedas», «Ver vídeo» (si hay) y «No, ver resultado». Sin cuenta atrás.
- Aviso en el fin cuando se desbloquea un objeto: «Nuevo objeto: Reloj de arena. Te regalamos 2».
- Cada uso se añade a `data-ayudas`.

Zonas: `index.astro`, `estilos.css`, `principal.ts`, `pantallas.ts`, `src/juego/objetos.ts` (nuevo).

Depende de: I2, E3.

Requisitos comprobables:
- [ ] Con 1 reloj, tocarlo con la pieza colgando deja 0, la velocidad de la pieza (`data-velocidad`) baja en la proporción `RELOJ_MULT` y el cambio se guarda. Prueba: Playwright.
- [ ] En el reto oficial y en su repetición no existe la barra ni se ofrece «¿Seguir?» (R13). Prueba: Playwright.
- [ ] Sin corazones, con 0 monedas, sin vídeo y en libre con récord > 0, al perder no aparece «¿Seguir?»: va directo al fin. Prueba: Playwright con progreso sembrado.
- [ ] Con un corazón: «Usar corazón» sigue la partida con 1 vida, y al volver a perder ya no se ofrece. Prueba: Playwright.
- [ ] «No, ver resultado» lleva al fin y no gasta nada. Prueba: Playwright.
- [ ] Una partida libre con reloj y seguir usados cumple R3. Prueba: `e2e/partida.spec.ts`.

### I4. Récord y compartir con objetos

Los objetos cuentan para el récord de la partida libre y para las estrellas de los niveles (Decisión T15). El texto y la imagen para compartir no cambian. Solo se documenta y se prueba que los umbrales de estrellas se midieron sin objetos.

Zonas: README, `docs/diseno/diseno-juego.md`.

Depende de: I3.

Requisitos comprobables:
- [ ] `scripts/niveles.ts` y `scripts/duracion.ts` no usan ayudas. Prueba: leer el código y buscar `ayudas` en `scripts/`.

---

## Bloque J. Tienda

### J1. Colección pasa a Tienda con pestañas

Diseño en el **Anexo I**. Pestañas:

- **Objetos:** reloj, cemento, corazón y congelador de racha, que sigue también en Retos.
- **Piezas:** los temas de la v2.
- **Escenarios.**
- **Monedas:** solo si `pagos.disponible()` o hay vídeo de monedas disponible (R12).

Cabecera con el saldo. Cada objeto con dibujo, una frase de qué hace, «Tienes N», precio y botón. Si hay vídeo y no se ha usado hoy, también «Gratis con vídeo».

Zonas: `src/juego/coleccion.ts` (pasa a `tienda.ts`), `index.astro`, `estilos.css`, `principal.ts`, `src/logica/catalogo.ts`.

Depende de: I2, E2.

Requisitos comprobables:
- [ ] Comprar un reloj con 500 monedas deja 500 − su precio y «Tienes 1». Con 9, el botón está desactivado. Prueba: Playwright.
- [ ] Las pestañas funcionan con flechas y Tab (`role="tab"`, `aria-selected`). Prueba: Playwright.
- [ ] En la compilación web no hay pestaña «Monedas» (R12). Prueba: Playwright.
- [ ] Comprar y equipar temas sigue igual que en la v2 (las pruebas de la colección, adaptadas, pasan). Prueba: `npm run e2e`.
- [ ] El saldo con 999.999 cabe en la cabecera en 320×568. Prueba: Playwright.

---

## Bloque K. Pagos y vídeos con premio (interfaces, sin proveedores)

Diseño en el **Anexo I**. Ningún proveedor real: `pagosNulos` y `anunciosNulos` en la web, y `pagosSimulados` y `anunciosSimulados` en las pruebas y en la compilación de demostración.

### K1. Interfaz `Pagos` y acreditación sin duplicados

- `src/juego/pagos.ts`: interfaz `Pagos` (`disponible()`, `productos()`, `comprar(id)`, que resuelve `{ estado: "pagado", transaccion } | { estado: "cancelado" | "error" | "pendiente" }`), `pagosNulos` (nada disponible) y `pagosSimulados` (productos de prueba y resultado configurable). Se elige con `PUBLIC_PLATAFORMA`, como `anunciosDePlataforma`.
- `src/logica/tienda.ts`: productos (`monedas-1000`, `monedas-3000`, `monedas-8000` y `lote-inicio`, que es de una vez) y `acreditarCompra(progreso, producto, transaccion)`, pura y sin duplicados por `transaccion`. Guarda las 50 últimas.

Zonas: `src/juego/pagos.ts`, `src/logica/tienda.ts` (nuevos), pruebas.

Depende de: C1.

Requisitos comprobables:
- [ ] Acreditar la misma transacción dos veces suma una sola vez. Prueba: Vitest.
- [ ] El lote de inicio no se puede acreditar dos veces aunque cambie la transacción. Prueba: Vitest.
- [ ] Con `cancelado`, `error` o `pendiente` no se acredita nada. Prueba: Vitest.
- [ ] `pagosDePlataforma(undefined)` y `pagosDePlataforma("web")` devuelven `pagosNulos`. Prueba: Vitest.
- [ ] Ningún archivo de `src/` contiene direcciones de proveedores de pago (`stripe`, `paypal`, `billing`). Prueba: buscar el texto.

### K2. Vídeos con premio y su política

- `src/logica/recompensas.ts`, puro, con la hora como parámetro:
  - vídeo de monedas: `MONEDAS_VIDEO = 60` cada `HORAS_VIDEO = 4` h;
  - objeto gratis con vídeo: 1 al día UTC;
  - seguir con vídeo: 1 por partida, nunca en el reto.
- Si la hora guardada es posterior a la actual (reloj atrasado), se toma la actual.
- `MotivoRecompensado` añade `"monedas"` y `"objeto"`.
- `anunciosSimulados`: capa de 3 s «Vídeo de prueba» con «Cerrar»; en las pruebas, el resultado es configurable.
- Los botones solo se ven si `disponible("recompensado")`. El premio solo se da con `"visto"`.

Zonas: `src/logica/recompensas.ts` (nuevo), `src/juego/anuncios.ts`, `principal.ts`, `inicio.ts`, `tienda.ts`, pruebas.

Depende de: K1, I3, J1.

Requisitos comprobables:
- [ ] Con la hora fijada: ver el vídeo de monedas suma 60. A las 3 h 59 min no está disponible y se lee «Disponible en 1 min». A las 4 h sí. Prueba: Vitest y Playwright con `page.clock` en la compilación de demostración.
- [ ] Con `"cancelado"` o `"error"` no se suma nada y el botón sigue disponible. Prueba: Vitest.
- [ ] Un objeto con vídeo por día UTC: el segundo, el mismo día, no se ofrece; pasada la medianoche UTC, sí. Prueba: Vitest con fechas fijadas.
- [ ] Con la hora guardada en el futuro, el vídeo vuelve a estar disponible como mucho 4 h después de la hora actual. Prueba: Vitest.
- [ ] R12 en la compilación web y R13. Prueba: las de cada uno.

### K3. Compilación de demostración

- `npm run build:demo`: `PUBLIC_PLATAFORMA=demo`, salida en `dist-demo/`, con una banda fija «Demostración: no se cobra nada y los vídeos son de prueba».
- Proyecto `demo` de Playwright con un segundo servidor en el puerto 4330 (`webServer` como lista), que corre dentro de `npm run e2e`.
- No se despliega nunca (Decisión T21).

Zonas: `package.json` (scripts, sin dependencias), `astro.config.mjs` si hace falta, `playwright.config.ts`, `e2e/demo.spec.ts` (nuevo), `.gitignore` (`dist-demo/`).

Depende de: K2.

Requisitos comprobables:
- [ ] En la demo, comprar `monedas-1000` con el pago simulado suma 1.000, y recargar no lo vuelve a sumar. Prueba: Playwright (`demo`).
- [ ] En la demo se ven la pestaña Monedas, la ficha «Monedas gratis» del inicio y «Ver vídeo» en «¿Seguir?». En la web, nada de eso (R12). Prueba: Playwright en los dos proyectos.
- [ ] R14. Prueba: buscar el texto en `dist/`.
- [ ] El CI añade como mucho 3 min por la segunda compilación. Prueba: comparar la duración de la pestaña Actions antes y después. *A medir.*

### K4. Qué haría falta para activarlo

El contenido del Anexo I, «Para activar», pasa a `docs/diseno/tienda-y-pagos.md` (tarea 0.1). Aquí solo se comprueba que está al día con lo hecho en K1 a K3.

Zonas: `docs/diseno/tienda-y-pagos.md`, `docs/diseno/anuncios.md`.

Depende de: K3.

Requisitos comprobables:
- [ ] El documento nombra la interfaz real (`Pagos`, `Anuncios`), los productos con sus ids y la lista de cuentas, pagos y asesorías que hacen falta, con lo que solo puede dar el usuario marcado. Prueba: leerlo.

---

## Bloque L. Mediciones finales y cierre

### L1. Duración y medallas con las reglas 3

Con especiales y la curva de B2, volver a ajustar las constantes de `ritmo.ts` y `especiales.ts` si hace falta, y recalcular `UMBRAL_BRONCE`, `UMBRAL_PLATA` y `UMBRAL_ORO` con la regla de la v2 (S26): mediana del novato, mediana del medio y percentil 25 del experto, redondeados a 50 hacia abajo.

Zonas: `src/logica/ritmo.ts`, `especiales.ts`, `diarios.ts`, `scripts/`, README.

Depende de: B2, H2, I1.

Requisitos comprobables:
- [ ] Siguen cumpliéndose los requisitos numéricos de B2: cadencia ≤ 2,6 s, primera pieza ≤ 2,0 s, ventana ≥ 0,09 s y las tres medianas de duración. Prueba: `npm run medir:duracion`.
- [ ] Novato con bronce o más ≥ 50 % de los días 1 a 30, medio con plata o más ≥ 50 % y experto con oro ≥ 50 %. Prueba: `npm run medir:duracion`.
- [ ] Número medio de especiales vistas por partida y perfil, anotado (a medir; el Anexo G estima unas 1, 5 y 12). Prueba: la salida del script.
- [ ] Cifras en el README con fecha y comando. Prueba: leerlo.

### L2. Niveles con las reglas 3

- Velocidades iniciales nuevas en `niveles.ts`: las de los niveles 1 a 3 suben desde 0,9 m/s, porque hoy son el mismo arranque lento que se quiere quitar (valor a medir).
- Especiales desde el nivel 4.
- `npm run medir:niveles` fija `p2` y `p3` con la regla de la v2.

Zonas: `src/logica/niveles.ts`, `scripts/niveles.ts`, README.

Depende de: L1.

Requisitos comprobables:
- [ ] El novato gana los niveles 1 a 5 en ≥ 6 de 10 intentos cada uno. El medio gana cada nivel en ≥ 6 de 10. El experto saca 3 estrellas en ≥ 3 de 10 en todos. Prueba: `npm run medir:niveles`.
- [ ] Mediana de duración de los niveles ganados por el medio: de 30 a 120 s. Prueba: `npm run medir:niveles`.
- [ ] Las estrellas ya guardadas no se pierden. Prueba: Vitest (los niveles guardan la mejor marca y no se recalculan).
- [ ] Tabla del README actualizada con fecha. Prueba: leerlo.

### L3. Economía con objetos y vídeos

`scripts/economia.ts` añade dos planes:

- **Con objetos:** el medio compra 1 objeto al día y el experto 2, al más barato que le falte.
- **Con vídeos:** 4 vídeos de monedas al día y 1 objeto con vídeo.

Ajustar `PRECIOS_OBJETOS` y `MONEDAS_VIDEO` si hace falta.

Zonas: `scripts/economia.ts`, `scripts/medir-economia.ts`, `src/logica/objetos.ts`, `recompensas.ts`, README.

Depende de: I2, K2.

Requisitos comprobables:
- [ ] Sin objetos ni vídeos se mantienen los objetivos de la v2: novato con primera compra en ≤ 12 min, medio con 3 a 6 temas el día 7 y catálogo completo entre los días 10 y 30, y experto sin completarlo antes del día 7. Prueba: `npm run medir:economia`.
- [ ] Con objetos, el medio completa los temas entre los días 10 y 30. Prueba: `npm run medir:economia`.
- [ ] Con vídeos, el medio no completa los temas antes del día 10: los vídeos aceleran, pero no regalan el catálogo. Prueba: `npm run medir:economia`.
- [ ] Una partida libre media del medio da monedas para al menos un reloj (`PRECIO_RELOJ` ≤ monedas medianas por partida del medio). Prueba: `npm run medir:economia`.

### L4. Peso, rendimiento y guardado

Zonas: README.

Depende de: todos los bloques de código.

Requisitos comprobables:
- [ ] R8: JavaScript ≤ 150 KB con gzip, anotado junto al dato de la v2 (79.889 bytes). Prueba: `npm run build` y `gzip -9 -c`.
- [ ] Fotogramas de A2 y D4 dentro de sus límites. Prueba: `npm run e2e` (proyectos de rendimiento).
- [ ] Guardado: C1 dentro de 100 KB. Prueba: Vitest.

### L5. Documentación

README al día:

- cómo se juega: inicio, pausa, especiales y objetos;
- curva v3;
- ajustes y música;
- tienda;
- guardado v3 y migración;
- compilación de demostración;
- mediciones nuevas con fecha;
- limitaciones nuevas.

`docs/diseno/` al día con las cifras medidas (las tareas 0.1 y K4 ya dejan el diseño escrito).

Zonas: `README.md`, `docs/diseno/`.

Depende de: L1 a L4.

Requisitos comprobables:
- [ ] Todas las cifras nuevas del README tienen fecha y comando. Prueba: leerlo.
- [ ] El README ya no dice «Al abrir la página ya se está jugando» ni habla de la barra con Retos, Niveles y Colección. Prueba: buscar el texto.

### L6. Comprobación a mano

El probador juega al menos 5 partidas libres, 3 niveles y 1 reto con la música encendida. Anota:

- la cadencia que percibe y la duración de cada partida;
- si las especiales se entienden sin leer el aviso;
- si «¿Seguir?» molesta.

Si no puede, lo declara «sin comprobar».

Zonas: `docs/proceso/tercera-version/pruebas.md`.

Depende de: L4.

Requisitos comprobables:
- [ ] `pruebas.md` tiene esas anotaciones o dice «sin comprobar» con el motivo. Prueba: leerlo.

---

## Alcance mínimo entregable y fases posteriores

**Mínimo entregable (lo que cumple los nueve pedidos):** bloques 0, A, B, C, D (D1 a D3), E, F, G, H, I, J, K1, K2 y L.

**Se puede aplazar sin romper nada** si el desarrollo se alarga, anotándolo para la revisión final:
- K3: la compilación de demostración. Los flujos de vídeo y pago quedan probados con Vitest y con la implementación simulada inyectada en Vitest, pero el usuario no podrá verlos en pantalla.
- La capa 3 (contramelodía) y la variación B de la música.
- La ficha «Cómo se juega» de Ajustes.
- D4 en móvil, que se anota a medir.

**Fases posteriores** (fuera de este cambio):
1. **Activar vídeos y pagos** con un proveedor real (Anexo I, «Para activar»). Necesita al usuario.
2. **Misiones diarias** (aplazadas desde la v2). Encajan con «completar retos» y ya hay estadísticas.
3. **Mundos 2 y 3** del mapa, con una canción por escenario.
4. **«×2 monedas» con vídeo** en el fin y **«Quitar anuncios»**, cuando haya anuncios.
5. Volumen por deslizador, borrar o exportar el progreso y PWA con icono.

---

## Efecto del cambio de velocidad (y de las especiales) en lo ya publicado

El juego está publicado desde el 2026-11-09 (README, línea 5), así que esto ya afecta a jugadores reales (Decisión T2).

| Qué | Efecto | Qué se hace |
|---|---|---|
| Retos diarios ya jugados | Sus puntos, medalla y racha quedan guardados con `reglas: 2` y no se recalculan. La imagen se rehace igual, porque formas, medidas y colores no cambian (B1). | Nada; prueba en B1 |
| Repetir un día ya jugado o jugar uno atrasado | Se juega con las reglas 3: misma semilla y mismas formas, pero otra velocidad y con especiales | Aceptado |
| Enlaces `?reto=dia.puntos` compartidos con la v2 | Comparan puntos de reglas distintas; el enlace no lleva versión | Riesgo aceptado: pocos días y pocos jugadores; anotado en el README |
| Enlaces `?libre=codigo.puntos` | Igual: la misma semilla se juega con las reglas 3 | Igual |
| Umbrales de medalla | Cambian; se recalculan en L1 con la misma regla | L1 |
| Estrellas de niveles guardadas | Se conservan; los umbrales `p2` y `p3` se recalculan en L2 | L2 |
| Mediciones del README | Caducan todas las de duración, medallas, niveles y economía | L1 a L3 |
| Pruebas doradas | Cambian las de velocidad y simulación; las de formas no | B1, H2, I1 (R4) |

---

## Riesgos

- **Alcance grande.** Son unos 35 cambios revisables en el mismo `principal.ts` (unas 950 líneas). Por eso los bloques se cierran uno a uno con las pruebas en verde, y conviene sacar de `principal.ts` el inicio, la pausa, los objetos y la tienda a archivos propios (E2, I3, J1).
- **Música que canse o desentone.** No se puede medir. Mitigación: una sola escala para todo, capas que entran y salen, volumen de la música por debajo de los efectos y un interruptor propio.
- **Coste del secuenciador en móviles lentos.** El temporizador de 25 ms compite con el bucle de dibujo. Mitigación: D4 lo mide; si no cabe, se sube `TICK_MS` a 50 y `ANTICIPACION_S` a 0,2.
- **Abrir el `AudioContext` tarda** de 0,4 a 6 s en este equipo (README). La música puede empezar tarde y en iPhone quizá al segundo toque.
- **Uniones de planck (pegajosa) y determinismo.** Las `WeldJoint` son deterministas en el mismo motor, pero añaden coste por paso. La prueba de coste por paso de la v2 (`npm run medir`, cociente ≤ 2) se repite en L4 con pegajosas.
- **El cemento cementa al soltar la siguiente**, no al instante. Visualmente se avisa al colocar, pero hay un hueco de un toque en el que la torre aún puede moverse.
- **«¿Seguir?» puede frenar el «Otra vez en un toque».** Mitigación: solo aparece si hay con qué pagar y la partida merece la pena (I3), y nunca tiene cuenta atrás.
- **Pausa al volver de otra pestaña:** cambia una conducta que ya probaban las e2e.
- **Más tiempo de CI.** Más pruebas y una segunda compilación. El repositorio es público y no gasta cuota, pero el tope es de 30 min (K3 lo mide).
- **Equidad de la partida libre compartida.** Quien comparte `?libre=` pudo usar objetos y el amigo no lo sabe. Aceptado (Decisión T15).
- **Desfase de la curva.** Si la cadencia y las duraciones no se pueden cumplir a la vez, manda la cadencia (es lo que pidió el usuario) y se anota.

## Lo que no se puede comprobar en este cambio

- Si la música gusta y si el ritmo nuevo se siente bien con personas (solo jugadores simulados y la prueba a mano de L6).
- Un pago real, un vídeo real, el flujo de un SDK, la retirada de dinero o las devoluciones: no hay proveedor.
- El cumplimiento legal y fiscal de vender monedas (Anexo I): necesita asesoría.
- Sonido y música en iPhone con el interruptor de silencio, y en Android real. Fotogramas en un móvil real.
- Firefox en este equipo (README).

---

## Decisiones

- **T1. Solo puedo crear este archivo.** El diseño va en los Anexos B a K y la tarea 0.1 lo pasa a `docs/diseno/`. No toco `estado.md`.
- **T2. La realidad contradice un supuesto de la v2.** La v2 aceptó cambiar todos los resultados porque el juego «no se ha desplegado» (S3 de `segunda-version/tareas.md`). Hoy sí está publicado: README, línea 5, «desde el 2026-11-09». Corrección: `REGLAS = 3`, los días ya jugados se conservan con su medalla, la secuencia de formas no cambia (así las imágenes se rehacen igual), y los enlaces de la v2 quedan comparables solo a medias (riesgo anotado). Elegida porque es la más fácil de deshacer: volver a las constantes de la v2 deja todo como estaba. Se descartó mantener dos curvas, una por fecha de día, porque duplica la lógica para unos pocos días.
- **T3. Pantalla de inicio siempre, también en la primera visita.** Contradice el apartado 8 de `diseno-juego.md` («el primer contacto no tiene menús»), pero lo pide el usuario. Para no perder la sencillez: un botón «Jugar» dominante, que responde también a Espacio e Intro, sobre el escenario vivo, como hacen Stack y Tower Bloxx. Cuesta un toque más. Fácil de deshacer con una constante que salte el inicio en la primera visita.
- **T4. Una sola moneda, sin gemas.** Las pautas europeas de 2025 sobre monedas virtuales piden mostrar el precio en dinero real y no obligar a hacer cálculos de cambio. Dos monedas complican eso y la tienda. Se mantiene S8 de la v2.
- **T5. Música sintetizada en código, no en archivos.**
  - A favor: no hace falta verificar licencias (es original), pesa unos KB, no toca la CSP (`media-src` hereda `'self'`, pero no hace falta) ni R11, y puede reaccionar a la partida (capas y tempo).
  - En contra: suena más sencilla que una pista producida.
  - Descartados los archivos CC0: entre 1 y 3 MB por pista con compresión, revisión de licencia pista a pista y descarga inicial.
  - Fácil de cambiar más adelante: el motor deja la salida de música aparte.
- **T6. Todo en Do mayor pentatónica**, la escala que ya usa el perfecto (`NOTAS_PERFECTO`). Así los efectos nunca desafinan con la música. Esto es lo que entiendo por «que vaya acorde».
- **T7. Música y sonidos por separado.** `ajustes.sonido` pasa a significar «sonidos», para no renombrar campos. Al migrar, quien tenía el sonido apagado tiene también la música apagada.
- **T8. «Efectos reducidos» con tres posiciones (Sistema, Sí, No).** Sustituye a S27 de la v2 (solo el sistema): en móviles de gama baja ayuda poder bajarlos a mano. Por defecto, Sistema.
- **T9. Ajustes que no se hacen:** volumen con deslizador, idioma, borrar progreso (irreversible para el jugador y no se ha pedido) y notificaciones.
- **T10. Piezas especiales: ni se compran ni se desbloquean fuera de la partida.**
  - Venderlas rompería la igualdad del reto diario.
  - Desbloquearlas por progreso haría distintos los retos de cada jugador.
  - Salen por la semilla, iguales para todos, y se «desbloquean» con la altura dentro de cada partida: dorada desde la pieza 8, pegajosa desde la 16 y cemento desde la 24. Así el arranque sigue siendo solo tocar, y llegar más lejos enseña más cosas. Es como Candy Crush, que enseña sus caramelos especiales jugando.
  - Fácil de deshacer: `especiales: false`.
- **T11. Generador aparte para las especiales** (`semilla|especiales`). La secuencia de formas no cambia: las imágenes de días pasados siguen igual y las pruebas doradas de formas también.
- **T12. Tres especiales:**
  - dorada: premio, que empuja a seguir;
  - pegajosa: el «se sujeta a una pieza de abajo» del usuario;
  - cemento: el «convierte en piedra lo de debajo».

  Descartadas la bomba (romper la torre confunde y castiga), la pieza gigante (cambiaría formas y la secuencia) y la fantasma (difícil de leer).
- **T13. Frecuencia: una de cada 8 piezas desde la 8** (unos 20 s con la cadencia nueva). Propuesta a medir en L1. Con los datos de la v2 (19, 49 y 105 piezas), el novato vería 1 o 2, el medio unas 5 y el experto unas 12.
- **T14. Tres objetos: reloj de arena, cemento y corazón.** El cemento es la pieza especial a demanda, así hay un solo concepto que aprender (Candy Crush hace lo mismo: varios potenciadores crean caramelos especiales). El corazón es «Seguir», el equivalente a los «+5 movimientos» de Candy y Royal Match. Descartados: la guía de apuntar (ya hay línea de objetivo), el imán grande (choca con el perfecto) y los potenciadores antes de empezar (una pantalla más).
- **T15. Objetos en libre y niveles, nunca en el reto diario** (oficial ni repetición). El reto es igual para todos (`anuncios.md`, apartado 4). En los niveles cuentan para las estrellas, como en Candy Crush. Los umbrales se miden sin objetos.
- **T16. Los objetos se desbloquean tras 2, 4 y 6 partidas, con 2 de regalo cada uno.** Imita a Candy Crush, que los desbloquea por nivel con usos gratis. Las primeras partidas solo piden tocar. Los niveles 3, 6 y 9 dan uno más.
- **T17. Precios propuestos: reloj 120, cemento 180, corazón 250; máximo 9 de cada uno.** Equivalen a unos 2 a 5 minutos de partida del medio (751 monedas al día en 15 min, medido en la v2). A medir en L3.
- **T18. «¿Seguir?» una vez por partida**, solo al perder todas las vidas, solo si hay con qué pagar y, en libre, con puntos ≥ 30 % del récord (regla de `anuncios.md`). Sin cuenta atrás ni precio creciente, para no presionar.
- **T19. Vídeos:**
  - de monedas: 60 cada 4 h. El usuario pidió «cada x horas»; las guías de las redes de anuncios hablan de minutos entre vídeos y de 5 a 10 al día, así que 4 h se queda corto a propósito para no convertir el juego en ver anuncios;
  - de objeto: 1 al día;
  - de «Seguir»: 1 por partida.

  En la web sin proveedor no se ve ninguno (R12).
- **T20. Pagos: interfaz con implementación nula y simulada.** Productos: 3 paquetes de monedas y un lote de inicio de una sola vez. No se venden objetos sueltos con dinero: se compran con monedas (un solo camino). Los precios en euros los decide el usuario al activar.
- **T21. Compilación de demostración** (`PUBLIC_PLATAFORMA=demo`) para ver en pantalla los vídeos y pagos simulados, con una banda que lo avisa. No se despliega. Su código no llega a la web (R14).
- **T22. Lo que no debería estar** (y está en Candy Crush, Royal Match o Subway Surfers):
  - vidas o energía (contradice «juega cuanto quieras»);
  - ruleta diaria de potenciadores (azar parecido a apostar, S de la v2);
  - cofres aleatorios;
  - gemas;
  - ofertas con cuenta atrás;
  - equipos (necesitan servidor);
  - potenciadores antes de empezar (otra pantalla);
  - calendario de entrar cada día (ya está la racha del reto);
  - banners;
  - notificaciones.
- **T23. Lo que suma sin complicar:**
  - regalo al desbloquear cada objeto y objetos como premio en los niveles 3, 6 y 9 (enseñan que existen);
  - aviso la primera vez que sale una especial;
  - música que crece con el combo y la altura;
  - tarjeta del reto de hoy en el inicio (el hábito diario a un toque);
  - ficha «Monedas gratis» solo cuando haya vídeo.
- **T24. La velocidad ya no solo sube.** Baja tras una caída o al seguir (respiro), sube en racha y baja con el reloj. Sustituye el requisito de la v2 «la velocidad nunca baja». Motivo: es la forma de que «progrese según todos los sucesos» y de que un arranque más rápido no acorte demasiado la partida del novato.
- **T25. Valores iniciales de la curva** (Anexo J): 1,6 m/s, +0,025 por pieza soltada, tope 3,4, respiro de 4 piezas tras caer y de 8 al seguir, racha ×1,08 con combo ≥ 5, reloj ×0,6. Son una propuesta: B2 y L1 los ajustan con mediciones.
- **T26. Mapa:** los mismos 10 niveles. Solo cambia la disposición (pantalla completa, márgenes y ventana del nivel).
- **T27. Logo: en el juego no hay ninguno visible** (`index.astro:36`: el `<h1>` es solo para lectores). Entiendo «el logo» como el favicon y el título de la imagen para compartir, y creo uno nuevo que se ve en el inicio. Una sola geometría para SVG y canvas. El favicon lleva solo el icono, porque un `data:` no puede usar la fuente.
- **T28. Marcador:** no he podido confirmar la causa sin ejecutar el juego. En la captura de la v2, «610» ya llena la pegatina, y el CSS tiene columnas `1fr` con textos que no se parten. A1 obliga a reproducirlo antes de arreglarlo.
- **T29. Pausa en todos los modos.** En el reto oficial, «Abandonar» cuenta el intento con los puntos que lleve. Hoy en el oficial no se abre ningún panel (`flujo.ts:139`) y la pausa por pestaña oculta sigue sola al volver. Se cambia a quedarse en pausa con el panel, para que la pieza no sorprenda.
- **T30. Sigo sin React.** La estrategia pide React para interfaces de aplicación. La v2 lo descartó por peso (S13, explicado en el README), y aunque ahora hay más pantallas (inicio, pausa, ajustes, tienda), siguen siendo paneles sencillos. Si `principal.ts` y las pantallas se hacen inmanejables, se reconsidera en la siguiente versión.
- **T31. Guardado v3 aditivo.** El código de la v2 acepta `version ≥ 2` e ignora lo que no conoce (`progreso.ts:135`), así que volver a la v2 no pierde monedas ni retos.
- **T32. Descargas de sitios ajenos: ninguna.** La música se genera en código y no se descarga ningún recurso. Las páginas de Candy Crush, Royal Match, Stack, Tower Bloxx y las de anuncios y normativa se consultaron con búsquedas a mano para este plan, así que no aplica `robots.txt`.
- **T33. El repositorio no tiene archivo de licencia** (no hay `LICENSE` en la raíz; comprobado hoy). La música original queda en el mismo régimen que el código: todos los derechos reservados por defecto. Lo anoto para que el usuario decida si quiere una licencia. No es bloqueante.
- **T34. «Tienda» sustituye a «Colección»** como nombre y como pantalla: el usuario habla de «ir a la tienda». Los temas y escenarios siguen dentro.
- **T35. Lote de inicio y paquetes, solo de monedas y objetos.** No se vende «Quitar anuncios» mientras no haya anuncios.
- **Supuestos:**
  - interfaz solo en español;
  - el usuario juega sobre todo en el móvil;
  - «cada x horas» = 4 h;
  - «unos 3 objetos» = exactamente 3;
  - el día sigue cambiando a medianoche UTC;
  - la prueba e2e de la demo puede ir dentro de `npm run e2e`, porque el repositorio es público y el CI no gasta cuota.

## Bloqueantes

- **Para esta fase: ninguno.** Todo se hace en la rama, sin pagar ni pedir nada.
- **Tras la revisión final (necesitan al usuario):** desplegar en Cloudflare Pages. Las reglas 3 cambian el juego a quien ya lo está jugando (T2).
- **BLOQUEANTE para activar pagos (fase posterior):** cuenta en un proveedor (Stripe o una tienda de apps), comisiones y quizá la cuota de desarrollador de Google Play o Apple (pago), precios en euros (decide el usuario), asesoría fiscal (IVA de servicios digitales en la UE) y legal (desistimiento en contenido digital, menores, condiciones, privacidad y las pautas europeas sobre monedas virtuales), y un servidor que verifique los pagos (Anexo I).
- **BLOQUEANTE para activar vídeos (fase posterior):** cuenta en un portal (CrazyGames o Poki), AdSense o AdMob, y consentimiento de privacidad en la UE (asesoría legal), como ya dice `anuncios.md`, apartado 8.

---

# Anexo A. Lo que hacen juegos parecidos y qué se toma

Consultado el 2026-11-09 con búsquedas web; las fuentes van al final. Muchas cifras de precios vienen de wikis de aficionados y caducan, así que solo orientan.

| Juego | Mecánica | ¿En Torre Diaria? | Por qué |
|---|---|---|---|
| Candy Crush | Mapa de saga como pantalla principal | Sí, a pantalla completa (F1), pero el inicio es aparte | Nuestro juego principal es la partida libre, no los niveles |
| Candy Crush | Potenciadores antes de empezar (pez sueco, bomba de color, rueda de coco) y durante el nivel (martillo) | Solo durante la partida (I3) | Una pantalla menos; el reto diario queda limpio |
| Candy Crush | Potenciadores que se desbloquean al llegar a cierto nivel, con 3 usos gratis | Sí: tras 2, 4 y 6 partidas, con 2 gratis (T16) | Enseña sin menús y mantiene sencillo el arranque |
| Candy Crush | Ruleta diaria de potenciadores | No (T22) | Azar con premio; ya se descartó en la v2 |
| Candy Crush y Royal Match | Seguir con más movimientos al perder, pagando | Sí, como «¿Seguir?» con corazón, monedas o vídeo (T18) | Es la ayuda más clara y no cambia las reglas |
| Candy Crush y Royal Match | Vidas que se gastan y se recargan con el tiempo | No | Contradice «juega cuanto quieras» |
| Royal Match | Monedas al ganar niveles, que se gastan en potenciadores y en seguir | Sí, con nuestra única moneda | Ya existía la moneda |
| Royal Match | Equipos, cofre del equipo, eventos con icono en el inicio | No (servidor) | Fase posterior, si hay ranking |
| Stack (Ketchapp) | La pantalla de inicio es la propia escena: toca para jugar; más velocidad al subir; recompensa por colocar sin sobrante | Sí: inicio sobre el escenario vivo; curva que sube (Anexo J) | Lo más cercano a nuestro núcleo |
| Tower Bloxx | Grúa que balancea; medidor de combo por caídas perfectas; la torre recta atrae vecinos | Ya hay combo; la música con capas hace de medidor sonoro (D3) | Refuerza la racha sin otro marcador |
| Subway Surfers | Ajustes con música aparte; cambiar la música | Música y sonidos por separado (C2); elegir canción, no | Lo pidió el usuario; elegir canción es fase posterior |
| Redes de anuncios (AppLovin, Pangle y otros) | Vídeo con premio opcional, en pausas naturales, con tope por sesión y día | Sí, en el inicio, la tienda y «¿Seguir?»; nunca en el reto | `anuncios.md` ya lo preveía |
| Pautas de la red europea de protección del consumidor (2025) | Mostrar el precio en dinero real; no obligar a comprar paquetes que no cuadran | Una sola moneda; al activar, mostrar el equivalente en euros | Requisito para activar (Anexo I) |

# Anexo B. Pantalla inicial

```
┌──────────────────────────────┐
│ (moneda 1.240)       (rueda) │  ← fichas en las esquinas
│                              │
│        ╔═ TORRE ═╗           │  ← logo (Anexo E)
│        ║ DIARIA  ║           │
│                              │
│         ┌───┐ ← pieza con    │
│         │· ·│   ojos en el   │
│         └───┘   gancho       │
│                              │
│   ┌──────────────────────┐   │
│   │        JUGAR         │   │  ← principal, rosa, foco al cargar
│   └──────────────────────┘   │
│ ┌────────┐┌────────┐┌──────┐ │
│ │ llama 3││estrella││tienda│ │  ← Reto de hoy · Niveles · Tienda
│ │Reto #5 ││Nivel 4 ││      │ │
│ │sin jugar││ 9 ★   ││      │ │
│ └────────┘└────────┘└──────┘ │
│ [Monedas gratis] (solo si hay vídeo)
│====== muelle del Puerto ======│
└──────────────────────────────┘
```

- **Fondo:** el escenario equipado con su cielo de 0 m. La pieza se mece en el gancho a la velocidad inicial (es dibujo, sin física).
- **Reto de hoy:** «Sin jugar» con un punto rosa, o la medalla y los puntos; el número de racha sobre la llama. Si hay congeladores, se ven en Retos, no aquí.
- **Niveles:** «Nivel N» (el siguiente disponible) y las estrellas totales.
- **Tienda:** con un punto rosa si se puede comprar algo con las monedas que hay.
- Al volver del fin o de un panel, el inicio recuerda el último objetivo cercano en una línea («Te faltan 120 monedas para Caramelo»), que ya existe en `siguienteObjetivo`.

# Anexo C. Ajustes

| Ajuste | Valores | Por defecto | Guardado |
|---|---|---|---|
| Música | Sí / No | Sí (No si la v2 tenía el sonido apagado) | `ajustes.musica` |
| Sonidos | Sí / No | Sí | `ajustes.sonido` |
| Vibración | Sí / No (solo si hay `navigator.vibrate`) | Sí | `ajustes.vibracion` |
| Efectos reducidos | Sistema / Sí / No | Sistema | `ajustes.efectosReducidos` |
| Cómo se juega | Abre 3 fichas: toque y perfecto, vidas y combo, especiales y objetos | — | `ajustes.tutorialVisto` se vuelve a poner a `false` |
| Créditos y licencias | Texto | — | — |
| Privacidad | «Todo se guarda solo en este navegador. No hay cuentas, ni cookies de terceros, ni anuncios.» (cambiará al activar vídeos o pagos) | — | — |
| Versión | «Torre Diaria · reglas 3» | — | — |

Cada interruptor es un `button` con `role="switch"` y `aria-checked`, de 44 px o más, dentro de un panel de papel como los demás.

# Anexo D. Mapa de niveles

```
┌──────────────────────────────┐
│(casa) ( Puerto )  (★ 9)(◎ 1.240)│ ← fichas sobre el mapa, con sombra desplazada
│                              │
│        (10 jefe)             │
│           \                  │
│            (9 candado)       │   mapa a pantalla completa,
│           /                  │   desplazamiento vertical,
│     (8 actual, latiendo)     │   el actual centrado al abrir
│          \                   │
│           (7 ★★☆)            │
│ ...                          │
│====== Puerto (SVG) ===========│
│  ┌────────────────────────┐  │
│  │    Jugar nivel 8       │  │ ← botón flotante abajo
│  └────────────────────────┘  │
└──────────────────────────────┘
```

Al tocar un nivel abierto se abre una ventana (como la de Candy Crush) con «Nivel 8», sus estrellas, el objetivo en una frase, «2 estrellas: 550 puntos · 3: 600», «Jugar» y «Cerrar». En escritorio, el mapa ocupa la columna de 9:16 y a los lados sigue el escenario. Se mantienen el camino en zigzag, las nubes, los globos y las gaviotas de la v2.

# Anexo E. Logo

- **Idea:** el título como torre impresa en risografía. Dos líneas, «TORRE» encima de «DIARIA», en Bricolage Grotesque 800.
- **Letras:** cada una con un giro leve, entre −4° y +4°, fijo y no aleatorio, como piezas apiladas. Contorno de tinta y doble impresión desplazada en rosa (2 px) y azul riso (−1 px), como el «fuera de registro» de los paneles.
- **La «O» de TORRE** es una pieza cuadrada turquesa con dos ojos que cuelga de un gancho amarillo con cable de tinta, como la pieza del juego. Parpadea cada 3 a 5 s en el inicio (solo SVG y CSS; quieta con efectos reducidos).
- **Debajo de «DIARIA»**, una franja naranja con pilotes: el muelle.
- **Colores:** los de la paleta Riso (Anexo 1 de la v2, 1.2). El texto, en tinta sobre papel.
- **Favicon (16 y 32 px):** la pieza turquesa con ojos colgando del gancho sobre una franja de muelle, sin texto.
- **Imagen para compartir:** el mismo logo, dibujado en canvas con la misma geometría, en lugar del texto actual de `imagen.ts:240`.

# Anexo F. Música

- **Estilo:** pop de juguete sobre papel. Marimba suave, bajo redondo, colchón tenue y un poco de percusión de cepillo. Nada estridente: acompaña sin tapar los «tic» y «toc».
- **Escala:** Do mayor pentatónica (Do, Re, Mi, Sol y La), la misma que el perfecto. Acordes Do, La menor, Fa y Sol.
- **Instrumentos (síntesis):**
  - Marimba: seno más seno a ×4 con un 15 % de volumen; ataque de 5 ms; caída exponencial de 350 ms.
  - Bajo: triangular de una octava y media por debajo; filtro paso bajo a 600 Hz; 200 ms.
  - Colchón: dos triangulares desafinadas ±6 centésimas; ataque de 400 ms; filtro a 1,2 kHz.
  - Percusión: cepillo (ruido con paso alto a 6 kHz, 30 ms) y bombo suave (seno de 120 a 50 Hz en 120 ms).
- **Volumen:** música 0,25 y efectos 0,5, con la general a 1. La música va siempre por debajo.

| Pista | Compases | Tempo | Cuándo |
|---|---|---|---|
| Inicio | 8, en bucle | 88 BPM | Inicio, mapa, tienda, retos y ajustes (al abrir un panel desde la partida, sigue la de partida) |
| Partida A/B | 16, en bucle, alternando A y B | De 100 a 112 BPM: `100 + 12 · (v − VEL_INICIAL) / (VEL_TOPE − VEL_INICIAL)`; cambia al empezar el compás | Libre, reto y nivel |
| Fin | Motivo Sol, Mi, Do; 1,5 s | — | Al perder la última vida o acabar el reto |
| Victoria | Do, Mi, Sol, Do más acorde; 2,5 s | — | Nivel ganado, antes de las estrellas |

| Capa | Qué suena | Entra con | Sale con |
|---|---|---|---|
| 0 | Colchón y marimba | Siempre | — |
| 1 | + bajo | Altura ≥ 5 m o combo ≥ 2 | Caída (baja una capa) |
| 2 | + percusión | Combo ≥ 4 o velocidad ≥ 2,6 m/s | Caída |
| 3 | + contramelodía en arpegio | Combo ≥ `RACHA_COMBO` (5), «en racha» | Al romperse el combo |

Tras una caída, el filtro general de la música baja a 600 Hz y vuelve en 2 compases: la música «se hunde» con la torre. En pausa, la música se para; al seguir, retoma al empezar el compás.

**Autoría y licencia:** composición original hecha para este juego, escrita como datos en `partituras.ts`. No usa muestras ni melodías de terceros.

# Anexo G. Piezas especiales

| Especial | Aspecto (en todos los temas) | Efecto | Desde la pieza |
|---|---|---|---|
| Dorada | Amarilla con brillo en diagonal y una estrella en la trama; ojos con pestañas | Si se coloca: puntos de colocada ×2 y +10 monedas | 8 |
| Pegajosa | Rosa con gotas de miel en el borde inferior; ojos entornados | Al colocarse, queda unida a lo que toca: no resbala ni vuelca respecto a ello | 16 |
| Cemento | Gris claro con un saco dibujado y una franja amarilla; ojos serios | Al soltar la siguiente, ella y todo lo que hay debajo, si está quieto, se vuelve piedra | 24 |

- **Frecuencia:** exactamente una en cada tramo de 8 piezas desde la 8, en una posición del tramo elegida por la semilla. En el primer tramo, siempre dorada.
- **Tipos según el tramo:** en el segundo, dorada o pegajosa; desde el tercero, los tres, con pesos 40 % dorada, 30 % pegajosa y 30 % cemento (propuesta a medir).
- **Aviso la primera vez:** «Pieza dorada: vale el doble», «Pieza pegajosa: se queda pegada donde cae» y «Pieza de cemento: convierte en piedra lo de debajo».
- **Niveles:** sin especiales en los niveles 1 a 3; con ellas desde el 4.
- **Reto diario:** con especiales, iguales para todos.

# Anexo H. Objetos de ayuda

| Objeto | Qué hace | Cuándo se usa | Se desbloquea | Precio (propuesta) | Por vídeo |
|---|---|---|---|---|---|
| Reloj de arena | Las 5 piezas siguientes, contando la que cuelga, a ×0,6 de velocidad | Con una pieza colgando; no se acumula | Tras 2 partidas (+2 gratis); nivel 3: +1 | 120 | 1 objeto gratis al día, de cualquier tipo |
| Cemento | La pieza que cuelga pasa a ser de cemento | Con una pieza normal colgando | Tras 4 partidas (+2); nivel 6: +1 | 180 | Igual |
| Corazón | «Seguir» con 1 vida al perder la última, con respiro de velocidad | En «¿Seguir?», una vez por partida | Tras 6 partidas (+2); nivel 9: +1 | 250 | Además, «Seguir» con vídeo, 1 por partida |

- **Máximo:** 9 de cada uno.
- **Dónde:** libre y niveles. Nunca en el reto diario (oficial ni repetición).
- **En pantalla:** la barra de la partida lleva solo reloj y cemento; el corazón aparece en «¿Seguir?».
- **Con 0 unidades,** el botón abre una compra rápida en pausa: monedas o vídeo.

# Anexo I. Tienda, monedas, vídeos y pagos

**Pestañas de la Tienda:**

- **Objetos:** reloj, cemento, corazón y congelador de racha (200, máximo 2, como en la v2).
- **Piezas:** los 6 temas de la v2 con sus precios.
- **Escenarios:** se desbloquean por altura o racha, como en la v2.
- **Monedas:** solo con un proveedor de pagos o vídeos disponible.

**Fuentes de monedas:**

- las de la v2: partidas, reto diario y estrellas;
- especiales doradas: +10;
- vídeo cada 4 h: 60 (con proveedor);
- paquetes (con proveedor de pagos).

**Productos de dinero (ids fijos; precios en euros a decidir por el usuario):**

| Id | Contenido | Límite |
|---|---|---|
| `monedas-1000` | 1.000 monedas | — |
| `monedas-3000` | 3.000 monedas | — |
| `monedas-8000` | 8.000 monedas | — |
| `lote-inicio` | 1.500 monedas + 3 relojes + 3 cementos + 3 corazones (sin pasar del máximo de 9) | Una vez |

**Interfaz `Pagos` (`src/juego/pagos.ts`):**

- `disponible()`;
- `productos()`, con el precio en texto que dé el proveedor;
- `comprar(id)`, que resuelve `pagado` con transacción, `cancelado`, `error` o `pendiente`.

`acreditarCompra` es pura y no acredita dos veces la misma transacción. Implementaciones: `pagosNulos` (web) y `pagosSimulados` (pruebas y demo).

**Vídeos (interfaz `Anuncios` de la v2):** `recompensado("monedas" | "objeto" | "seguir")`. El premio solo se da con `"visto"`. La política está en `src/logica/recompensas.ts`, con la hora como parámetro, así que se prueba con el reloj simulado.

**Para activar (fase posterior; cada punto, del usuario):**

1. **Elegir plataforma.**
   - Web propia: Stripe Checkout más un Worker de Cloudflare con D1 para verificar el pago y registrar la transacción. Sin servidor, cualquiera podría acreditarse monedas; en un juego sin ranking importa poco, pero el cobro sí debe verificarse.
   - Portal: CrazyGames o Poki, según su SDK. Sin comprobar si admiten compras.
   - Móvil: Expo con la facturación de Google Play y App Store; cuotas de desarrollador de pago.
2. **Precios en euros** de cada producto y su equivalencia visible en la tienda (pautas europeas de 2025).
3. **Asesoría fiscal:** IVA de servicios digitales a consumidores de la UE (régimen de ventanilla única), facturación.
4. **Asesoría legal:** condiciones de venta, renuncia expresa al desistimiento en contenido digital, menores, política de privacidad y consentimiento si hay anuncios.
5. **Vídeos:** cuenta en el portal o en AdSense o AdMob y adaptador de `Anuncios` en una compilación aparte (`anuncios.md`, apartado 5).
6. Cambiar el texto de «Privacidad» en Ajustes.

# Anexo J. Curva de velocidad v3

**Fórmula (propuesta; B2 y L1 la ajustan):**

```
ritmo: entero ≥ 0 (empieza en 0)
v = clamp(VEL_SUELO, VEL_TOPE, (velocidadInicialDeLaPartida + VEL_INCREMENTO · ritmo) · multiplicadores)
```

| Constante | v2 | Propuesta v3 | Motivo |
|---|---|---|---|
| `VEL_INICIAL` | 1,0 m/s | 1,6 m/s | La primera pieza llega al centro en 2,1 s en lugar de 3,4 s. Ventana del perfecto: ±100 ms (≥ 90 ms) |
| `VEL_INCREMENTO` | 0,03 por pieza | 0,025 por pieza soltada | Arranca más rápido, sube algo más despacio |
| `VEL_TOPE` | 3,4 m/s (pieza 80) | 3,4 m/s (ritmo 72) | Igual que la v2: el final ya era exigente |
| `VEL_SUELO` | — | 1,2 m/s | Ni el respiro ni el reloj bajan de aquí |

Nota: con 1,6 m/s, `AMPLITUD / VEL_INICIAL` = 2,125 s y no cumple el requisito de B2 (≤ 2,0 s). B2 debe subir `VEL_INICIAL` a 1,7 (2,0 s y ventana de 94 ms) o justificar otra opción. Lo dejo así para que la medición decida entre 1,6 y 1,77, el máximo que permite la ventana de 90 ms.

| Suceso | Efecto en la velocidad | Por qué |
|---|---|---|
| Pieza soltada | ritmo + 1 | Progresión base |
| Bueno o normal | Nada | El castigo ya es perder el combo |
| Perfecto | Nada por sí solo | — |
| Combo ≥ 5 («en racha») | ×1,08 mientras dure | Quien va bien recibe más reto y suena la capa 3 |
| Caída (vida perdida) | ritmo − 4 (respiro) | Evita que una caída a gran velocidad lleve a otra seguida; alarga la partida del novato |
| Vida extra | Nada | Ya es un premio |
| Hito de 5 m | Nada (solo música y efecto) | No mezclar señales |
| Cementado automático | Nada | Es técnico |
| Pieza especial | Nada (cada una actúa sobre la torre, no sobre la velocidad) | Una sola cosa nueva cada vez |
| Reloj de arena | ×0,6 durante 5 piezas | Ayuda comprada |
| Seguir | ritmo − 8 | Seguir a velocidad máxima sería perder al momento |
| Pieza 100 | Perfecto a 0,08 m (como la v2) | El final sigue exigente |
| Niveles | Cada nivel fija su velocidad inicial (las de los niveles 1 a 3 suben desde 0,9; a medir en L2) | Los niveles fáciles también arrancaban lentos |
| Reto diario | La misma curva que la libre | Igual para todos |

# Anexo K. Guardado v3 (`torre-diaria:progreso`, `version: 3`)

Solo se añaden campos. Todo lo de la v2 sigue igual.

```
ajustes: { sonido, vibracion, tutorialVisto,            // v2 (sonido = efectos)
           musica: boolean,                              // nuevo
           efectosReducidos: "sistema" | "si" | "no" }   // nuevo
objetos: { reloj: 0..9, cemento: 0..9, corazon: 0..9,
           desbloqueados: string[],                      // "reloj", "cemento", "corazon"
           premiosNivel: number[] }                      // niveles cuyo objeto ya se dio
recompensas: { ultimoVideoMonedas: número (ms) | 0,
               diaObjetoVideo: número de día | 0 }
compras: { transacciones: string[] (≤ 50), loteInicio: boolean }
vistos: string[]                                         // "dorada", "pegajosa", "cemento"
estadisticas: { …v2, partidas: número }                  // nuevo campo dentro
```

---

## Fuentes (consultadas el 2026-11-09)

- [King: qué son los potenciadores de Candy Crush](https://community.king.com/en/candy-crush-saga/kb/articles/394-what-are-boosters-learn-all-about-them-here) (en el buscador; la página dio 404 al abrirla), [Candy Crush Wiki: tienda del Yeti](https://candycrush.fandom.com/wiki/Yeti_Shop), [Candy Crush Soda Wiki: potenciadores bloqueados](https://candycrushsoda.fandom.com/wiki/Booster), [Candy Crush Jelly Wiki: potenciadores](https://candycrushjelly.fandom.com/wiki/Boosters), [Candy Crush Wiki: Party Booster](https://candycrush.fandom.com/wiki/Party_Booster)
- [Royal Match Wiki: combinaciones de cohetes](https://royalmatch.fandom.com/wiki/Rocket_Combinations), [PocketGamer: consejos de Royal Match](https://www.pocketgamer.com/royal-match/tips-and-tricks), [Royal Match en Wikipedia](https://www.Wikipedia.org/wiki/Royal_Match), [Appservatory: caso Royal Match](https://appservatory.com/case-studies/royal-match/)
- [148Apps: guía de Stack](https://www.148apps.com/news/stack-guide-how-to-build-a-great-tower/), [PocketGamer: análisis de Tower Bloxx](https://www.pocketgamer.com/tower-bloxx/review/), [Game Developer: postmortem de Tower Bloxx](https://gamedeveloper.com/design/postmortem-digital-chocolate-s-i-tower-bloxx-i-)
- [Subway Surfers Wiki: Boombox (cambiar la música en ajustes)](https://subwaysurf.fandom.com/wiki/File:BoomboxChangeMusic1.jpg)
- [AppLovin: usar mejor los vídeos con premio](https://support.applovin.com/en/max/best-practices/tips-for-using-rewarded-videos-more-effectively), [Pangle: pautas de vídeo con premio](https://pangleglobal.com/knowledge/rewarded-video-ads-guideline), [Applixir: buenas prácticas](https://support.applixir.com/hc/en-us/articles/360056835154-Best-Practices-)
- [Baker McKenzie: principios de la red CPC sobre monedas virtuales](https://connectontech.bakermckenzie.com/european-consumer-protection-network-issues-new-key-principles-on-in-game-virtual-currencies-impact-for-gaming-and-gambling-entities-in-belgium-the-eu-and-beyond/), [Bird & Bird: protección del consumidor en videojuegos](https://www.twobirds.com/en/insights/2025/european-move-towards-protecting-users-from-harmful-practices-in-video-games-eu-consumer-protection), [PocketGamer.biz: transparencia en compras dentro del juego](https://www.pocketgamer.biz/new-eu-guidelines-demand-transparency-for-in-game-purchases)
- [web.dev: «A tale of two clocks» (programar audio con anticipación)](https://web.dev/articles/audio-scheduling), [IRCAM: tiempo y programación en Web Audio](https://ircam-ismm.github.io/webaudio-tutorials/scheduling/timing-and-scheduling.html)
