
export interface RawWeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  apparentTemp: number;
  weatherCode: number;
  aqi: number; // Air Quality Index
  seismicData: { activity: string; magnitude?: number; nearest?: string };
  daily: {
    maxTemp: number[];
    minTemp: number[];
    time: string[];
    weatherCode: number[];
  };
}

export const fetchOpenMeteoData = async (lat: number, lng: number): Promise<RawWeatherData> => {
  // جلب بيانات الطقس + جودة الهواء في طلبات متوازية
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
  const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi`;
  const earthquakeUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lng}&maxradiuskm=500&limit=1`;

  try {
    const [wRes, aRes, eRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(airQualityUrl),
      fetch(earthquakeUrl)
    ]);

    const wData = await wRes.json();
    const aData = await aRes.json();
    const eData = await eRes.json();

    // Fix: Explicitly type seismic variable to match RawWeatherData['seismicData'] structure
    let seismic: { activity: string; magnitude?: number; nearest?: string } = { activity: "مستقر" };
    if (eData.features && eData.features.length > 0) {
      const feat = eData.features[0].properties;
      seismic = {
        activity: "نشاط مرصود",
        magnitude: feat.mag,
        nearest: feat.place
      };
    }

    return {
      temp: wData.current.temperature_2m,
      humidity: wData.current.relative_humidity_2m,
      windSpeed: wData.current.wind_speed_10m,
      windDirection: wData.current.wind_direction_10m,
      visibility: wData.current.visibility,
      apparentTemp: wData.current.apparent_temperature,
      weatherCode: wData.current.weather_code,
      aqi: aData.current.us_aqi,
      seismicData: seismic,
      daily: {
        maxTemp: wData.daily.temperature_2m_max,
        minTemp: wData.daily.temperature_2m_min,
        time: wData.daily.time,
        weatherCode: wData.daily.weather_code
      }
    };
  } catch (error) {
    throw new Error("فشل جلب البيانات المتكاملة.");
  }
};
