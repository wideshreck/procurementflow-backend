export const PERMISSIONS_CONFIG = [
  {
    module: "Kullanıcılar",
    permissions: [
      { id: "users:list", label: "Listele" },
      { id: "users:read", label: "Görüntüle" },
      { id: "users:create", label: "Oluştur" },
      { id: "users:update", label: "Güncelle" },
      { id: "users:delete", label: "Sil" },
      { id: "users:update-role", label: "Rol Güncelle" },
    ],
  },
  {
    module: "Kategoriler",
    permissions: [
      { id: "categories:create", label: "Oluştur" },
      { id: "categories:edit", label: "Düzenle" },
      { id: "categories:read", label: "Görüntüle" },
      { id: "categories:delete", label: "Sil" },
    ],
  },
  {
    module: "Maliyet Merkezleri",
    permissions: [
      { id: "cost-centers:list", label: "Listele" },
      { id: "cost-centers:create", label: "Oluştur" },
      { id: "cost-centers:update", label: "Güncelle" },
      { id: "cost-centers:delete", label: "Sil" },
    ],
  },
  {
    module: "Departmanlar",
    permissions: [
      { id: "departments:create", label: "Oluştur" },
      { id: "departments:update", label: "Güncelle" },
      { id: "departments:delete", label: "Sil" },
    ],
  },
  {
    module: "Lokasyonlar",
    permissions: [
      { id: "locations:create", label: "Oluştur" },
      { id: "locations:update", label: "Güncelle" },
      { id: "locations:delete", label: "Sil" },
      { id: "locations:read", label: "Görüntüle" },
    ],
  },
  {
    module: "Tedarikçiler",
    permissions: [{ id: "suppliers:list", label: "Listele" }],
  },
  {
    module: "Onay Süreçleri",
    permissions: [{ id: "approval-processes:edit", label: "Düzenle" }],
  },
  {
    module: "Alım Talepleri",
    permissions: [
      { id: "requests:create", label: "Oluştur" },
      { id: "requests:list", label: "Listele" },
      { id: "requests:debug", label: "Hata Ayıkla" },
    ],
  },
  {
    module: "Özel Roller",
    permissions: [{ id: "custom-roles:list", label: "Listele" }],
  },
  {
    module: "Sistem",
    permissions: [{ id: "auth:debug", label: "Hata Ayıkla" }],
  },
];

export const ALL_PERMISSIONS = PERMISSIONS_CONFIG.flatMap(module =>
  module.permissions.map(permission => permission.id)
);
