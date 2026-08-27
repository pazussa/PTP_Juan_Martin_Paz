export type CatalogModule = {
  readonly name: string;
  readonly path: string;
  readonly title: string;
};

export const catalogModules: readonly CatalogModule[] = [
  {
    name: 'Zapatos',
    path: '/categoria-producto/zapatos-mujer/',
    title: 'Zapatos – Bon-Bonite Sitio Oficial',
  },
  {
    name: 'Bolsos',
    path: '/categoria-producto/bolsos-mujer/',
    title: 'Bolsos – Bon-Bonite Sitio Oficial',
  },
  {
    name: 'Cinturones',
    path: '/categoria-producto/cinturones-mujer/',
    title: 'Cinturones – Bon-Bonite Sitio Oficial',
  },
  {
    name: 'Accesorios',
    path: '/categoria-producto/accesorios-mujer/',
    title: 'Accesorios – Bon-Bonite Sitio Oficial',
  },
  {
    name: 'Outlet',
    path: '/categoria-producto/outlet/',
    title: 'Outlet – Bon-Bonite Sitio Oficial',
  },
];
