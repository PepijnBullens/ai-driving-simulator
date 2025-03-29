const N = 300;
const MUTATION_DIFFERENCE = 0.1;
const CAR_PASSING_MAX = 4000;
const GAP_DIFFERENCE = 20;

//
//
//
//

const carCanvas = document.querySelector("#carCanvas");
carCanvas.width = 200;
const networkCanvas = document.querySelector("#networkCanvas");
networkCanvas.width = 300;

const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");

const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9);

let genCount = 0;
const genCountElement = document.querySelector("#genCount");
if (localStorage.getItem("genCount")) {
  genCount = localStorage.getItem("genCount");
}
genCountElement.textContent = genCount;

let oldBestY = 0;
if (localStorage.getItem("oldBestY")) {
  oldBestY = localStorage.getItem("oldBestY");
}

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

const TRAFFIC_HEIGHT = 5000;

const traffic = generateTraffic(TRAFFIC_HEIGHT);

function generateTraffic(height) {
  const traffic = [];
  const lanes = [0, 1, 2];
  let currentY = 0;

  while (currentY > -height) {
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    traffic.push(
      new Car(road.getLaneCenter(lane), currentY, 30, 50, "DUMMY", 2)
    );
    currentY -= Math.random() * 200 + 100; // Random spacing between 100 and 300
  }

  return traffic;
}

function save() {
  localStorage.setItem("bestBrain", JSON.stringify(bestCar.brain));
  localStorage.setItem("oldBestY", bestCar.y);
}

function newGen() {
  localStorage.setItem("genCount", parseInt(genCount) + 1);
  window.location.reload();
}

function discard() {
  localStorage.removeItem("bestBrain");
  localStorage.removeItem("oldBestY");
  localStorage.removeItem("genCount");
  window.location.reload();
}

function generateCars(N) {
  const cars = [];
  for (let i = 0; i < N; i++) {
    cars.push(new Car(road.getLaneCenter(1), 100, 30, 50, "AI"));
  }
  return cars;
}

let nextTrafficIndex = 0;
const orderedTraffic = [...traffic].sort((a, b) => a.y - b.y).reverse();

let carPassingTimeout = setTimeout(() => {
  newGen();
}, CAR_PASSING_MAX);

animate();

function animate(time) {
  for (let i = 0; i < traffic.length; i++) {
    traffic[i].update(road.borders, []);
  }
  for (let i = 0; i < cars.length; i++) {
    cars[i].update(road.borders, traffic);
  }

  bestCar = cars.find((c) => c.y == Math.min(...cars.map((c) => c.y)));
  const secondBestCar = cars.find(
    (c) =>
      c.y == Math.min(...cars.filter((car) => car !== bestCar).map((c) => c.y))
  );

  if (
    oldBestY > bestCar.y &&
    Math.abs(bestCar.y - secondBestCar.y) >= GAP_DIFFERENCE
  ) {
    save();
  }

  if (
    orderedTraffic[nextTrafficIndex] &&
    orderedTraffic[nextTrafficIndex].y > bestCar.y
  ) {
    clearTimeout(carPassingTimeout);
    carPassingTimeout = setTimeout(() => {
      newGen();
    }, CAR_PASSING_MAX);
    nextTrafficIndex++;
  }

  const nonDamagedCars = cars.filter((c) => c.damaged === false);
  if (nonDamagedCars.length === 0) {
    newGen();
  }

  carCanvas.height = window.innerHeight;
  networkCanvas.height = window.innerHeight;

  carCtx.save();
  carCtx.translate(0, -bestCar.y + carCanvas.height * 0.7);

  road.draw(carCtx);
  for (let i = 0; i < traffic.length; i++) {
    traffic[i].draw(carCtx, "red");
  }

  carCtx.globalAlpha = 0.2;
  for (let i = 0; i < cars.length; i++) {
    cars[i].draw(carCtx, "blue");
  }
  carCtx.globalAlpha = 1;
  bestCar.draw(carCtx, "blue", true);

  carCtx.restore();

  networkCtx.lineDashOffset = -time / 50;
  Visualizer.drawNetwork(networkCtx, bestCar.brain);

  requestAnimationFrame(animate);
}
