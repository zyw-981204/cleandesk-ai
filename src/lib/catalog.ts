import type {
  Addon,
  Cleaner,
  Customer,
  KbChunk,
  Service,
  ServiceArea,
} from "@/lib/domain";

export const SERVICES: Service[] = [
  {
    slug: "standard",
    name: "Standard refresh",
    summary: "A recurring tidy for homes that are already in everyday shape.",
    includes: [
      "Kitchen counters, appliance fronts, and the sink",
      "Bathrooms sanitized, mirrors, and floors",
      "Dusting, vacuuming, and mopping of living areas",
      "Beds made and trash taken out",
    ],
    baseCents: 8900,
    perSqftCents: 10,
    perBedroomCents: 2000,
    perBathroomCents: 2500,
    durationHours: 2,
  },
  {
    slug: "deep",
    name: "Deep clean",
    summary: "A top-to-bottom reset, including baseboards, inside cabinets you empty, and detail work.",
    includes: [
      "Everything in a standard refresh",
      "Baseboards, door frames, and switch plates",
      "Inside the microwave and cabinet fronts",
      "Scale in showers and detail around fixtures",
    ],
    baseCents: 14900,
    perSqftCents: 16,
    perBedroomCents: 3000,
    perBathroomCents: 3500,
    durationHours: 4,
  },
  {
    slug: "move",
    name: "Move-in / move-out",
    summary: "Empty-home clean for landlords, sellers, and anyone handing over keys.",
    includes: [
      "Inside empty cabinets, closets, and the pantry",
      "Appliance interiors when booked as add-ons",
      "Floors, baseboards, and inside windowsills",
      "Garage is not included",
    ],
    baseCents: 19900,
    perSqftCents: 18,
    perBedroomCents: 3500,
    perBathroomCents: 4000,
    durationHours: 5,
  },
  {
    slug: "office",
    name: "Office clean",
    summary: "After-hours tidy for studios and small offices in our service towns.",
    includes: [
      "Desks wiped (papers left in place), kitchenette, and floors",
      "Restrooms restocked from supplies you leave on site",
      "Trash and recycling to the building bins",
      "We do not move servers or open locked rooms",
    ],
    baseCents: 12900,
    perSqftCents: 12,
    perBedroomCents: 0,
    perBathroomCents: 3000,
    durationHours: 3,
  },
];

export const ADDONS: Addon[] = [
  {
    slug: "oven",
    name: "Oven interior",
    summary: "Racks and the cavity, not a self-clean cycle.",
    priceCents: 4900,
  },
  {
    slug: "fridge",
    name: "Fridge interior",
    summary: "Shelves wiped once food is removed to the counter.",
    priceCents: 3900,
  },
  {
    slug: "windows",
    name: "Interior windows",
    summary: "Glass and sills we can reach from the floor. No ladders.",
    priceCents: 5900,
  },
  {
    slug: "carpets",
    name: "Carpet refresh",
    summary: "Vacuum plus a spot treatment on up to two rooms.",
    priceCents: 6900,
  },
];

export const AREAS: ServiceArea[] = [
  {
    id: "area-port-meridian",
    city: "Port Meridian",
    region: "Harborlight",
    postalCodes: ["88011", "88012", "88013", "88014"],
    note: "Weekday and Saturday windows. Street parking is fine.",
  },
  {
    id: "area-cedarwharf",
    city: "Cedarwharf",
    region: "Harborlight",
    postalCodes: ["88021", "88022", "88023"],
    note: "Walk-up buildings need a door code in the booking notes.",
  },
  {
    id: "area-northglass",
    city: "Northglass",
    region: "Harborlight",
    postalCodes: ["88031", "88032"],
    note: "Office cleans are popular here after 5 p.m.",
  },
  {
    id: "area-millhaven",
    city: "Millhaven",
    region: "Harborlight",
    postalCodes: ["88041", "88042"],
    note: "Longer driveways: leave a gate code in the notes.",
  },
];

