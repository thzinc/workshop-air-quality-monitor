const axios = require("axios");

module.exports = class Client {
  #client;
  #timeout;
  #sleepMs;
  #pm2_5Density = 0;
  #pm10Density = 0;
  #vocDensity = 0;
  #temperatureC = 0;
  #relativeHumidityPct = 0;

  constructor({ baseURL, sleepMs = 1000 }) {
    this.#sleepMs = sleepMs;
    this.#client = axios.create({
      baseURL: baseURL,
    });
  }

  start() {
    this.#timeout = setTimeout(() => this.#doInterval(), 0);
  }

  stop() {
    cancelTimeout(this.#timeout);
  }

  get pm2_5Density() {
    return this.#pm2_5Density;
  }

  /**
   * PM2.5 air quality HomeKit categories with ranges adapted from AirNow.gov guidelines
   * https://www.airnow.gov/sites/default/files/2020-05/aqi-technical-assistance-document-sept2018.pdf
   */
  get pm2_5Quality() {
    if (this.#pm2_5Density < 12.1) return 1;
    if (this.#pm2_5Density < 35.5) return 2;
    if (this.#pm2_5Density < 55.5) return 3;
    if (this.#pm2_5Density < 150.5) return 4;
    return 5;
  }

  get pm10Density() {
    return this.#pm10Density;
  }

  /**
   * PM10 air quality HomeKit categories with ranges adapted from AirNow.gov guidelines
   * https://www.airnow.gov/sites/default/files/2020-05/aqi-technical-assistance-document-sept2018.pdf
   */
  get pm10Quality() {
    if (this.#pm10Density < 55) return 1;
    if (this.#pm10Density < 155) return 2;
    if (this.#pm10Density < 255) return 3;
    if (this.#pm10Density < 355) return 4;
    return 5;
  }

  get vocDensity() {
    return this.#vocDensity;
  }

  /**
   * (Total) VOC air quality HomeKit categories with ranges adapted from Sensiron's table of values adapted from WHO's standards
   */
  get vocQuality() {
    if (this.#vocDensity < 250) return 1;
    if (this.#vocDensity < 500) return 2;
    if (this.#vocDensity < 1000) return 3;
    if (this.#vocDensity < 3000) return 4;
    return 5;
  }

  get temperatureC() {
    return this.#temperatureC;
  }
  get relativeHumidityPct() {
    return this.#relativeHumidityPct;
  }

  async #doInterval() {
    const {
      ['pm_concentration{source="plantowerpms5003",upper_bound_size="2.5 µm"}']:
        pm2_5Density,
      ['pm_concentration{source="plantowerpms5003",upper_bound_size="10 µm"}']:
        pm10Density,
      ['gas_concentration{gas="TVOC",source="sensironsgp30"}']: vocDensity,
      ['temperature{source="asairaht10"}']: temperatureC,
      ['relative_humidity{source="asairaht10"}']: relativeHumidityPct,
    } = await this.#metrics();

    this.#pm2_5Density = pm2_5Density;
    this.#pm10Density = pm10Density;
    this.#vocDensity = vocDensity * 4.5; // Sensiron conversion from ppb to mcg/m^3
    this.#temperatureC = temperatureC;
    this.#relativeHumidityPct = relativeHumidityPct * 100; // Convert from 0..1 to 0..100

    this.#timeout = setTimeout(() => this.#doInterval(), this.#sleepMs);
  }

  async #metrics() {
    const { data } = await this.#client.get("", {
      responseType: "text",
    });

    return data
      .split("\n")
      .filter((line) => !line.startsWith("#"))
      .map((line) => {
        const parts = line.split(" ");
        return {
          key: parts.slice(0, -1).join(" "),
          value: parseFloat(parts.slice(-1)[0]),
        };
      })
      .reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
  }
};
