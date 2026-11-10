# Torre Diaria: plan de anuncios, sin implementar

Nada de esto se implementa en la segunda versión. El bloque G solo deja los huecos.

**Estado en el código (2026-11-09):** no hay ningún anuncio activo, ni SDK, ni peticiones a otros orígenes, ni botones de anuncio. Existen solo los puntos de llamada de `src/juego/anuncios.ts`, que con `anunciosNulos` no hacen nada: `partidaEmpieza` y `partidaPara` (al empezar, seguir, acabar o pausar una partida) y el intersticial de los puntos 4 («Otra vez» desde el fin de una partida libre) y 5 («Siguiente nivel»). En la v2, los puntos 1 a 3 (recompensados) solo tenían sus tipos en la interfaz (`recompensado`, `MotivoRecompensado`) y ningún botón. Tampoco existe la política del apartado 3: las llamadas se hacen siempre y, si hubiera un anuncio listo, el juego lo espera. `anunciosDePlataforma` ignora `PUBLIC_PLATAFORMA` y devuelve siempre `anunciosNulos`; el reto diario no tiene ninguna llamada de intersticial.

**Cambiado en la v3 (plan del 2026-11-09, `docs/proceso/tercera-version/`; lo que difiere del plan, abajo):** los recompensados pasan a tener llamada y botón, pero **solo se ven con un adaptador de anuncios disponible** (`anuncios.disponible()`). En la web, con `anunciosNulos`, no se ve ningún botón de vídeo (apartado 4). Los motivos son `"monedas"` (60 monedas cada 4 h, en Tienda > Monedas), `"objeto"` (1 objeto al día) y `"seguir"` (1 vida en «¿Seguir?», una vez por partida y solo en la partida libre). El premio solo se da con `"visto"` y la política vive en `src/logica/recompensas.ts`. Diseño completo en [`tienda-y-pagos.md`](tienda-y-pagos.md). Los puntos 2 («×2 monedas») y 3 («Congelador gratis») de la tabla siguen sin hacerse.

## 1. Papel de los anuncios

Pagar el juego sin estropearlo: anuncios **opcionales con premio** como fuente principal y un **intersticial** espaciado en transiciones naturales. El reto diario se mantiene limpio y justo: nadie gana puntos viendo anuncios.

## 2. Formatos y puntos exactos de entrada

| # | Momento del flujo | Formato | Qué se ofrece | Límite |
|---|---|---|---|---|
| 1 | Fin de partida **libre**, antes de mostrar el resultado final, si se han perdido las 3 vidas | Recompensado, opcional | «Seguir con 1 vida» | 1 por partida; solo si los puntos ≥ 30 % del récord; nunca en reto diario ni niveles |
| 2 | Pantalla de fin de partida libre | Recompensado, opcional | «×2 monedas de esta partida» | 5 al día |
| 3 | Pantalla Retos | Recompensado, opcional | «Congelador de racha gratis» | 1 a la semana; alternativa: comprarlo con 200 monedas |
| 4 | Pulsar «Otra vez» en libre | Intersticial | — | Ver apartado 3 |
| 5 | Pulsar «Siguiente nivel» | Intersticial | — | Ver apartado 3 |

Todos los recompensados tienen alternativa sin anuncio o son un extra; ningún nivel ni medalla exige verlos.

## 3. Frecuencias y límites del intersticial

Se pide solo si se cumplen todas: han pasado ≥ 180 s desde el último anuncio de cualquier tipo; ≥ 3 partidas o niveles desde el último intersticial; ≥ 5 min de sesión; no es el primer día del jugador; en esa misma transición no se ha ofrecido el «Seguir» del punto 1. Los portales aplican además sus propios topes (CrazyGames, como mucho uno cada 3 minutos): el juego pide y el SDK decide.

## 4. Lo que nunca se hace

- Anuncios durante la partida, al pulsar botones de navegación (Inicio, Retos, Tienda, Ajustes) o nada más abrir la web propia.
- Anuncios en el reto diario oficial, o cualquier ventaja de puntuación a cambio de verlos.
- Encadenar anuncios por un premio, dar el premio si el anuncio falla, o mostrar botones de anuncio que no hacen nada.
- Botones engañosos, cierre escondido o retrasado.
- Banners en la zona de juego o que tapen la interfaz; anuncios dentro de la imagen para compartir.
- Bloquear o castigar a quien usa bloqueador de anuncios: el juego entero funciona sin anuncios.
- Combinar en la misma transición un intersticial y un «Seguir con anuncio» (regla de CrazyGames).
- Recoger datos para anuncios sin consentimiento en la UE.

**Banners:** no en esta fase de anuncios. Pagan poco y empeoran el aspecto. Si un portal los pide, solo en pantallas de menú que duren más de 5 s y nunca en la partida.

## 5. Plataformas

