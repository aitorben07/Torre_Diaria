# Torre Diaria: tienda, monedas, vídeos y pagos

Diseño de la tercera versión (plan del 2026-11-09, `docs/proceso/tercera-version/tareas.md`, Anexo I, con los cambios de `impacto.md`, apartado 5). **No se cobra nada ni se integra ningún proveedor:** en la web, pagos y vídeos tienen implementaciones nulas y no se ve ningún botón de compra con dinero ni de vídeo (regla de `anuncios.md`, apartado 4). Las implementaciones simuladas solo existen en las pruebas y en la compilación de demostración, que no se despliega.

## 1. Pestañas de la Tienda

La Tienda sustituye a la Colección de la v2 (Decisión T34).

- **Objetos:** reloj de arena, cemento, corazón y congelador de racha (200 monedas, como mucho 2, como en la v2). Es la pestaña por defecto.
- **Piezas:** los 6 temas de la v2 con sus precios.
- **Escenarios:** se desbloquean por altura o racha, como en la v2.
- **Monedas:** solo aparece con un proveedor de pagos o de vídeos disponible. Nunca es la pestaña por defecto.

Cada precio en monedas deja hueco para «≈ X,XX €», que solo se ve con `pagos.disponible()`. Los textos no usan imperativos de compra.

## 2. Fuentes de monedas

| Fuente | Monedas | Disponible en la web |
|---|---|---|
| Partidas, reto diario y estrellas | las de la v2 | Sí |
| Pieza especial dorada colocada | +10 (en libre y en el reto; en los niveles da puntos y no monedas) | Sí |
| Vídeo de monedas | 60 cada 4 h | Solo con proveedor de vídeos |
| Paquetes de monedas | según el producto | Solo con proveedor de pagos |

## 3. Productos de dinero

Ids fijos. Los precios en euros los decide el usuario al activar los pagos.

| Id | Contenido | Límite |
|---|---|---|
| `monedas-1000` | 1.000 monedas | — |
| `monedas-3000` | 3.000 monedas | — |
| `monedas-8000` | 8.000 monedas | — |
| `pack-ayudas` | 3 relojes, 3 cementos y 3 corazones | Repetible, pero solo se ofrece si con él ningún objeto pasa de 9 |

Sin ofertas de una sola vez ni con cuenta atrás (se quitó el «lote de inicio» del plan, recorte R-8). Lo pagado nunca se recorta por el tope de 9: con 7 relojes, `pack-ayudas` no está disponible.

## 4. Interfaz `Pagos` (`src/juego/pagos.ts`)

- `disponible()`: si hay proveedor.
- `productos()`: lista de `{ id, centimos, moneda, texto }`. El precio va en céntimos y con la moneda, para poder mostrar el equivalente en euros junto a los precios en monedas.
- `comprar(id)`: resuelve `pagado` (con la transacción), `cancelado`, `error` o `pendiente`.

Implementaciones:

- `pagosNulos` (web): `disponible()` es `false` y no ofrece nada. `pagosDePlataforma(PUBLIC_PLATAFORMA)` la devuelve siempre, como `anunciosDePlataforma`.
- `pagosSimulados(confirmar)` (Vitest y compilación de demostración): los cuatro productos con precios de prueba (1,99, 4,99, 9,99 y 2,99 €, solo para enseñarlo; los de verdad los decide el usuario) y una transacción nueva en cada compra pagada. `confirmar` decide el resultado: en Vitest, uno fijo; en la demostración, la capa «Pago simulado» con «Pagar» y «Cancelar».

La implementación se elige en `src/juego/principal.ts` con `import.meta.env.MODE === "demo"` en el nivel superior del módulo, no con un argumento en tiempo de ejecución, para que el código de demostración (`src/juego/demo.ts`) no llegue a `dist/` (R14, lo comprueba `e2e/compilacion.spec.ts`). La compilación de demostración es `npm run build:demo` = `astro build --mode demo --outDir dist-demo` (las variables de entorno en `npm run` no funcionan en Windows sin otra dependencia); se minimiza igual que la web.

Los productos (qué da cada id) y la acreditación están en `src/logica/tienda.ts`: `PRODUCTOS`, `productoDisponible` (el pack, solo si cabe), `acreditarCompra` y `centimosPorMoneda`. El «≈ X,XX €» usa los céntimos por moneda del paquete de 1.000, el más caro por moneda, para que la cifra no se quede corta.

## 5. Reglas de acreditación

- `acreditarCompra` es pura: recibe el progreso y la transacción y devuelve el progreso nuevo.
- No acredita dos veces la misma transacción: busca su id en `compras.transacciones`.
- Cada compra acreditada se guarda como `{ id, producto, monedas, fecha }`, como mucho 50; `monedas` son las acreditadas de verdad (en el pack, las de las unidades que no cupieron). Así se sabe cuántas monedas compradas quedan sin gastar (desistimiento de 14 días de la moneda no usada, pautas de la red CPC de 2025).
- Se acredita con `Guardado.cambiar`, que ya resuelve dos pestañas abiertas.
- Nada pagado se recorta por topes. Si dos pestañas compran el pack a la vez y una unidad ya no cabe, esa unidad se acredita en monedas a su precio de la tienda.
- El pack desbloquea los tres objetos al acreditarse: lo pagado se puede usar ya, aunque aún no tocara por partidas.

## 6. Vídeos con premio

Usan la interfaz `Anuncios` de la v2: `recompensado("monedas" | "objeto" | "seguir")`. El premio solo se da con `"visto"`.

| Vídeo | Premio | Límite |
|---|---|---|
| Monedas (Tienda > Monedas) | 60 monedas | Uno cada 4 h |
| Objeto | 1 objeto de cualquier tipo | 1 al día |
| Seguir (en «¿Seguir?», solo en la partida libre) | 1 vida | 1 por partida |

