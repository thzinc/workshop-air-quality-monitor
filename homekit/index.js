const hap = require("hap-nodejs");
const os = require("os");
const Client = require("./Client");

const { Accessory, Characteristic, CharacteristicEventTypes, Service, uuid } =
  hap;

const {
  API_BASE_URL: baseURL,
  METRICS_SLEEP_MS: sleepMs = 1000,
  HOMEKIT_PIN_CODE: pincode,
  HOMEKIT_INTERFACE: networkInterface = "eth0",
  HOMEKIT_PORT: port = 47129,
} = process.env;
const client = new Client({ baseURL, sleepMs });
client.start();

async function initializeAccessories() {
  const monitorUuid = uuid.generate("com.thzinc.workshop-air-quality-monitor");
  const monitorAccessory = new Accessory(
    "Workshop Air Quality Monitor",
    monitorUuid
  );

  const airQualitySensorService = new Service.AirQualitySensor(
    "Air Quality Sensor"
  );
  airQualitySensorService
    .getCharacteristic(Characteristic.AirQuality)
    .on(CharacteristicEventTypes.GET, (callback) => {
      callback(
        undefined,
        Math.max(client.pm2_5Quality, client.pm10Quality, client.vocQuality)
      );
    });
  airQualitySensorService
    .getCharacteristic(Characteristic.PM2_5Density)
    .on(CharacteristicEventTypes.GET, (callback) => {
      callback(undefined, client.pm2_5Density);
    });
  airQualitySensorService
    .getCharacteristic(Characteristic.PM10Density)
    .on(CharacteristicEventTypes.GET, (callback) => {
      callback(undefined, client.pm10Density);
    });
  airQualitySensorService
    .getCharacteristic(Characteristic.VOCDensity)
    .on(CharacteristicEventTypes.GET, (callback) => {
      callback(undefined, client.vocDensity);
    });
  monitorAccessory.addService(airQualitySensorService);

  const temperatureService = new Service.TemperatureSensor(
    "Temperature Sensor"
  );
  temperatureService
    .getCharacteristic(Characteristic.CurrentTemperature)
    .on(CharacteristicEventTypes.GET, (callback) => {
      callback(undefined, client.temperatureC);
    });
  monitorAccessory.addService(temperatureService);

  const humidityService = new Service.HumiditySensor("Humidity Sensor");
  humidityService
    .getCharacteristic(Characteristic.CurrentRelativeHumidity)
    .on(CharacteristicEventTypes.GET, (callback) => {
      callback(undefined, client.relativeHumidityPct);
    });
  monitorAccessory.addService(humidityService);

  const [{ mac }] = os.networkInterfaces()[networkInterface];
  const accessoryInfo = {
    username: mac,
    pincode,
    port,
    category: hap.Categories.BRIDGE,
  };
  console.log("Publishing HomeKit accessory", accessoryInfo);
  monitorAccessory.publish(accessoryInfo);
}

initializeAccessories();
