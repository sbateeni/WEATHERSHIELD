
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WeatherData, AlertSeverity } from "../types";
import { RawWeatherData } from "./weatherApiService";

const getApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || process.env.API_KEY;
  }
  return process.env.GEMINI_API_KEY || process.env.API_KEY;
};

const getAI = () => {
  const key = getApiKey();
  if (!key) throw new Error('Missing Gemini API key. Set it in Settings or as an environment variable.');
  return new GoogleGenAI({ apiKey: key });
};

export const resolveLocationCoords = async (query: string): Promise<{ lat: number, lng: number, name: string }> => {
  const prompt = `حول الموقع التالي إلى إحداثيات واسم رسمي بالعربية: "${query}". أجب بتنسيق JSON فقط.`;
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            name: { type: Type.STRING }
          },
          required: ["lat", "lng", "name"]
        }
      },
    });
    return JSON.parse(response.text);
  } catch (error) {
    throw new Error("فشل تحديد الموقع.");
  }
};

export const fetchLiveWeatherData = async (lat: number, lng: number, rawData: RawWeatherData): Promise<WeatherData> => {
  const prompt = `أنت "الخبير الاستراتيجي لدرع الطقس والأمن القومي". حلل البيانات التالية:
  - الطقس: ${rawData.temp}°م، رياح ${rawData.windSpeed} كم/س.
  - جودة الهواء (AQI): ${rawData.aqi} (مؤشر أمريكي).
  - النشاط الزلزالي القريب: ${rawData.seismicData.activity} (${rawData.seismicData.magnitude || 'لا يوجد'} ريختر).
  - التوقيت الحالي: ${new Date().toLocaleString('en-GB')}.

  المهمة:
  1. حلل التفاعل بين هذه العوامل.
  2. قدم بروتوكولات حماية.
  3. لكل إنذار (alert)، أضف حقلاً باسم "timestamp" يحتوي على التاريخ والوقت الميلادي بصيغة (YYYY-MM-DD HH:mm).
  أجب بتنسيق JSON حصراً وباللغة العربية.`;

  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            condition: { type: Type.STRING },
            location: { type: Type.STRING },
            riskAnalysis: { type: Type.STRING },
            infrastructureImpact: { type: Type.STRING },
            protocols: { type: Type.ARRAY, items: { type: Type.STRING } },
            forecast: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  temp: { type: Type.STRING },
                  condition: { type: Type.STRING }
                },
                required: ["day", "temp", "condition"]
              }
            },
            alerts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
                  type: { type: Type.STRING },
                  timestamp: { type: Type.STRING }
                },
                required: ["id", "title", "description", "severity", "type", "timestamp"]
              }
            }
          },
          required: ["condition", "location", "riskAnalysis", "infrastructureImpact", "protocols", "forecast", "alerts"]
        }
      },
    });

    const result = JSON.parse(response.text);
    
    let aqiLabel = "جيد";
    let aqiColor = "#22c55e";
    if (rawData.aqi > 150) { aqiLabel = "خطر جداً"; aqiColor = "#ef4444"; }
    else if (rawData.aqi > 100) { aqiLabel = "غير صحي"; aqiColor = "#f97316"; }
    else if (rawData.aqi > 50) { aqiLabel = "متوسط"; aqiColor = "#eab308"; }

    return {
      ...result,
      temp: rawData.temp,
      humidity: rawData.humidity,
      windSpeed: rawData.windSpeed,
      windDirection: `${rawData.windDirection}°`,
      visibility: `${(rawData.visibility / 1000).toFixed(1)} كم`,
      timestamp: new Date().toLocaleTimeString('ar-SA'),
      aqi: { value: rawData.aqi, label: aqiLabel, color: aqiColor },
      seismic: rawData.seismicData,
      sources: []
    };
  } catch (error) {
    throw error;
  }
};

export const generateVoiceAlert = async (text: string): Promise<string | null> => {
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `تنبيه أمني عاجل: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }
          }
        }
      }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    return null;
  }
};