La política está en `src/logica/recompensas.ts` (`MONEDAS_VIDEO`, `HORAS_VIDEO`, `videoMonedasDisponible`, `objetoVideoDisponible`, `cobrarVideoMonedas`, `cobrarObjetoVideo`), con la hora como parámetro, y se prueba con un reloj simulado. El día del objeto es el día UTC. Si la hora guardada es posterior a la actual (reloj atrasado), `corregirReloj` la rebaja a la actual al abrir la página: el vídeo vuelve como mucho 4 h después. Nunca hay vídeos en el reto diario (oficial ni repetición). «¿Seguir?» nunca ofrece dinero real ni enlaza a Monedas.

`anunciosSimulados(ver)` (`src/juego/anuncios.ts`) solo tiene vídeos con premio; `ver` decide el resultado. En la demostración es la capa «Vídeo de prueba» de 3 s: «Cerrar» antes de tiempo da `"cancelado"` y sin premio; al acabar, `"visto"`.

## 6 bis. Compilación de demostración

- `npm run build:demo` deja `dist-demo/` (en `.gitignore`), con la banda fija «Demostración: no se cobra nada y los vídeos son de prueba». **No se despliega nunca** (Decisión T21).
- Se ven la pestaña Monedas, el «≈ X,XX €» bajo cada precio en monedas, «Gratis con vídeo» en los objetos y «Ver vídeo» en «¿Seguir?». No hay ficha «Monedas gratis» en el inicio (recorte R-10).
- `npm run e2e` la compila y la sirve en el puerto 4330 (segundo `webServer` de `playwright.config.ts`, con `--ignore-lock`) y corre el proyecto `demo` (`e2e/demo.spec.ts`, 6 pruebas, solo escritorio).

## 7. Qué haría falta para activarlo

Fase posterior. Cada punto marcado **[usuario]** lo tiene que dar o decidir el usuario. Lo que ya está en el código y no hay que rehacer: las interfaces `Pagos` y `Anuncios`, los ids `monedas-1000`, `monedas-3000`, `monedas-8000` y `pack-ayudas`, la acreditación sin duplicados y la política de vídeos. Activar un proveedor es escribir su adaptador de `Pagos` o `Anuncios` y devolverlo en `pagosDePlataforma` o `anunciosDePlataforma` para su `PUBLIC_PLATAFORMA`.

1. **Elegir plataforma.** [usuario]
   - Web propia: Stripe Checkout más un Worker de Cloudflare con D1 para verificar el pago y registrar la transacción. Sin servidor, cualquiera podría acreditarse monedas; en un juego sin ranking importa poco, pero el cobro sí debe verificarse. Stripe no está en la tabla de herramientas de `ESTRATEGIA_PROYECTOS.md`: hace falta un motivo escrito antes de usarlo.
   - Portal: CrazyGames o Poki, según su SDK. Sin comprobar si admiten compras.
   - Móvil: Expo con la facturación de Google Play y App Store, que es obligatoria para bienes digitales en esas tiendas; cuotas de desarrollador de pago.
2. **Precios en euros** [usuario] de cada producto y su equivalencia visible en la tienda (pautas europeas de 2025). Los paquetes de 1.000, 3.000 y 8.000 no cuadran con precios de 120 a 250: las pautas lo señalan, hay que revisarlo.
3. **Restaurar compras.** Hoy todo vive en `localStorage`: si el jugador borra los datos del sitio, pierde lo pagado. Hace falta un servidor o un recibo (el servidor y su coste, [usuario]).
4. **Desistimiento de 14 días** de la moneda comprada y no usada (las transacciones ya guardan producto y monedas).
5. **Asesoría fiscal** [usuario]: IVA de servicios digitales a consumidores de la UE (régimen de ventanilla única) y facturación.
6. **Asesoría legal** [usuario]: condiciones de venta, renuncia expresa al desistimiento en contenido digital, menores, política de privacidad y, con anuncios, consentimiento y edad mínima para consentir en España (a revisar).
7. **Vídeos:** [usuario] cuenta en el portal o en AdSense o AdMob y adaptador de `Anuncios` en una compilación aparte (`anuncios.md`, apartado 5).
8. Cambiar el texto de «Privacidad» en Ajustes.
9. **Duplicados con más de 50 compras.** `acreditarCompra` solo mira las últimas `MAX_TRANSACCIONES` (50) transacciones guardadas: un id más antiguo que el proveedor volviera a mandar se acreditaría otra vez. Hará falta registrar los ids en el servidor o confirmar con el proveedor que cada transacción se entrega una sola vez.
10. **Pagos pendientes.** Con `"pendiente"` la Tienda dice «Pago pendiente de confirmar» y no guarda nada: si el pago se confirma después, nadie lo concilia ni lo acredita. Hará falta que el adaptador entregue las compras pendientes al abrir la página (o un aviso del servidor) y acreditarlas entonces con `acreditarCompra`.

## Fuentes (consultadas el 2026-11-09)

- [Baker McKenzie: principios de la red CPC sobre monedas virtuales](https://connectontech.bakermckenzie.com/european-consumer-protection-network-issues-new-key-principles-on-in-game-virtual-currencies-impact-for-gaming-and-gambling-entities-in-belgium-the-eu-and-beyond/)
- [Bird & Bird: protección del consumidor en videojuegos](https://www.twobirds.com/en/insights/2025/european-move-towards-protecting-users-from-harmful-practices-in-video-games-eu-consumer-protection)
- [PocketGamer.biz: transparencia en compras dentro del juego](https://www.pocketgamer.biz/new-eu-guidelines-demand-transparency-for-in-game-purchases)
