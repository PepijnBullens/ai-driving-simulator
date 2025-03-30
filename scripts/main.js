// Constants
const N = 400;
const MUTATION_DIFFERENCE = 0.3;
const CAR_PASSING_MAX = 4000;
const TRAFFIC_HEIGHT = 3000;
const LANE_COUNT = 3;

const CANVAS_PADDING = 100;

// Canvas Setup
const carCanvas = document.querySelector("#carCanvas");
carCanvas.width = 200;
const networkCanvas = document.querySelector("#networkCanvas");
networkCanvas.width = 300;
const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");

// Road Setup
const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9, LANE_COUNT);

// Generation Tracking
let genCount = localStorage.getItem("genCount") || 0;
document.querySelector(
  "#genCount"
).textContent = `Generation Count: ${genCount}`;

let successfullGenCount = localStorage.getItem("successfulGenCount") || 0;
document.querySelector(
  "#successfulGenCount"
).textContent = `Successful Simulations: ${successfullGenCount}`;

document.querySelector("#nOfAI").textContent = `Number Of AI: ${N}`;
document.querySelector(
  "#trafficHeight"
).textContent = `Height Of Traffic: ${TRAFFIC_HEIGHT}`;
document.querySelector(
  "#mutationDifference"
).textContent = `Difference In Mutation: ${MUTATION_DIFFERENCE * 100}%`;

let successfullBlock = false;

// Car Setup
const cars = generateCars(N);
let bestCar = cars[0];
if (localStorage.getItem("bestBrain")) {
  for (let i = 0; i < cars.length; i++) {
    cars[i].brain = JSON.parse(localStorage.getItem("bestBrain"));
    if (i != 0) {
      NeuralNetwork.mutate(cars[i].brain, MUTATION_DIFFERENCE);
    }
  }
}

let hasManeuvered = localStorage.getItem("hasManeuvered") || false;

// Traffic Setup
const traffic = generateTraffic(TRAFFIC_HEIGHT);
let nextTrafficIndex = 0;
const orderedTraffic = [...traffic].sort((a, b) => b.y - a.y);
let carPassingTimeout = setTimeout(newGen, CAR_PASSING_MAX);

// Function Definitions
function generateCars(N) {
  return Array.from(
    { length: N },
    () => new Car(road.getLaneCenter(1), 100, 30, 50, "AI")
  );
}

function generateTraffic(height) {
  const traffic = [];
  let currentY = 0;
  while (currentY > -height) {
    const lane = [0, 1, 2][Math.floor(Math.random() * 3)];
    traffic.push(
      new Car(road.getLaneCenter(lane), currentY, 30, 50, "DUMMY", 2)
    );
    currentY -= Math.random() * 200 + 100; // Random spacing between 100 and 300
  }
  return traffic;
}

function getLane(x) {
  const laneWidth = road.width / LANE_COUNT;
  return Math.floor((x - road.left) / laneWidth);
}

function calculateFitness(car) {
  const progressFactor = -car.y; // Higher y means further progress
  const damagePenalty = car.damaged ? -1000 : 0; // Penalize damaged cars
  const speedFactor = car.speed || 0; // Reward higher speed
  return progressFactor + damagePenalty + speedFactor;
}

function successfulGeneration() {
  successfullBlock = true;
  localStorage.setItem("successfulGenCount", parseInt(successfullGenCount) + 1);
  discard();
}

function save(brain) {
  console.log("SAVING");
  localStorage.setItem("bestBrain", JSON.stringify(brain));
}

function newGen() {
  if (!window.reloadTimeout) {
    clearTimeout(carPassingTimeout);
    window.reloadTimeout = setTimeout(() => {
      localStorage.setItem("genCount", parseInt(genCount) + 1);
      window.location.reload();
      window.reloadTimeout = null;
    }, 1000);
  }
}

function discard() {
  ["bestBrain", "genCount", "hasManeuvered"].forEach((key) =>
    localStorage.removeItem(key)
  );
  window.location.reload();
}

function discardSuccessfullGens() {
  localStorage.removeItem("successfulGenCount");
  discard();
}

// Animation Loop
function animate(time) {
  const lastTrafficDummyY = Math.min(...traffic.map((dummy) => dummy.y));
  if (!successfullBlock && bestCar.y < lastTrafficDummyY)
    successfulGeneration();

  bestCar = cars.reduce(
    (best, car) =>
      calculateFitness(car) > calculateFitness(best) ? car : best,
    cars[0]
  );

  traffic.forEach((car) => car.update(road.borders, []));
  cars.forEach((car) => car.update(road.borders, traffic));

  if (orderedTraffic[nextTrafficIndex]) {
    const trafficCar = orderedTraffic[nextTrafficIndex];

    const bestCarLane = getLane(bestCar.x);
    const trafficLane = getLane(trafficCar.x);

    if (
      trafficCar.y < bestCar.y && // Traffic was ahead
      trafficLane === bestCarLane // Best car started in the same lane
    ) {
      bestCar.hadToManeuver = true; // Mark that a maneuver was required
      localStorage.setItem("hasManeuvered", true);
      hasManeuvered = true;
    }

    if (trafficCar.y > bestCar.y) {
      clearTimeout(carPassingTimeout);
      carPassingTimeout = setTimeout(newGen, CAR_PASSING_MAX);
      nextTrafficIndex++;

      if (bestCar.hadToManeuver) {
        localStorage.setItem("hasManeuvered", true);
        hasManeuvered = true;

        save(bestCar.brain); // Only save if maneuvering was required
        bestCar.hadToManeuver = false; // Reset for next check
      }
    }
  }

  if (!hasManeuvered) {
    save(bestCar.brain);
  }

  if (cars.every((car) => car.damaged)) newGen();

  // Canvas Adjustments
  carCanvas.height = window.innerHeight - CANVAS_PADDING;
  networkCanvas.height = window.innerHeight - CANVAS_PADDING;
  carCtx.save();
  carCtx.translate(0, -bestCar.y + carCanvas.height * 0.7);

  road.draw(carCtx);
  traffic.forEach((car) => car.draw(carCtx, "red"));

  carCtx.globalAlpha = 0.2;
  cars.forEach((car) => car.draw(carCtx, "blue"));
  carCtx.globalAlpha = 1;
  bestCar.draw(carCtx, "blue", true);
  carCtx.restore();

  networkCtx.lineDashOffset = -time / 50;
  Visualizer.drawNetwork(networkCtx, bestCar.brain);
  requestAnimationFrame(animate);
}

animate();
