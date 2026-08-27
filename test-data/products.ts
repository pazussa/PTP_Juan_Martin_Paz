/**
 * Producto del escenario de compra. Se eligió el bono de menor denominación por
 * ser el artículo estable más barato y no depender de talla, color ni
 * inventario, lo que hace la orden técnica reproducible.
 */
export const giftCard = {
  name: 'Bono de regalo - $50.000',
  amountLabel: '$50.000',
  /** Valor interno que el select de variación adopta al elegir la denominación. */
  amountValue: '50-000',
  categoryPath: '/categoria-producto/bonos-de-regalo/',
  productPath: '/producto/bono-de-regalo/',
} as const;
