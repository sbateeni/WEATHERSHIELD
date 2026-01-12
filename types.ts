
export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface WeatherData {
  temp: number;
  condition: string;
  location: string;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  visibility: string;
  timestamp: string;
  riskAnalysis: string; 
  infrastructureImpact: string;
  protocols: string[]; 
  forecast: { day: string; temp: string; condition: string }[];
  alerts: WeatherAlert[];
  sources: { title: string; uri: string }[];
  aqi?: { value: number; label: string; color: string };
  seismic?: { activity: string; magnitude?: number; nearest?: string };
}

export interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  type: string;
  timestamp: string; // الحقل الجديد للوقت والتاريخ الميلادي
}

export interface LocationState {
  lat: number | null;
  lng: number | null;
  address: string;
  loading: boolean;
  error: string | null;
}
