// Major world airports for search functionality
// Format: ICAO code -> { iata, name, city, country, lat, lon }

export interface Airport {
  icao: string
  iata: string
  name: string
  city: string
  country: string
  lat: number
  lon: number
}

export const AIRPORTS: Record<string, Airport> = {
  // United States - Major Hubs
  KATL: { icao: 'KATL', iata: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta', country: 'US', lat: 33.6367, lon: -84.4281 },
  KLAX: { icao: 'KLAX', iata: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'US', lat: 33.9425, lon: -118.4081 },
  KORD: { icao: 'KORD', iata: 'ORD', name: "O'Hare International", city: 'Chicago', country: 'US', lat: 41.9742, lon: -87.9073 },
  KDFW: { icao: 'KDFW', iata: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', country: 'US', lat: 32.8998, lon: -97.0403 },
  KDEN: { icao: 'KDEN', iata: 'DEN', name: 'Denver International', city: 'Denver', country: 'US', lat: 39.8561, lon: -104.6737 },
  KJFK: { icao: 'KJFK', iata: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'US', lat: 40.6413, lon: -73.7781 },
  KSFO: { icao: 'KSFO', iata: 'SFO', name: 'San Francisco International', city: 'San Francisco', country: 'US', lat: 37.6213, lon: -122.379 },
  KLAS: { icao: 'KLAS', iata: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', country: 'US', lat: 36.08, lon: -115.1522 },
  KMIA: { icao: 'KMIA', iata: 'MIA', name: 'Miami International', city: 'Miami', country: 'US', lat: 25.7959, lon: -80.287 },
  KSEA: { icao: 'KSEA', iata: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', country: 'US', lat: 47.4502, lon: -122.3088 },
  KEWR: { icao: 'KEWR', iata: 'EWR', name: 'Newark Liberty International', city: 'Newark', country: 'US', lat: 40.6895, lon: -74.1745 },
  KMCO: { icao: 'KMCO', iata: 'MCO', name: 'Orlando International', city: 'Orlando', country: 'US', lat: 28.4312, lon: -81.308 },
  KBOS: { icao: 'KBOS', iata: 'BOS', name: 'Boston Logan International', city: 'Boston', country: 'US', lat: 42.3656, lon: -71.0096 },
  KPHX: { icao: 'KPHX', iata: 'PHX', name: 'Phoenix Sky Harbor International', city: 'Phoenix', country: 'US', lat: 33.4373, lon: -112.0078 },
  KIAD: { icao: 'KIAD', iata: 'IAD', name: 'Washington Dulles International', city: 'Washington D.C.', country: 'US', lat: 38.9531, lon: -77.4565 },
  KDCA: { icao: 'KDCA', iata: 'DCA', name: 'Ronald Reagan Washington National', city: 'Washington D.C.', country: 'US', lat: 38.8521, lon: -77.0377 },

  // Europe
  EGLL: { icao: 'EGLL', iata: 'LHR', name: 'London Heathrow', city: 'London', country: 'GB', lat: 51.47, lon: -0.4543 },
  EGKK: { icao: 'EGKK', iata: 'LGW', name: 'London Gatwick', city: 'London', country: 'GB', lat: 51.1537, lon: -0.1821 },
  LFPG: { icao: 'LFPG', iata: 'CDG', name: 'Paris Charles de Gaulle', city: 'Paris', country: 'FR', lat: 49.0097, lon: 2.5479 },
  EDDF: { icao: 'EDDF', iata: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'DE', lat: 50.0379, lon: 8.5622 },
  EHAM: { icao: 'EHAM', iata: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'NL', lat: 52.3105, lon: 4.7683 },
  LEMD: { icao: 'LEMD', iata: 'MAD', name: 'Madrid Barajas', city: 'Madrid', country: 'ES', lat: 40.4983, lon: -3.5676 },
  LIRF: { icao: 'LIRF', iata: 'FCO', name: 'Rome Fiumicino', city: 'Rome', country: 'IT', lat: 41.8003, lon: 12.2389 },
  EDDM: { icao: 'EDDM', iata: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'DE', lat: 48.3538, lon: 11.775 },
  LEBL: { icao: 'LEBL', iata: 'BCN', name: 'Barcelona El Prat', city: 'Barcelona', country: 'ES', lat: 41.2974, lon: 2.0833 },
  EGSS: { icao: 'EGSS', iata: 'STN', name: 'London Stansted', city: 'London', country: 'GB', lat: 51.885, lon: 0.235 },
  LSZH: { icao: 'LSZH', iata: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'CH', lat: 47.4647, lon: 8.5492 },
  LOWW: { icao: 'LOWW', iata: 'VIE', name: 'Vienna International', city: 'Vienna', country: 'AT', lat: 48.1103, lon: 16.5697 },
  EKCH: { icao: 'EKCH', iata: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'DK', lat: 55.618, lon: 12.656 },
  EIDW: { icao: 'EIDW', iata: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'IE', lat: 53.4264, lon: -6.2499 },
  ESSA: { icao: 'ESSA', iata: 'ARN', name: 'Stockholm Arlanda', city: 'Stockholm', country: 'SE', lat: 59.6519, lon: 17.9186 },
  ENGM: { icao: 'ENGM', iata: 'OSL', name: 'Oslo Gardermoen', city: 'Oslo', country: 'NO', lat: 60.1939, lon: 11.1004 },
  EFHK: { icao: 'EFHK', iata: 'HEL', name: 'Helsinki Vantaa', city: 'Helsinki', country: 'FI', lat: 60.3172, lon: 24.9633 },
  LPPT: { icao: 'LPPT', iata: 'LIS', name: 'Lisbon Portela', city: 'Lisbon', country: 'PT', lat: 38.7813, lon: -9.1359 },
  EBBR: { icao: 'EBBR', iata: 'BRU', name: 'Brussels Airport', city: 'Brussels', country: 'BE', lat: 50.9014, lon: 4.4844 },
  UUEE: { icao: 'UUEE', iata: 'SVO', name: 'Moscow Sheremetyevo', city: 'Moscow', country: 'RU', lat: 55.9726, lon: 37.4146 },
  LTFM: { icao: 'LTFM', iata: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'TR', lat: 41.2608, lon: 28.7419 },

  // Asia Pacific
  VHHH: { icao: 'VHHH', iata: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'HK', lat: 22.3089, lon: 113.9146 },
  WSSS: { icao: 'WSSS', iata: 'SIN', name: 'Singapore Changi', city: 'Singapore', country: 'SG', lat: 1.3644, lon: 103.9915 },
  RJTT: { icao: 'RJTT', iata: 'HND', name: 'Tokyo Haneda', city: 'Tokyo', country: 'JP', lat: 35.5494, lon: 139.7798 },
  RJAA: { icao: 'RJAA', iata: 'NRT', name: 'Tokyo Narita', city: 'Tokyo', country: 'JP', lat: 35.7647, lon: 140.3864 },
  RKSI: { icao: 'RKSI', iata: 'ICN', name: 'Seoul Incheon', city: 'Seoul', country: 'KR', lat: 37.4691, lon: 126.4505 },
  ZBAA: { icao: 'ZBAA', iata: 'PEK', name: 'Beijing Capital', city: 'Beijing', country: 'CN', lat: 40.0801, lon: 116.5846 },
  ZSPD: { icao: 'ZSPD', iata: 'PVG', name: 'Shanghai Pudong', city: 'Shanghai', country: 'CN', lat: 31.1434, lon: 121.8052 },
  VTBS: { icao: 'VTBS', iata: 'BKK', name: 'Bangkok Suvarnabhumi', city: 'Bangkok', country: 'TH', lat: 13.6811, lon: 100.7472 },
  WMKK: { icao: 'WMKK', iata: 'KUL', name: 'Kuala Lumpur International', city: 'Kuala Lumpur', country: 'MY', lat: 2.7456, lon: 101.7099 },
  YSSY: { icao: 'YSSY', iata: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'AU', lat: -33.9461, lon: 151.1772 },
  YMML: { icao: 'YMML', iata: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'AU', lat: -37.6733, lon: 144.8433 },
  NZAA: { icao: 'NZAA', iata: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'NZ', lat: -37.0082, lon: 174.7917 },
  VABB: { icao: 'VABB', iata: 'BOM', name: 'Chhatrapati Shivaji Maharaj International', city: 'Mumbai', country: 'IN', lat: 19.0896, lon: 72.8656 },
  VIDP: { icao: 'VIDP', iata: 'DEL', name: 'Indira Gandhi International', city: 'Delhi', country: 'IN', lat: 28.5562, lon: 77.1 },
  RPLL: { icao: 'RPLL', iata: 'MNL', name: 'Ninoy Aquino International', city: 'Manila', country: 'PH', lat: 14.5086, lon: 121.0197 },
  WIII: { icao: 'WIII', iata: 'CGK', name: 'Soekarno-Hatta International', city: 'Jakarta', country: 'ID', lat: -6.1256, lon: 106.6559 },
  VVNB: { icao: 'VVNB', iata: 'HAN', name: 'Noi Bai International', city: 'Hanoi', country: 'VN', lat: 21.2212, lon: 105.807 },

  // Middle East
  OMDB: { icao: 'OMDB', iata: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'AE', lat: 25.2532, lon: 55.3657 },
  OERK: { icao: 'OERK', iata: 'RUH', name: 'King Khalid International', city: 'Riyadh', country: 'SA', lat: 24.9576, lon: 46.6988 },
  OTHH: { icao: 'OTHH', iata: 'DOH', name: 'Hamad International', city: 'Doha', country: 'QA', lat: 25.2731, lon: 51.6081 },
  OBBI: { icao: 'OBBI', iata: 'BAH', name: 'Bahrain International', city: 'Manama', country: 'BH', lat: 26.2708, lon: 50.6336 },
  OOMS: { icao: 'OOMS', iata: 'MCT', name: 'Muscat International', city: 'Muscat', country: 'OM', lat: 23.5933, lon: 58.2844 },
  LLBG: { icao: 'LLBG', iata: 'TLV', name: 'Ben Gurion International', city: 'Tel Aviv', country: 'IL', lat: 32.0114, lon: 34.8867 },
  OMAA: { icao: 'OMAA', iata: 'AUH', name: 'Abu Dhabi International', city: 'Abu Dhabi', country: 'AE', lat: 24.4331, lon: 54.6511 },

  // Canada
  CYYZ: { icao: 'CYYZ', iata: 'YYZ', name: 'Toronto Pearson International', city: 'Toronto', country: 'CA', lat: 43.6777, lon: -79.6248 },
  CYVR: { icao: 'CYVR', iata: 'YVR', name: 'Vancouver International', city: 'Vancouver', country: 'CA', lat: 49.1947, lon: -123.1792 },
  CYUL: { icao: 'CYUL', iata: 'YUL', name: 'Montreal Trudeau International', city: 'Montreal', country: 'CA', lat: 45.4706, lon: -73.7408 },
  CYYC: { icao: 'CYYC', iata: 'YYC', name: 'Calgary International', city: 'Calgary', country: 'CA', lat: 51.1225, lon: -114.0133 },

  // Latin America
  SBGR: { icao: 'SBGR', iata: 'GRU', name: 'Sao Paulo Guarulhos', city: 'Sao Paulo', country: 'BR', lat: -23.4356, lon: -46.4731 },
  MMMX: { icao: 'MMMX', iata: 'MEX', name: 'Mexico City International', city: 'Mexico City', country: 'MX', lat: 19.4363, lon: -99.0721 },
  SCEL: { icao: 'SCEL', iata: 'SCL', name: 'Santiago International', city: 'Santiago', country: 'CL', lat: -33.393, lon: -70.7858 },
  SAEZ: { icao: 'SAEZ', iata: 'EZE', name: 'Buenos Aires Ezeiza', city: 'Buenos Aires', country: 'AR', lat: -34.8222, lon: -58.5358 },
  SKBO: { icao: 'SKBO', iata: 'BOG', name: 'El Dorado International', city: 'Bogota', country: 'CO', lat: 4.7016, lon: -74.1469 },
  SPJC: { icao: 'SPJC', iata: 'LIM', name: 'Jorge Chavez International', city: 'Lima', country: 'PE', lat: -12.0219, lon: -77.1143 },
  SEQM: { icao: 'SEQM', iata: 'UIO', name: 'Mariscal Sucre International', city: 'Quito', country: 'EC', lat: -0.1292, lon: -78.3575 },
  SBBR: { icao: 'SBBR', iata: 'BSB', name: 'Brasilia International', city: 'Brasilia', country: 'BR', lat: -15.8711, lon: -47.9186 },

  // Africa
  FACT: { icao: 'FACT', iata: 'CPT', name: 'Cape Town International', city: 'Cape Town', country: 'ZA', lat: -33.9715, lon: 18.6021 },
  FAOR: { icao: 'FAOR', iata: 'JNB', name: 'Johannesburg O.R. Tambo', city: 'Johannesburg', country: 'ZA', lat: -26.1392, lon: 28.246 },
  HECA: { icao: 'HECA', iata: 'CAI', name: 'Cairo International', city: 'Cairo', country: 'EG', lat: 30.1219, lon: 31.4056 },
  GMMN: { icao: 'GMMN', iata: 'CMN', name: 'Mohammed V International', city: 'Casablanca', country: 'MA', lat: 33.3675, lon: -7.5897 },
  DNMM: { icao: 'DNMM', iata: 'LOS', name: 'Murtala Muhammed International', city: 'Lagos', country: 'NG', lat: 6.5774, lon: 3.3212 },
  HKJK: { icao: 'HKJK', iata: 'NBO', name: 'Jomo Kenyatta International', city: 'Nairobi', country: 'KE', lat: -1.3192, lon: 36.9278 },
  HAAB: { icao: 'HAAB', iata: 'ADD', name: 'Addis Ababa Bole', city: 'Addis Ababa', country: 'ET', lat: 8.9779, lon: 38.7994 },
}

// Create lookup maps for fast searching
export const IATA_TO_ICAO: Record<string, string> = {}
export const AIRPORT_SEARCH_INDEX: Array<{ key: string; icao: string }> = []

// Build indexes
Object.entries(AIRPORTS).forEach(([icao, airport]) => {
  IATA_TO_ICAO[airport.iata] = icao

  // Add searchable entries
  AIRPORT_SEARCH_INDEX.push({ key: icao.toLowerCase(), icao })
  AIRPORT_SEARCH_INDEX.push({ key: airport.iata.toLowerCase(), icao })
  AIRPORT_SEARCH_INDEX.push({ key: airport.name.toLowerCase(), icao })
  AIRPORT_SEARCH_INDEX.push({ key: airport.city.toLowerCase(), icao })
})

// Search function
export function searchAirports(query: string, limit = 5): Airport[] {
  const q = query.toLowerCase().trim()
  if (q.length < 2) return []

  const results: Array<{ airport: Airport; score: number }> = []
  const seen = new Set<string>()

  for (const entry of AIRPORT_SEARCH_INDEX) {
    if (seen.has(entry.icao)) continue

    if (entry.key.startsWith(q)) {
      const airport = AIRPORTS[entry.icao]
      // Higher score for exact code matches
      const isCodeMatch = entry.key === q && entry.key.length <= 4
      results.push({ airport, score: isCodeMatch ? 100 : 50 })
      seen.add(entry.icao)
    } else if (entry.key.includes(q)) {
      results.push({ airport: AIRPORTS[entry.icao], score: 10 })
      seen.add(entry.icao)
    }

    if (results.length >= limit * 2) break
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.airport)
}
