import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RideController } from "./ride.controller";
import { RideService } from "./ride.service";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      host: "localhost",
      port: 5433,
      username: "admin",
      password: "W3lc0m3_2026!",
      database: "vcabs",
      synchronize: true,
    }),
  ],
  controllers: [RideController],
  providers: [RideService],
})
export class AppModule {}
