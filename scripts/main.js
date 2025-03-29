const carCanvas = document.querySelector("#carCanvas");
carCanvas.width = 200;
const networkCanvas = document.querySelector("#networkCanvas");
networkCanvas.width = 300;

const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");

const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9);

const N = 200;
const MDIFFERENCE = 0.2;
const MDELAY = 60;
const GAPDIFFERENCE = 10;

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
      NeuralNetwork.mutate(cars[i].brain, MDIFFERENCE);
    }
  }
}

const traffic = [
  new Car(road.getLaneCenter(0), -300, 30, 50, "DUMMY", 2),
  new Car(road.getLaneCenter(1), -100, 30, 50, "DUMMY", 2),
  new Car(road.getLaneCenter(2), -300, 30, 50, "DUMMY", 2),

  new Car(road.getLaneCenter(1), -500, 30, 50, "DUMMY", 2),
  new Car(road.getLaneCenter(0), -500, 30, 50, "DUMMY", 2),

  new Car(road.getLaneCenter(2), -700, 30, 50, "DUMMY", 2),
  new Car(road.getLaneCenter(0), -800, 30, 50, "DUMMY", 2),

  new Car(road.getLaneCenter(0), -1200, 30, 50, "DUMMY", 2),
  new Car(road.getLaneCenter(1), -1000, 30, 50, "DUMMY", 2),
  new Car(road.getLaneCenter(2), -1200, 30, 50, "DUMMY", 2),
];

animate();

setTimeout(() => {
  save();
}, MDELAY * 1000);

function save() {
  localStorage.setItem("bestBrain", JSON.stringify(bestCar.brain));
  localStorage.setItem("oldBestY", bestCar.y);
  window.location.reload();
}

function discard() {
  localStorage.removeItem("bestBrain");
  localStorage.removeItem("oldBestY");
  window.location.reload();
}

function generateCars(N) {
  const cars = [];
  for (let i = 0; i < N; i++) {
    cars.push(new Car(road.getLaneCenter(1), 100, 30, 50, "AI"));
  }
  return cars;
}

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
    Math.abs(bestCar.y - secondBestCar.y) >= GAPDIFFERENCE
  ) {
    save();
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
