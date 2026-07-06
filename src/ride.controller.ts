import { Controller, Post, Body, Param, Inject } from "@nestjs/common";
import { RideService } from "./ride.service";

@Controller()
export class RideController {
  // Direct, metadata-independent injection fallback
  constructor(@Inject(RideService) private readonly rideService: RideService) {}

  @Post("drivers/location")
  async updateLocation(
    @Body() body: { driverId: string; lon: number; lat: number },
  ) {
    return this.rideService.updateDriverLocation(
      body.driverId,
      body.lon,
      body.lat,
    );
  }

  @Post("rides")
  async createRide(@Body() body: { lon: number; lat: number }) {
    return this.rideService.createRideRequest(body.lon, body.lat);
  }

  @Post("rides/:id/accept")
  async acceptRide(
    @Param("id") rideId: string,
    @Body() body: { driverId: string },
  ) {
    return this.rideService.acceptRide(rideId, body.driverId);
  }
}