| | Portales web (CrazyGames, Poki) | Web propia (AdSense, juegos H5) | Móvil (AdMob) |
|---|---|---|---|
| Cómo | Se sube la compilación al portal; anuncios solo por su SDK (`commercialBreak`/`rewardedBreak` en Poki; `requestAd("midgame" | "rewarded")` en CrazyGames) | API de colocación de anuncios de Google (`adBreak`, tipos `next` y `reward`) | App Expo con anuncios nativos |
| Requisitos | Revisión del portal; no se permiten otros anuncios; pausar juego y sonido durante el anuncio; avisar `gameplayStart/Stop` | Cuenta AdSense aprobada y acceso a juegos H5 (en beta según Google); probablemente dominio propio (sin comprobar); consentimiento en la UE con una plataforma certificada | Publicar en tienda: Google Play cobra su cuota; AdMob exige vincular la app (sin comprobar en detalle) |
| Coste | Gratis; reparto de ingresos | Gratis salvo dominio | Cuota de tienda |
| Recomendación | **Primera opción**: trae jugadores y gestiona el consentimiento | Después, si hay tráfico propio | Solo si el juego funciona en web |

Notas técnicas para portales: la compilación del portal no usa `public/_headers` (lo sirve el portal), pero su CSP debe permitir el SDK; el enlace para compartir debería apuntar a la página del juego en el portal; el portal puede pedir su propio guardado. Todo eso va en una compilación aparte (`PUBLIC_PLATAFORMA=crazygames`), sin tocar la web.

## 6. Quitar anuncios

Compra única (orientativo, 2,99 €) que quita los intersticiales y mantiene los recompensados como opcionales (o da su premio sin anuncio una vez al día). Solo cuando haya un medio de pago: compras del portal o tienda móvil. Cobrar en la web propia exige pasarela de pago y obligaciones fiscales: decide el usuario.

## 7. Huecos en el código (bloque G)

- `src/juego/anuncios.ts`: interfaz `Anuncios` (`disponible`, `intersticial`, `recompensado`, `partidaEmpieza`, `partidaPara`) y `anunciosNulos`, que no hace nada.
- Llamadas puestas (probadas con Vitest en `src/juego/anuncios.test.ts`): `partidaEmpieza`, `partidaPara` e intersticial en los puntos 4 y 5. *Diferencia con el plan original:* en la v2, los puntos 1 a 3 (recompensados) no tenían llamada ni botón, porque un botón que no hace nada incumple el apartado 4. *Cambiado en la v3:* el punto 1 y los vídeos de monedas y de objeto tienen llamada y botón, visibles solo con un adaptador; en la web no se ven.
- Para implementar más adelante: una política pura (`src/logica/politica-anuncios.ts`) con las reglas del apartado 3, probada con Vitest, y un adaptador por plataforma que cargue su SDK solo en esa compilación.

## 8. Lo que necesitará al usuario

Cuenta de desarrollador en el portal elegido; si es web propia, cuenta AdSense, posible dominio (pago) y consentimiento de privacidad (asesoría legal); para móvil, cuota de Google Play (pago); para «quitar anuncios», un medio de cobro (pago, fiscal y legal).

## Fuentes (consultadas el 2026-11-06)

- [CrazyGames: requisitos de anuncios](https://docs.crazygames.com/requirements/ads/) y [SDK HTML5 v3, anuncios de vídeo](https://docs.crazygames.com/sdk/html5-v3/video-ads)
- [Poki: SDK HTML5](https://sdk.poki.com/html5.html) y [requisitos](https://sdk.poki.com/new-requirements)
- [Google: API de colocación de anuncios](https://developers.google.com/ad-placement/apis) y [tipos de colocación](https://developers.google.com/ad-placement/docs/placement-types)
- [Registro de npm: @fontsource-variable/bricolage-grotesque](https://registry.npmjs.org/@fontsource-variable/bricolage-grotesque/latest)

## 9. Dónde la implementación de la v3 difiere de este plan (2026-11-10)

- «Seguir» (punto 1) solo existe en la partida libre (recorte R-4); en el reto y en los niveles no se ofrece.
- «¿Seguir?» no acepta toques durante 700 ms (`ESPERA_FIN_MS`) y lleva el foco en el título, para que un toque rezagado de la partida no elija sin querer.
- Los mensajes de vídeo solo salen si hubo premio (decisión tras el revisor); en la web no hay vídeos, porque `anuncios.disponible()` es falso.
- No existe la ficha «Monedas gratis» del inicio (recorte R-10): el vídeo de monedas vive solo en Tienda > Monedas, visible únicamente en la compilación de demostración.
- Siguen sin hacerse los puntos 2 y 3 de la tabla, y la política del apartado 3 (frecuencias del intersticial) sigue sin existir: las llamadas se hacen siempre.
