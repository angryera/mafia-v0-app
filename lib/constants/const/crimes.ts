// Crime type labels for the uint8 parameter
export const CRIME_TYPES: { id: number; label: string; description: string; risk: "Low" | "Medium" | "High" | "Extreme" }[] = [
    { id: 0, label: "Rob a Hot Dog Vendor", description: "Swipe some cash from the street vendor", risk: "Low" },
    { id: 1, label: "Rob a Freight Train", description: "Intercept a cargo shipment on the rails", risk: "Medium" },
    { id: 2, label: "Rob the Bank", description: "Hit the vault for the big score", risk: "High" },
    { id: 3, label: "Bribe the Police Station", description: "Grease some palms to stay out of trouble", risk: "Extreme" },
];

// Nick a Car crime types for the crimeType parameter
export const NICKCAR_TYPES: { id: number; label: string; description: string }[] = [
    { id: 0, label: "On the Street Corner", description: "Hotwire a ride parked on the corner" },
    { id: 1, label: "At the Football Stadium", description: "Snag a car from the packed parking lot" },
    { id: 2, label: "From Private Residence", description: "Slip into a driveway and drive off" },
    { id: 3, label: "From the Dealership", description: "Walk into the showroom and never come back" },
];

// Kill skill training types for the trainType parameter
// Note: we intentionally do not include images in the app UI.
export const TRAIN_TYPES: {
    id: number;
    label: string;
    description: string;
    percentage: number;
    cost: number;
}[] = [
        {
            id: 0,
            label: "Practise on bottles in your backyard",
            description: "Low intensity training (4% success).",
            percentage: 4,
            cost: 0,
        },
        {
            id: 1,
            label: "Take a day at the shooting range",
            description: "Medium intensity training (8% success).",
            percentage: 8,
            cost: 5000,
        },
        {
            id: 2,
            label: "Hire a personal trainer",
            description: "High intensity training (18% success).",
            percentage: 18,
            cost: 30000,
        },
    ];

// Smuggle market constants
export const BOOZE_TYPES: Record<number, string> = {
    0: "Beer",
    1: "Wine",
    2: "Port",
    3: "Vodka",
    4: "Whiskey",
    5: "Cognac",
    6: "Tequila",
};

export const NARCS_TYPES: Record<number, string> = {
    0: "Glue",
    1: "Marijuana",
    2: "Amphetamine",
    3: "Cocaine",
    4: "Morphine",
    5: "Opium",
    6: "Heroin",
};
