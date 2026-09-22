CARRITO POR DISTRIBUIDORA:
- Un pedido = una sola distribuidora.
- Si el cliente quiere comprarle a 2 distribuidoras distintas,
  son 2 pedidos separados (2 checkouts, 2 pagos), uno por cada una.
- Si intenta agregar un producto de otra distribuidora al carrito,
  el sistema le avisa y le pregunta si quiere vaciar el carrito
  actual para agregar el nuevo.

DESCUENTO POR ENVASE DEVUELTO:
- Valor de arranque: $300 por cada bidón vacío devuelto
  (sin importar el tamaño/litros).


CRUM-22: Planificacion
1° Arreglar el carrito (una sola distribuidora a la vez) 
En inicio.js y productos.js: si intentás agregar un producto de una distribuidora distinta a la que ya tenés en el carrito, te avisa y te pregunta si querés vaciar el carrito.

2° Crear carrito.html: lista de productos + cantidad
Botón 'Pedido' del header, que hoy solo muestra una notificación con la cantidad, pasa a llevarte a esta página nueva.

3° Formulario de checkout en la misma página
Dirección de entrega (calle/número/ciudad/provincia/referencia), método de pago (solo los que esa distribuidora acepta), y cuántos envases vacíos vas a devolver.

4° Resumen con cálculo en vivo
Subtotal, descuento por envases ($300 c/u), total final — se recalcula solo mientras completás el formulario.

5° Confirmar pedido
Al confirmar: crea el pedido y sus detalles en la base, vacía el carrito, y te redirige (por ahora a productos.html con un mensaje de éxito — 'Mis Pedidos' lo armamos recién en SCRUM-23).
