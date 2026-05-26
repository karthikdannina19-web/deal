/**
 * Location Data Utility
 * Provides dynamic data for States, Districts, and Mandals
 */

const locationData = {
  'Telangana': {
    'Hyderabad': ['Ameerpet', 'Banjara Hills', 'Gachibowli', 'Kukatpally', 'Secunderabad'],
    'Rangareddy': ['Manikonda', 'Puppalguda', 'Narsingi', 'Kokapet'],
    'Medchal': ['Uppal', 'Malkajgiri', 'Medipally'],
    'Warangal': ['Hanamkonda', 'Kazipet', 'Warangal City']
  },
  'Andhra Pradesh': {
    'Anantapur': ['Hindupur', 'Penukonda', 'Kadiri'],
    'Visakhapatnam': ['Gajuwaka', 'Madhurawada', 'Seethammadhara'],
    'Vijayawada': ['Benz Circle', 'Patamata', 'Gunaadala'],
    'Guntur': ['Amaravati', 'Tenali', 'Narasaraopet'],
    'Chittoor': ['Tirupati', 'Madanapalle', 'Palamaner']
  },
  'Karnataka': {
    'Bangalore': ['Indiranagar', 'Koramangala', 'HSR Layout', 'Whitefield'],
    'Mysore': ['Vidyaranyapuram', 'Jayalakshmipuram'],
    'Hubli': ['Dharwad City', 'Navalgund']
  }
};

export const getStates = () => Object.keys(locationData);
export const getDistricts = (state) => state ? Object.keys(locationData[state] || {}) : [];
export const getMandals = (state, district) => (state && district) ? (locationData[state][district] || []) : [];

export default locationData;
