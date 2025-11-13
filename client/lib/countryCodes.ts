export interface CountryCode {
  code: string;
  country: string;
  flag: string;
}

export const countryCodes: CountryCode[] = [
  // African countries (prioritized for football academy)
  { code: "+260", country: "Zambia", flag: "🇿🇲" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+254", country: "Kenya", flag: "🇰🇪" },
  { code: "+234", country: "Nigeria", flag: "🇳🇬" },
  { code: "+233", country: "Ghana", flag: "🇬🇭" },
  { code: "+255", country: "Tanzania", flag: "🇹🇿" },
  { code: "+256", country: "Uganda", flag: "🇺🇬" },
  { code: "+263", country: "Zimbabwe", flag: "🇿🇼" },
  { code: "+267", country: "Botswana", flag: "🇧🇼" },
  { code: "+265", country: "Malawi", flag: "🇲🇼" },
  { code: "+258", country: "Mozambique", flag: "🇲🇿" },
  { code: "+251", country: "Ethiopia", flag: "🇪🇹" },
  { code: "+212", country: "Morocco", flag: "🇲🇦" },
  { code: "+213", country: "Algeria", flag: "🇩🇿" },
  { code: "+216", country: "Tunisia", flag: "🇹🇳" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+221", country: "Senegal", flag: "🇸🇳" },
  { code: "+225", country: "Ivory Coast", flag: "🇨🇮" },
  { code: "+226", country: "Burkina Faso", flag: "🇧🇫" },
  { code: "+227", country: "Niger", flag: "🇳🇪" },
  { code: "+228", country: "Togo", flag: "🇹🇬" },
  { code: "+229", country: "Benin", flag: "🇧🇯" },
  { code: "+230", country: "Mauritius", flag: "🇲🇺" },
  { code: "+231", country: "Liberia", flag: "🇱🇷" },
  { code: "+232", country: "Sierra Leone", flag: "🇸🇱" },
  { code: "+235", country: "Chad", flag: "🇹🇩" },
  { code: "+236", country: "Central African Republic", flag: "🇨🇫" },
  { code: "+237", country: "Cameroon", flag: "🇨🇲" },
  { code: "+238", country: "Cape Verde", flag: "🇨🇻" },
  { code: "+239", country: "São Tomé and Príncipe", flag: "🇸🇹" },
  { code: "+240", country: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "+241", country: "Gabon", flag: "🇬🇦" },
  { code: "+242", country: "Republic of the Congo", flag: "🇨🇬" },
  { code: "+243", country: "Democratic Republic of the Congo", flag: "🇨🇩" },
  { code: "+244", country: "Angola", flag: "🇦🇴" },
  { code: "+245", country: "Guinea-Bissau", flag: "🇬🇼" },
  { code: "+246", country: "British Indian Ocean Territory", flag: "🇮🇴" },
  { code: "+248", country: "Seychelles", flag: "🇸🇨" },
  { code: "+249", country: "Sudan", flag: "🇸🇩" },
  { code: "+250", country: "Rwanda", flag: "🇷🇼" },
  { code: "+252", country: "Somalia", flag: "🇸🇴" },
  { code: "+253", country: "Djibouti", flag: "🇩🇯" },
  { code: "+257", country: "Burundi", flag: "🇧🇮" },
  { code: "+261", country: "Madagascar", flag: "🇲🇬" },
  { code: "+262", country: "Mayotte", flag: "🇾🇹" },
  { code: "+264", country: "Namibia", flag: "🇳🇦" },
  { code: "+266", country: "Lesotho", flag: "🇱🇸" },
  { code: "+268", country: "Eswatini", flag: "🇸🇿" },
  { code: "+269", country: "Comoros", flag: "🇰🇲" },
  { code: "+290", country: "Saint Helena", flag: "🇸🇭" },
  { code: "+291", country: "Eritrea", flag: "🇪🇷" },
  
  // Major international countries
  { code: "+1", country: "United States", flag: "🇺🇸" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+31", country: "Netherlands", flag: "🇳🇱" },
  { code: "+32", country: "Belgium", flag: "🇧🇪" },
  { code: "+41", country: "Switzerland", flag: "🇨🇭" },
  { code: "+43", country: "Austria", flag: "🇦🇹" },
  { code: "+45", country: "Denmark", flag: "🇩🇰" },
  { code: "+46", country: "Sweden", flag: "🇸🇪" },
  { code: "+47", country: "Norway", flag: "🇳🇴" },
  { code: "+358", country: "Finland", flag: "🇫🇮" },
  { code: "+7", country: "Russia", flag: "🇷🇺" },
  { code: "+48", country: "Poland", flag: "🇵🇱" },
  { code: "+420", country: "Czech Republic", flag: "🇨🇿" },
  { code: "+421", country: "Slovakia", flag: "🇸🇰" },
  { code: "+36", country: "Hungary", flag: "🇭🇺" },
  { code: "+40", country: "Romania", flag: "🇷🇴" },
  { code: "+359", country: "Bulgaria", flag: "🇧🇬" },
  { code: "+30", country: "Greece", flag: "🇬🇷" },
  { code: "+90", country: "Turkey", flag: "🇹🇷" },
  
  // Asian countries
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩" },
  { code: "+63", country: "Philippines", flag: "🇵🇭" },
  { code: "+66", country: "Thailand", flag: "🇹🇭" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳" },
  { code: "+852", country: "Hong Kong", flag: "🇭🇰" },
  { code: "+853", country: "Macau", flag: "🇲🇴" },
  { code: "+886", country: "Taiwan", flag: "🇹🇼" },
  { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
  { code: "+92", country: "Pakistan", flag: "🇵🇰" },
  { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
  { code: "+95", country: "Myanmar", flag: "🇲🇲" },
  { code: "+855", country: "Cambodia", flag: "🇰🇭" },
  { code: "+856", country: "Laos", flag: "🇱🇦" },
  { code: "+977", country: "Nepal", flag: "🇳🇵" },
  { code: "+975", country: "Bhutan", flag: "🇧🇹" },
  { code: "+960", country: "Maldives", flag: "🇲🇻" },
  
  // Middle Eastern countries
  { code: "+971", country: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+974", country: "Qatar", flag: "🇶🇦" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼" },
  { code: "+968", country: "Oman", flag: "🇴🇲" },
  { code: "+967", country: "Yemen", flag: "🇾🇪" },
  { code: "+964", country: "Iraq", flag: "🇮🇶" },
  { code: "+963", country: "Syria", flag: "🇸🇾" },
  { code: "+961", country: "Lebanon", flag: "🇱🇧" },
  { code: "+962", country: "Jordan", flag: "🇯🇴" },
  { code: "+972", country: "Israel", flag: "🇮🇱" },
  { code: "+970", country: "Palestine", flag: "🇵🇸" },
  { code: "+98", country: "Iran", flag: "🇮🇷" },
  { code: "+93", country: "Afghanistan", flag: "🇦🇫" },
  
  // American countries
  { code: "+1", country: "Canada", flag: "🇨🇦" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" },
  { code: "+58", country: "Venezuela", flag: "🇻🇪" },
  { code: "+51", country: "Peru", flag: "🇵🇪" },
  { code: "+593", country: "Ecuador", flag: "🇪🇨" },
  { code: "+595", country: "Paraguay", flag: "🇵🇾" },
  { code: "+598", country: "Uruguay", flag: "🇺🇾" },
  { code: "+591", country: "Bolivia", flag: "🇧🇴" },
  { code: "+592", country: "Guyana", flag: "🇬🇾" },
  { code: "+597", country: "Suriname", flag: "🇸🇷" },
  { code: "+594", country: "French Guiana", flag: "🇬🇫" },
  
  // Oceania
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+64", country: "New Zealand", flag: "🇳🇿" },
  { code: "+679", country: "Fiji", flag: "🇫🇯" },
  { code: "+685", country: "Samoa", flag: "🇼🇸" },
  { code: "+676", country: "Tonga", flag: "🇹🇴" },
  { code: "+678", country: "Vanuatu", flag: "🇻🇺" },
  { code: "+687", country: "New Caledonia", flag: "🇳🇨" },
  { code: "+689", country: "French Polynesia", flag: "🇵🇫" },
];

export const getCountryByCode = (code: string): CountryCode | undefined => {
  return countryCodes.find(country => country.code === code);
};

export const parsePhoneNumber = (combinedPhone: string): { countryCode: string; phoneNumber: string } => {
  if (!combinedPhone) {
    return { countryCode: '+260', phoneNumber: '' };
  }

  // Find the longest matching country code
  const sortedCodes = countryCodes
    .map(c => c.code)
    .sort((a, b) => b.length - a.length); // Sort by length descending

  for (const code of sortedCodes) {
    if (combinedPhone.startsWith(code)) {
      return {
        countryCode: code,
        phoneNumber: combinedPhone.substring(code.length)
      };
    }
  }

  // Default fallback
  return { countryCode: '+260', phoneNumber: combinedPhone };
};

export const formatPhoneDisplay = (countryCode: string, phoneNumber: string): string => {
  const country = getCountryByCode(countryCode);
  if (country && phoneNumber) {
    return `${country.flag} ${countryCode} ${phoneNumber}`;
  }
  return phoneNumber || '';
};