export const CLEANERS: Cleaner[] = [
  { id: "cl-rowan", name: "Rowan Pell", focus: "Homes and move-outs" },
  { id: "cl-mina", name: "Mina Okonkwo", focus: "Deep cleans" },
  { id: "cl-samir", name: "Samir Adeyemi", focus: "Offices" },
  { id: "cl-pilar", name: "Pilar Cho", focus: "Recurring homes" },
];

export const CUSTOMERS: Customer[] = [
  {
    id: "cus-quinn",
    name: "Quinn Hale",
    email: "quinn.hale@bright-harbor.example",
    phone: "(555) 014-2281",
    addressLine: "18 Lantern Row",
    city: "Port Meridian",
    postalCode: "88012",
    sqft: 980,
    bedrooms: 2,
    bathrooms: 1,
  },
  {
    id: "cus-ellis",
    name: "Ellis Marrow",
    email: "ellis.marrow@bright-harbor.example",
    phone: "(555) 014-3302",
    addressLine: "44 Glassmarket",
    city: "Cedarwharf",
    postalCode: "88021",
    sqft: 1400,
    bedrooms: 3,
    bathrooms: 2,
  },
  {
    id: "cus-noor",
    name: "Noor Patel",
    email: "noor.patel@bright-harbor.example",
    phone: "(555) 014-4418",
    addressLine: "9 Kite Street",
    city: "Northglass",
    postalCode: "88031",
    sqft: 640,
    bedrooms: 1,
    bathrooms: 1,
  },
  {
    id: "cus-sable",
    name: "Sable Ortega",
    email: "sable.ortega@bright-harbor.example",
    phone: "(555) 014-5520",
    addressLine: "210 Wharf Lane",
    city: "Millhaven",
    postalCode: "88041",
    sqft: 2100,
    bedrooms: 4,
    bathrooms: 3,
  },
  {
    id: "cus-jonah",
    name: "Jonah Peck",
    email: "jonah.peck@bright-harbor.example",
    phone: "(555) 014-6634",
    addressLine: "77 Cinder Court",
    city: "Port Meridian",
    postalCode: "88013",
    sqft: 1200,
    bedrooms: 2,
    bathrooms: 2,
  },
  {
    id: "cus-amira",
    name: "Amira Sol",
    email: "studio@northglass-loft.example",
    phone: "(555) 014-7745",
    addressLine: "15 Northglass Avenue",
    city: "Northglass",
    postalCode: "88032",
    sqft: 1800,
    bedrooms: 0,
    bathrooms: 2,
  },
  {
    id: "cus-theo",
    name: "Theo Brandt",
    email: "theo.brandt@bright-harbor.example",
    phone: "(555) 014-8856",
    addressLine: "6 Cedarwharf Walk",
    city: "Cedarwharf",
    postalCode: "88022",
    sqft: 1600,
    bedrooms: 3,
    bathrooms: 2,
  },
  {
    id: "cus-lina",
    name: "Lina Voss",
    email: "lina.voss@bright-harbor.example",
    phone: "(555) 014-9967",
    addressLine: "88 Millhaven Road",
    city: "Millhaven",
    postalCode: "88042",
    sqft: 900,
    bedrooms: 2,
    bathrooms: 1,
  },
];

