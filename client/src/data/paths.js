/**
 * Travel path definitions used across the frontend
 * Note: Prices are NOT shown here — they come from the matched agent
 */
export const PATHS = {
  education: {
    id: 'education',
    label: 'Education',
    icon: '🎓',
    color: '#6366f1',
    description: 'Study abroad — admissions, visas, accommodation, and tuition support.',
    steps: ['University Search', 'Application Support', 'Visa Processing', 'Accommodation', 'Travel Booking'],
  },
  tourism: {
    id: 'tourism',
    label: 'Tourism',
    icon: '✈️',
    color: '#06b6d4',
    description: 'Explore the world — curated travel packages with verified agents.',
    steps: ['Destination Planning', 'Visa & Docs', 'Flight Booking', 'Hotel & Tours', 'Travel Insurance'],
  },
  medical: {
    id: 'medical',
    label: 'Medical',
    icon: '🏥',
    color: '#ef4444',
    description: 'Access world-class healthcare abroad — treatment coordination and logistics.',
    steps: ['Hospital Matching', 'Medical Visa', 'Appointment Booking', 'Accommodation', 'Follow-up Care'],
  },
  business: {
    id: 'business',
    label: 'Business',
    icon: '💼',
    color: '#f59e0b',
    description: 'Corporate travel and trade missions — seamless business logistics.',
    steps: ['Itinerary Planning', 'Visa & Permits', 'Flights & Hotels', 'Meeting Logistics', 'Translation'],
  },
  relocation: {
    id: 'relocation',
    label: 'Relocation',
    icon: '🏠',
    color: '#10b981',
    description: 'Move abroad permanently — immigration, housing, and settlement support.',
    steps: ['Immigration Advice', 'Visa Application', 'Housing Search', 'Shipping & Logistics', 'Settlement'],
  },
  religious: {
    id: 'religious',
    label: 'Religious',
    icon: '🕌',
    color: '#8b5cf6',
    description: 'Hajj, Umrah, pilgrimages — fully coordinated spiritual journeys.',
    steps: ['Package Selection', 'Visa & Docs', 'Group Coordination', 'Accommodation', 'Guided Tours'],
  },
  family: {
    id: 'family',
    label: 'Family',
    icon: '👨‍👩‍👧‍👦',
    color: '#ec4899',
    description: 'Family vacations and reunions — kid-friendly, stress-free travel.',
    steps: ['Destination Selection', 'Visa Processing', 'Family Accommodation', 'Activities Planning', 'Travel Insurance'],
  },
};

export const PATH_LIST = Object.values(PATHS);
export const PATH_IDS  = Object.keys(PATHS);
