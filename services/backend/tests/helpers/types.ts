export type ListEnvelope<T> = {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
};

export type MenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  itemCount: number;
};

export type OpenApiDocument = {
  paths: Record<string, unknown>;
  servers: { url: string }[];
  components: { schemas: Record<string, any> };
};