export const KB_CHUNKS: KbChunk[] = [
  {
    id: "kb-cancel",
    source: "cancellation-policy",
    title: "Cancellation and changes",
    embedding: null,
    content:
      "BrightHarbor Cleaning lets you cancel or reschedule free of charge until 24 hours before the window start. Inside 24 hours the fee is 50% of the quoted visit. A no-show, or a team that cannot get in because a code is missing, is charged the full quote. Weather delays on our side are rebooked at no fee. The demo assistant can reschedule a booking only after you confirm the new window on the card.",
  },
  {
    id: "kb-areas",
    source: "service-areas",
    title: "Where we clean",
    embedding: null,
    content:
      "BrightHarbor Cleaning covers four fictional Harborlight towns. Port Meridian uses postal codes 88011, 88012, 88013, and 88014. Cedarwharf uses 88021, 88022, and 88023. Northglass uses 88031 and 88032. Millhaven uses 88041 and 88042. Addresses outside those codes are declined. We do not cross the bridge to other regions.",
  },
  {
    id: "kb-pricing",
    source: "pricing-guide",
    title: "How a quote is built",
    embedding: null,
    content:
      "Every quote is the service base plus a per-square-foot amount plus a bedroom amount plus a bathroom amount, then any add-ons. Standard refresh starts at $89, deep clean at $149, move-in/move-out at $199, and office clean at $129. Add-ons are flat: oven interior $49, fridge interior $39, interior windows $59, carpet refresh $69. Bedrooms are $0 on the office service. The assistant quote tool uses this same formula, so the card matches the catalog.",
  },
  {
    id: "kb-standard",
    source: "standard-clean",
    title: "Standard refresh",
    embedding: null,
    content:
      "A standard refresh is for a home that is already livable. It includes kitchen surfaces, the sink, bathrooms, dusting, vacuuming, mopping, made beds, and trash. It does not include inside the oven, inside the fridge, interior windows, or laundry. Most two-bedroom visits fit a single five-hour arrival window. The team brings products.",
  },
  {
    id: "kb-deep",
    source: "deep-clean",
    title: "Deep clean",
    embedding: null,
    content:
      "A deep clean adds baseboards, door frames, switch plates, the microwave interior, cabinet fronts, and shower detail on top of a standard refresh. It is the right pick after guests, before a party, or when a recurring clean has slipped. Plan on about four hours of work. Empty the shower of bottles so the team can reach the tile.",
  },
  {
    id: "kb-move",
    source: "move-in-move-out",
    title: "Move-in and move-out",
    embedding: null,
    content:
      "Move-in and move-out cleans assume the home is empty of furniture. The team cleans inside cabinets, closets, and the pantry, plus floors, baseboards, and windowsills. Oven, fridge, and interior windows are add-ons. Garages, attics, and wall repairs are out of scope. Book this when keys are changing hands.",
  },
  {
    id: "kb-office",
    source: "office-clean",
    title: "Office clean",
    embedding: null,
    content:
      "Office cleans cover studios and small offices in our four towns, usually after 1 p.m. Desks are wiped without rearranging papers. The kitchenette, floors, and restrooms are included. Count restrooms as bathrooms in the quote and leave bedroom count at zero. Locked rooms and server racks are skipped. Leave restroom supplies on site.",
  },
  {
    id: "kb-addons",
    source: "add-ons",
    title: "Add-ons",
    embedding: null,
    content:
      "Add-ons are oven interior ($49), fridge interior ($39), interior windows ($59), and a carpet refresh for up to two rooms ($69). Windows are interior only and only where we can reach from the floor. Fridge shelves need food moved to the counter before we arrive. Add-ons can be combined with any service.",
  },
  {
    id: "kb-supplies",
    source: "supplies-and-pets",
    title: "Supplies, scent, and pets",
    embedding: null,
    content:
      "BrightHarbor brings labeled, fragrance-light products and HEPA vacuums. If you need unscented only, say so in the booking notes. Pets can stay home. Please put dogs in a room or the yard while the team is inside, and tell us about cats that dart. We do not feed pets or handle litter as part of the standard visit.",
  },
  {
    id: "kb-guarantee",
    source: "satisfaction-guarantee",
    title: "Satisfaction guarantee",
    embedding: null,
    content:
      "If a room on the booked scope was missed, tell BrightHarbor within one business day and we send the same crew back within three service days at no extra charge. The guarantee covers the written scope, not new rooms or add-ons that were not on the quote. Damage claims need a photo the same day.",
  },
  {
    id: "kb-scheduling",
    source: "scheduling",
    title: "Windows and arrival",
    embedding: null,
    content:
      "Visits run Monday through Saturday. Each bookable window is five hours: 8:00–1:00 or 1:00–6:00 local time in Harborlight. The crew arrives at the start of the window, not at a single clock minute. A slot can hold one active booking. Cancelled bookings free the slot. The assistant will not offer a window that already has a confirmed or rescheduled visit, and it will not offer a time that has already started.",
  },
  {
    id: "kb-prepare",
    source: "preparing-your-home",
    title: "Before the crew arrives",
    embedding: null,
    content:
      "Clear toys and dishes off the floors you want mopped, leave a way in (lockbox, door code, or a person), and write alarm codes in the booking notes. We need hot water and a working outlet. Move-out homes should be empty. For offices, badge the crew in or leave a key with the front desk.",
  },
  {
    id: "kb-payment",
    source: "payment",
    title: "Payment",
    embedding: null,
    content:
      "The quote shown in the assistant is the amount due for that visit. BrightHarbor invoices the card on file after the crew finishes. This demo does not charge a real card. Gratuity is never required and is not added by the quote tool.",
  },
];

