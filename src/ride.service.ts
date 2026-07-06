import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import Redis from "ioredis";

@Injectable()
export class RideService {
  private redisClient: Redis;

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {
    this.redisClient = new Redis({
      host: "localhost",
      port: 6379,
      password: "qw3rty@2026",
    });
  }

  async updateDriverLocation(
    driverId: string,
    longitude: number,
    latitude: number,
  ) {
    await this.redisClient.geoadd("drivers_gps", longitude, latitude, driverId);
    return { success: true };
  }

  async createRideRequest(longitude: number, latitude: number) {
    const [ride] = await this.entityManager.query(
      `INSERT INTO rides (status) VALUES ('SEARCHING') RETURNING id, status`,
    );

    const nearbyDrivers = await this.redisClient.geosearch(
      "drivers_gps",
      "FROMLONLAT",
      longitude,
      latitude,
      "BYRADIUS",
      5,
      "km",
    );

    console.log(
      `[Notification Engine] Ride ${ride.id} broadcasted to drivers: ${nearbyDrivers.join(", ")}`,
    );

    return {
      rideId: ride.id,
      status: ride.status,
      notifiedDrivers: nearbyDrivers,
    };
  }

  async acceptRide(rideId: string, driverId: string) {
    const lockKey = `lock:ride:${rideId}`;
    const acquired = await this.redisClient.set(
      lockKey,
      driverId,
      "NX",
      "EX",
      30,
    );

    if (!acquired) {
      const currentWinner = await this.redisClient.get(lockKey);
      if (currentWinner === driverId) {
        return {
          success: true,
          message: "You have already accepted this ride.",
        };
      }
      throw new HttpException(
        "Race lost. Ride already assigned to another driver.",
        HttpStatus.CONFLICT,
      );
    }

    await this.entityManager.query(
      `UPDATE rides SET driver_id = $1, status = 'ASSIGNED' WHERE id = $2`,
      [driverId, rideId],
    );

    return { success: true, message: "Ride successfully assigned to you." };
  }
}
