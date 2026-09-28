export interface CarCatalogEntry {
  id: number;
  brand: string;
  carName: string;
  image: string;
  qualityLvl: number;
  basePrice: number;
  speed: number;
  seats: number;
}

/** Car types minted by nick-a-car. Ids match inventory typeId / NewCarNick.carType. */
export const CAR_CATALOG: CarCatalogEntry[] = [
  {"id":0,"brand":"Rolls royce","carName":"Rolls-Royce 20/25 HP Standard Sedan - $125,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/rolls-low.png","qualityLvl":5,"basePrice":125000,"speed":75,"seats":4},
  {"id":1,"brand":"Rolls royce","carName":"Rolls-Royce 20/25 HP Sports Saloon - $175,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/rolls-medium.png","qualityLvl":5,"basePrice":175000,"speed":80,"seats":4},
  {"id":2,"brand":"Rolls royce","carName":"Rolls-Royce Phantom II - $250,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/rolls-high.png","qualityLvl":5,"basePrice":250000,"speed":95,"seats":6},
  {"id":3,"brand":"Rolls royce","carName":"Rolls-Royce Phantom II Continental Limousine - $500,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/rolls-extreme.png","qualityLvl":5,"basePrice":500000,"speed":100,"seats":6},
  {"id":4,"brand":"Bentley","carName":"Bentley 4.5 Litre Standard Tourer  - $100,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/bentley-low.png","qualityLvl":5,"basePrice":100000,"speed":95,"seats":6},
  {"id":5,"brand":"Bentley","carName":"Bentley 4.5 Litre Sports Saloon  - $150,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/bentley-medium.png","qualityLvl":5,"basePrice":150000,"speed":100,"seats":4},
  {"id":6,"brand":"Bentley","carName":"Bentley Speed Six Saloon  - $200,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/bentley-high.png","qualityLvl":5,"basePrice":200000,"speed":175,"seats":2},
  {"id":7,"brand":"Bentley","carName":"Bentley 8 Litre Limousine by H.J. Mulliner  - $450,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/bentley-extreme.png","qualityLvl":5,"basePrice":450000,"speed":200,"seats":2},
  {"id":8,"brand":"Packard","carName":"Packard Standard Eight Model 726  - $75,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/packard-low.png","qualityLvl":4,"basePrice":75000,"speed":85,"seats":4},
  {"id":9,"brand":"Packard","carName":"Packard Standard Eight Model 733  - $125,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/packard-medium.png","qualityLvl":4,"basePrice":125000,"speed":85,"seats":6},
  {"id":10,"brand":"Packard","carName":"Packard Deluxe Eight Model 740  - $175,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/packard-high.png","qualityLvl":4,"basePrice":175000,"speed":135,"seats":2},
  {"id":11,"brand":"Packard","carName":"Packard Custom Eight Model 745 Convertible Sedan  - $350,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/packard-extreme.png","qualityLvl":4,"basePrice":350000,"speed":175,"seats":2},
  {"id":12,"brand":"Cadillac","carName":"Cadillac Series 353 Standard Sedan  - $70,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/cadillac-low.png","qualityLvl":4,"basePrice":70000,"speed":80,"seats":4},
  {"id":13,"brand":"Cadillac","carName":"Cadillac Series 353 Town Sedan  - $120,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/cadillac-medium.png","qualityLvl":4,"basePrice":120000,"speed":90,"seats":4},
  {"id":14,"brand":"Cadillac","carName":"Cadillac V-16 Imperial Sedan  - $180,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/cadillac-high.png","qualityLvl":4,"basePrice":180000,"speed":110,"seats":6},
  {"id":15,"brand":"Cadillac","carName":"Cadillac V-16 Roadster  - $275,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/cadillac-extreme.png","qualityLvl":4,"basePrice":275000,"speed":190,"seats":2},
  {"id":16,"brand":"Lincoln","carName":"Lincoln Model L  - $60,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/lincoln-low.png","qualityLvl":4,"basePrice":60000,"speed":85,"seats":4},
  {"id":17,"brand":"Lincoln","carName":"Lincoln Model K sedan  - $100,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/lincoln-medium.png","qualityLvl":4,"basePrice":100000,"speed":90,"seats":4},
  {"id":18,"brand":"Lincoln","carName":"Lincoln Model L Town Car  - $155,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/lincoln-high.png","qualityLvl":4,"basePrice":155000,"speed":115,"seats":4},
  {"id":19,"brand":"Lincoln","carName":"Lincoln Model L Limousine  - $250,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/lincoln-extreme.png","qualityLvl":4,"basePrice":250000,"speed":120,"seats":6},
  {"id":20,"brand":"Chrysler","carName":"Chrysler Model 66 sedan  - $40,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/chrysler-low.png","qualityLvl":3,"basePrice":40000,"speed":85,"seats":4},
  {"id":21,"brand":"Chrysler","carName":"Chrysler Series 70 sedan  - $75,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/chrysler-medium.png","qualityLvl":3,"basePrice":75000,"speed":95,"seats":4},
  {"id":22,"brand":"Chrysler","carName":"Chrysler Imperial Model 80 Roadster  - $90,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/chrysler-high.png","qualityLvl":3,"basePrice":90000,"speed":190,"seats":2},
  {"id":23,"brand":"Chrysler","carName":"Chrysler Imperial Custom Series 8 Limousine  - $150,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/chrysler-extreme.png","qualityLvl":3,"basePrice":150000,"speed":125,"seats":6},
  {"id":24,"brand":"Buick","carName":"Buick Series 40  - $15,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/buick-low.png","qualityLvl":3,"basePrice":15000,"speed":75,"seats":2},
  {"id":25,"brand":"Buick","carName":"Buick Series 50 sedan  - $35,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/buick-medium.png","qualityLvl":3,"basePrice":35000,"speed":95,"seats":4},
  {"id":26,"brand":"Buick","carName":"Buick Series 60 sedan  - $50,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/buick-high.png","qualityLvl":3,"basePrice":50000,"speed":110,"seats":4},
  {"id":27,"brand":"Buick","carName":"Buick Series 90 Limited  - $100,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/buick-extreme.png","qualityLvl":3,"basePrice":100000,"speed":145,"seats":2},
  {"id":28,"brand":"DeSoto","carName":"DeSoto Model K  - $16,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/desoto-low.png","qualityLvl":3,"basePrice":16000,"speed":85,"seats":4},
  {"id":29,"brand":"DeSoto","carName":"DeSoto CF Eight sedan  - $25,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/desoto-medium.png","qualityLvl":3,"basePrice":25000,"speed":95,"seats":4},
  {"id":30,"brand":"DeSoto","carName":"DeSoto Deluxe Eight sedan  - $40,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/desoto-high.png","qualityLvl":3,"basePrice":40000,"speed":110,"seats":4},
  {"id":31,"brand":"DeSoto","carName":"DeSoto Custom Imperial Limousine  - $75,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/desoto-extreme.png","qualityLvl":3,"basePrice":75000,"speed":120,"seats":6},
  {"id":32,"brand":"Dodge","carName":"Dodge DC Series sedan  - $16,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/dodge-low.png","qualityLvl":3,"basePrice":16000,"speed":80,"seats":4},
  {"id":33,"brand":"Dodge","carName":"Dodge Eight Series DH sedan  - $25,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/dodge-medium.png","qualityLvl":3,"basePrice":25000,"speed":95,"seats":4},
  {"id":34,"brand":"Dodge","carName":"Dodge Senior Six sedan  - $35,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/dodge-high.png","qualityLvl":3,"basePrice":35000,"speed":105,"seats":4},
  {"id":35,"brand":"Dodge","carName":"Dodge Deluxe Eight Limousine  - $75,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/dodge-extreme.png","qualityLvl":3,"basePrice":75000,"speed":125,"seats":6},
  {"id":36,"brand":"Hudson","carName":"Hudson Greater Eight  - $8,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/hudson-low.png","qualityLvl":2,"basePrice":8000,"speed":75,"seats":4},
  {"id":37,"brand":"Hudson","carName":"Hudson Essex Super Six  - $16,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/hudson-medium.png","qualityLvl":2,"basePrice":16000,"speed":80,"seats":6},
  {"id":38,"brand":"Hudson","carName":"Hudson Custom Eight  - $27,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/hudson-high.png","qualityLvl":2,"basePrice":27000,"speed":95,"seats":4},
  {"id":39,"brand":"Hudson","carName":"Hudson Greater Eight Custom Limousine  - $50,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/hudson-extreme.png","qualityLvl":2,"basePrice":50000,"speed":110,"seats":6},
  {"id":40,"brand":"Nash","carName":"Nash 400 Series sedan  - $8,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/nash-low.png","qualityLvl":2,"basePrice":8000,"speed":70,"seats":6},
  {"id":41,"brand":"Nash","carName":"Nash Standard Six sedan  - $16,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/nash-medium.png","qualityLvl":2,"basePrice":16000,"speed":85,"seats":6},
  {"id":42,"brand":"Nash","carName":"Nash Advanced Eight sedan  - $27,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/nash-high.png","qualityLvl":2,"basePrice":27000,"speed":90,"seats":6},
  {"id":43,"brand":"Nash","carName":"Nash Ambassador Eight Limousine  - $50,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/nash-extreme.png","qualityLvl":2,"basePrice":50000,"speed":110,"seats":4},
  {"id":44,"brand":"Studebaker","carName":"Studebaker Six Standard Sedan  - $8,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/studebaker-low.png","qualityLvl":2,"basePrice":8000,"speed":60,"seats":4},
  {"id":45,"brand":"Studebaker","carName":"Studebaker Commander Sedan  - $16,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/studebaker-medium.png","qualityLvl":2,"basePrice":16000,"speed":65,"seats":4},
  {"id":46,"brand":"Studebaker","carName":"Studebaker President Eight Sedan  - $27,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/studebaker-high.png","qualityLvl":2,"basePrice":27000,"speed":70,"seats":6},
  {"id":47,"brand":"Studebaker","carName":"Studebaker President Convertible Coupe  - $50,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/studebaker-extreme.png","qualityLvl":2,"basePrice":50000,"speed":160,"seats":2},
  {"id":48,"brand":"Ford","carName":"Ford Model A  - $5,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/ford-low.png","qualityLvl":1,"basePrice":5000,"speed":65,"seats":4},
  {"id":49,"brand":"Ford","carName":"Ford Model A Deluxe Roadster  - $12,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/ford-medium.png","qualityLvl":1,"basePrice":12000,"speed":70,"seats":2},
  {"id":50,"brand":"Ford","carName":"Ford Model A Town Car  - $21,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/ford-high.png","qualityLvl":1,"basePrice":21000,"speed":90,"seats":6},
  {"id":51,"brand":"Ford","carName":"Ford Model A Tudor Limousine  - $42,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/ford-extreme.png","qualityLvl":1,"basePrice":42000,"speed":100,"seats":6},
  {"id":52,"brand":"Chervolet","carName":"Chevrolet Universal Series AD Coach  - $5,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/chevrolet-low.png","qualityLvl":1,"basePrice":5000,"speed":65,"seats":4},
  {"id":53,"brand":"Chervolet","carName":"Chevrolet Independence Series AE sedan  - $12,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/chevrolet-medium.png","qualityLvl":1,"basePrice":12000,"speed":80,"seats":6},
  {"id":54,"brand":"Chervolet","carName":"Chevrolet Series AD Universal Phaeton  - $21,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/chevrolet-high.png","qualityLvl":1,"basePrice":21000,"speed":100,"seats":2},
  {"id":55,"brand":"Chervolet","carName":"Chevrolet Series AD Universal Landau  - $42,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/chevrolet-extreme.png","qualityLvl":1,"basePrice":42000,"speed":125,"seats":2},
  {"id":56,"brand":"Austin","carName":"Austin 7  - $5,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/austin-low.png","qualityLvl":1,"basePrice":5000,"speed":60,"seats":4},
  {"id":57,"brand":"Austin","carName":"Austin 12/4  - $12,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/austin-medium.png","qualityLvl":1,"basePrice":12000,"speed":65,"seats":4},
  {"id":58,"brand":"Austin","carName":"Austin 16  - $15,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/austin-high.png","qualityLvl":1,"basePrice":15000,"speed":70,"seats":4},
  {"id":59,"brand":"Austin","carName":"Austin 20/6 Mayfair Limousine  - $37,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/austin-extreme.png","qualityLvl":1,"basePrice":37000,"speed":100,"seats":4},
  {"id":60,"brand":"Plymouth","carName":"Plymouth Model U  - $5,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/plymouth-low.png","qualityLvl":1,"basePrice":5000,"speed":60,"seats":4},
  {"id":61,"brand":"Plymouth","carName":"Plymouth 30U sedan  - $12,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/plymouth-medium.png","qualityLvl":1,"basePrice":12000,"speed":65,"seats":4},
  {"id":62,"brand":"Plymouth","carName":"Plymouth PA Deluxe sedan  - $15,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/plymouth-high.png","qualityLvl":1,"basePrice":15000,"speed":70,"seats":6},
  {"id":63,"brand":"Plymouth","carName":"Plymouth PA Deluxe Limousine  - $37,000","image":"https://mafia.sfo3.cdn.digitaloceanspaces.com/car-images/plymouth-extreme.png","qualityLvl":1,"basePrice":37000,"speed":90,"seats":4},
];

export function getCarByTypeId(typeId: number): CarCatalogEntry | undefined {
  return CAR_CATALOG.find((car) => car.id === typeId);
}

/** Model name without the trailing price baked into the catalog label. */
export function getCarModelName(car: CarCatalogEntry): string {
  return car.carName.replace(/\s+-\s+\$[\d,]+$/, "").trim();
}
