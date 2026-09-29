export const TRAVEL_TYPES: {
    id: number;
    label: string;
    icon: string;
    cost: number;
    travelTime: number;
}[] = [
        { id: 0, label: "Train", icon: "train", cost: 250, travelTime: 240 * 60 },
        { id: 1, label: "Car/Motorcycle", icon: "car", cost: 750, travelTime: 120 * 60 },
        { id: 2, label: "Airplane", icon: "plane", cost: 1750, travelTime: 60 * 60 },
    ];

// City enum for reference
export const City: Record<number, string> = {
    0: "Chicago",
    1: "Detroit",
    2: "New York",
    3: "Miami",
    4: "Las Vegas",
    5: "Medellin",
    6: "Bogota",
    7: "Caracas",
    8: "Palermo",
    9: "Messina",
    10: "Napoli",
};

export const CitySimple = [
    "CHI",
    "DET",
    "NYC",
    "MIA",
    "LVG",
    "MED",
    "BOG",
    "CAR",
    "PAL",
    "MES",
    "NAP",
] as const;

export type TravelRegion = {
    region: string;
    cities: { name: string; cityId: number }[];
};

export const TravelCities: TravelRegion[] = [
    {
        region: "North America",
        cities: [
            { name: City[0], cityId: 0 },
            { name: City[1], cityId: 1 },
            { name: City[2], cityId: 2 },
            { name: City[3], cityId: 3 },
            { name: City[4], cityId: 4 },
        ],
    },
    {
        region: "South America",
        cities: [
            { name: City[5], cityId: 5 },
            { name: City[6], cityId: 6 },
            { name: City[7], cityId: 7 },
        ],
    },
    {
        region: "Europe",
        cities: [
            { name: City[8], cityId: 8 },
            { name: City[9], cityId: 9 },
            { name: City[10], cityId: 10 },
        ],
    },
];

// Travel destination cities for the destinationCity parameter
export const TRAVEL_DESTINATIONS: { id: number; label: string; country: string }[] = [
    { id: 0, label: "Chicago", country: "USA" },
    { id: 1, label: "Detroit", country: "USA" },
    { id: 2, label: "New York", country: "USA" },
    { id: 3, label: "Miami", country: "USA" },
    { id: 4, label: "Las Vegas", country: "USA" },
    { id: 5, label: "Medellin", country: "Colombia" },
    { id: 6, label: "Bogota", country: "Colombia" },
    { id: 7, label: "Caracas", country: "Venezuela" },
    { id: 8, label: "Palermo", country: "Italy" },
    { id: 9, label: "Messina", country: "Italy" },
    { id: 10, label: "Napoli", country: "Italy" },
];
