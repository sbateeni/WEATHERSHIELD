
import { LocationState } from "../types";

const DB_NAME = "WeatherShieldDB";
const STORE_NAME = "settings";
const LOCATION_KEY = "lastLocation";

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveLocation = async (location: Partial<LocationState>) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    // نكتفي بتخزين الإحداثيات والاسم فقط لتجنب تخزين حالات التحميل والأخطاء
    store.put({
      lat: location.lat,
      lng: location.lng,
      address: location.address
    }, LOCATION_KEY);
  } catch (error) {
    console.error("IndexedDB Save Error:", error);
  }
};

export const getSavedLocation = async (): Promise<Partial<LocationState> | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(LOCATION_KEY);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (error) {
    console.error("IndexedDB Load Error:", error);
    return null;
  }
};
