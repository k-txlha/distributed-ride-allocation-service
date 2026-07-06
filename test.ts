import axios from "axios";

async function verifyConcurrency() {
  const BASE_URL = "http://localhost:3000/api";

  console.log("🤖 Step 1: Seeding active drivers locations...");
  const drivers = [
    "driver_alpha",
    "driver_beta",
    "driver_gamma",
    "driver_omega",
  ];
  for (const driver of drivers) {
    await axios.post(`${BASE_URL}/drivers/location`, {
      driverId: driver,
      lon: 72.8777,
      lat: 19.076,
    });
  }

  console.log("🤖 Step 2: Creating a ride request...");
  const rideRes = await axios.post(`${BASE_URL}/rides`, {
    lon: 72.8777,
    lat: 19.076,
  });
  const rideId = rideRes.data.rideId;
  console.log(`Ride created with ID: ${rideId}`);

  console.log("⚡ Step 3: Simulating SIMULTANEOUS ride acceptance race...");
  const requests = drivers.map((driverId) =>
    axios
      .post(`${BASE_URL}/rides/${rideId}/accept`, { driverId })
      .then((res) => ({
        driverId,
        status: "SUCCESS",
        message: res.data.message,
      }))
      .catch((err) => ({
        driverId,
        status: "FAILED",
        message: err.response?.data?.message || err.message,
      })),
  );

  const outcomes = await Promise.all(requests);

  console.log("\n--- Race Results ---");
  outcomes.forEach((o: any) =>
    console.log(`Driver: ${o.driverId} -> Status: ${o.status} (${o.message})`),
  );

  const successCount = outcomes.filter(
    (o: any) => o.status === "SUCCESS",
  ).length;
  if (successCount === 1) {
    console.log(
      "\n✅ VERIFICATION PASSED: Atomic lock functioning. Exactly 1 driver assigned.",
    );
  } else {
    console.log("\n❌ VERIFICATION FAILED: Race condition leaked!");
  }
}

verifyConcurrency();
