import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CroutonApiModule } from "@ghentcdh/crouton-api";
import { resolve } from "node:path";
import { AnnotationApiModule } from "@ghentcdh/annotation-api";
import { TextApiModule } from "./text/TextApi.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    CroutonApiModule.forResourceDir(
      resolve(__dirname, "resources"),
      resolve(__dirname, "data-sources"),
      {
        baseUrl: "",
      },
    ),
    AnnotationApiModule.forResourceDir(resolve(__dirname, "annotations"), {
      baseUrl: process.env.API_URL,
      cacheTTLms: 0,
      isDev: false,
      app: process.env.ANNOTATION_APP ?? "mela",
      prefix: process.env.ANNOTATION_PREFIX ?? "mela",
    }),
    TextApiModule,
  ],
})
export class AppModule {}
