import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CroutonApiModule } from "@ghentcdh/crouton-api";
import { resolve } from "node:path";

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
  ],
})
export class AppModule {}
