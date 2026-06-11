export type DataSourceJsonConfig = {
  type: string;
  name: string;
  default?: boolean;
};

export type DataSourceEntry = {
  config: DataSourceJsonConfig;
  client: any; // PrismaClient from any generated schema
};