export type BookingBlueprint = {
  day: number;
  window: 0 | 1;
  cleaner: number;
  customer: number;
  service: Service["slug"];
  addons: Addon["slug"][];
  status: "confirmed" | "rescheduled" | "cancelled";
  notes: string;
};

export const BOOKING_BLUEPRINTS: BookingBlueprint[] = [
  { day: -8, window: 0, cleaner: 0, customer: 1, service: "standard", addons: ["oven"], status: "confirmed", notes: "Left the side gate unlatched." },
  { day: -6, window: 1, cleaner: 1, customer: 2, service: "deep", addons: ["fridge"], status: "confirmed", notes: "Cat stays in the study." },
  { day: -5, window: 0, cleaner: 2, customer: 3, service: "move", addons: ["oven", "fridge"], status: "cancelled", notes: "Keys were not ready." },
  { day: -3, window: 1, cleaner: 3, customer: 4, service: "standard", addons: [], status: "confirmed", notes: "Recurring Saturday." },
  { day: -2, window: 0, cleaner: 2, customer: 5, service: "office", addons: ["windows"], status: "confirmed", notes: "After-hours studio." },
  { day: -1, window: 1, cleaner: 1, customer: 6, service: "deep", addons: ["carpets"], status: "cancelled", notes: "Customer travelled." },
  { day: 1, window: 0, cleaner: 2, customer: 0, service: "standard", addons: [], status: "confirmed", notes: "Demo household, morning." },
  { day: 1, window: 1, cleaner: 3, customer: 7, service: "deep", addons: ["oven"], status: "confirmed", notes: "Please skip the nursery closet." },
  { day: 2, window: 0, cleaner: 0, customer: 2, service: "standard", addons: ["windows"], status: "rescheduled", notes: "Moved off a Sunday request." },
  { day: 2, window: 1, cleaner: 1, customer: 4, service: "move", addons: ["oven", "fridge", "windows"], status: "confirmed", notes: "Empty house, lockbox 4412." },
  { day: 3, window: 0, cleaner: 3, customer: 1, service: "deep", addons: [], status: "confirmed", notes: "Glassmarket door code in notes." },
  { day: 3, window: 1, cleaner: 2, customer: 5, service: "office", addons: [], status: "cancelled", notes: "Building closed for a shoot." },
  { day: 4, window: 0, cleaner: 1, customer: 3, service: "standard", addons: ["fridge"], status: "rescheduled", notes: "Shifted one day earlier." },
  { day: 5, window: 1, cleaner: 0, customer: 6, service: "deep", addons: ["carpets", "windows"], status: "confirmed", notes: "Two-room rug only." },
  { day: 6, window: 0, cleaner: 3, customer: 7, service: "standard", addons: [], status: "confirmed", notes: "First visit." },
  { day: 8, window: 1, cleaner: 0, customer: 0, service: "move", addons: ["oven"], status: "confirmed", notes: "Future move-out for the demo home." },
  { day: 9, window: 0, cleaner: 1, customer: 2, service: "office", addons: ["windows"], status: "rescheduled", notes: "Lobby desk has the key." },
  { day: 10, window: 1, cleaner: 2, customer: 4, service: "deep", addons: ["fridge"], status: "cancelled", notes: "Painter overlap." },
  { day: 12, window: 0, cleaner: 3, customer: 1, service: "standard", addons: ["oven", "fridge"], status: "confirmed", notes: "Both appliance add-ons." },
  { day: 14, window: 1, cleaner: 1, customer: 6, service: "standard", addons: [], status: "confirmed", notes: "Biweekly hold." },
];
