export interface CountryCode {
  code: string;
  country: string;
  flag: string;
}

export const countryCodes: CountryCode[] = [
  // African countries (prioritized for football academy platform)
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
  { code: "+248", country: "Seychelles", flag: "🇸🇨" },
  { code: "+249", country: "Sudan", flag: "🇸🇩" },
  { code: "+211", country: "South Sudan", flag: "🇸🇸" },
  { code: "+250", country: "Rwanda", flag: "🇷🇼" },
  { code: "+252", country: "Somalia", flag: "🇸🇴" },
  { code: "+253", country: "Djibouti", flag: "🇩🇯" },
  { code: "+257", country: "Burundi", flag: "🇧🇮" },
  { code: "+261", country: "Madagascar", flag: "🇲🇬" },
  { code: "+264", country: "Namibia", flag: "🇳🇦" },
  { code: "+266", country: "Lesotho", flag: "🇱🇸" },
  { code: "+268", country: "Eswatini", flag: "🇸🇿" },
  { code: "+269", country: "Comoros", flag: "🇰🇲" },
  { code: "+291", country: "Eritrea", flag: "🇪🇷" },
  { code: "+220", country: "Gambia", flag: "🇬🇲" },
  { code: "+224", country: "Guinea", flag: "🇬🇳" },
  { code: "+222", country: "Mauritania", flag: "🇲🇷" },
  { code: "+223", country: "Mali", flag: "🇲🇱" },

  // European countries
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
  { code: "+355", country: "Albania", flag: "🇦🇱" },
  { code: "+376", country: "Andorra", flag: "🇦🇩" },
  { code: "+374", country: "Armenia", flag: "🇦🇲" },
  { code: "+994", country: "Azerbaijan", flag: "🇦🇿" },
  { code: "+375", country: "Belarus", flag: "🇧🇾" },
  { code: "+387", country: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "+385", country: "Croatia", flag: "🇭🇷" },
  { code: "+357", country: "Cyprus", flag: "🇨🇾" },
  { code: "+372", country: "Estonia", flag: "🇪🇪" },
  { code: "+995", country: "Georgia", flag: "🇬🇪" },
  { code: "+354", country: "Iceland", flag: "🇮🇸" },
  { code: "+353", country: "Ireland", flag: "🇮🇪" },
  { code: "+383", country: "Kosovo", flag: "🇽🇰" },
  { code: "+371", country: "Latvia", flag: "🇱🇻" },
  { code: "+423", country: "Liechtenstein", flag: "🇱🇮" },
  { code: "+370", country: "Lithuania", flag: "🇱🇹" },
  { code: "+352", country: "Luxembourg", flag: "🇱🇺" },
  { code: "+356", country: "Malta", flag: "🇲🇹" },
  { code: "+373", country: "Moldova", flag: "🇲🇩" },
  { code: "+377", country: "Monaco", flag: "🇲🇨" },
  { code: "+382", country: "Montenegro", flag: "🇲🇪" },
  { code: "+389", country: "North Macedonia", flag: "🇲🇰" },
  { code: "+378", country: "San Marino", flag: "🇸🇲" },
  { code: "+381", country: "Serbia", flag: "🇷🇸" },
  { code: "+386", country: "Slovenia", flag: "🇸🇮" },
  { code: "+380", country: "Ukraine", flag: "🇺🇦" },
  { code: "+379", country: "Vatican City", flag: "🇻🇦" },

  // Americas & Caribbean
  { code: "+1", country: "United States", flag: "🇺🇸" },
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
  { code: "+1268", country: "Antigua and Barbuda", flag: "🇦🇬" },
  { code: "+1242", country: "Bahamas", flag: "🇧🇸" },
  { code: "+1246", country: "Barbados", flag: "🇧🇧" },
  { code: "+501", country: "Belize", flag: "🇧🇿" },
  { code: "+506", country: "Costa Rica", flag: "🇨🇷" },
  { code: "+53", country: "Cuba", flag: "🇨🇺" },
  { code: "+1767", country: "Dominica", flag: "🇩🇲" },
  { code: "+1809", country: "Dominican Republic", flag: "🇩🇴" },
  { code: "+503", country: "El Salvador", flag: "🇸🇻" },
  { code: "+1473", country: "Grenada", flag: "🇬🇩" },
  { code: "+502", country: "Guatemala", flag: "🇬🇹" },
  { code: "+509", country: "Haiti", flag: "🇭🇹" },
  { code: "+504", country: "Honduras", flag: "🇭🇳" },
  { code: "+1876", country: "Jamaica", flag: "🇯🇲" },
  { code: "+505", country: "Nicaragua", flag: "🇳🇮" },
  { code: "+507", country: "Panama", flag: "🇵🇦" },
  { code: "+1869", country: "Saint Kitts and Nevis", flag: "🇰🇳" },
  { code: "+1758", country: "Saint Lucia", flag: "🇱🇨" },
  { code: "+1784", country: "Saint Vincent and the Grenadines", flag: "🇻🇨" },
  { code: "+1868", country: "Trinidad and Tobago", flag: "🇹🇹" },

  // Asia & Middle East
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
  { code: "+7", country: "Kazakhstan", flag: "🇰🇿" },
  { code: "+996", country: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "+992", country: "Tajikistan", flag: "🇹🇯" },
  { code: "+993", country: "Turkmenistan", flag: "🇹🇲" },
  { code: "+998", country: "Uzbekistan", flag: "🇺🇿" },
  { code: "+673", country: "Brunei", flag: "🇧🇳" },
  { code: "+670", country: "Timor-Leste", flag: "🇹🇱" },
  { code: "+976", country: "Mongolia", flag: "🇲🇳" },
  { code: "+850", country: "North Korea", flag: "🇰🇵" },

  // Oceania
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+64", country: "New Zealand", flag: "🇳🇿" },
  { code: "+679", country: "Fiji", flag: "🇫🇯" },
  { code: "+685", country: "Samoa", flag: "🇼🇸" },
  { code: "+676", country: "Tonga", flag: "🇹🇴" },
  { code: "+678", country: "Vanuatu", flag: "🇻🇺" },
  { code: "+677", country: "Solomon Islands", flag: "🇸🇧" },
  { code: "+675", country: "Papua New Guinea", flag: "🇵🇬" },
  { code: "+686", country: "Kiribati", flag: "🇰🇮" },
  { code: "+692", country: "Marshall Islands", flag: "🇲🇭" },
  { code: "+691", country: "Micronesia", flag: "🇫🇲" },
  { code: "+674", country: "Nauru", flag: "🇳🇷" },
  { code: "+680", country: "Palau", flag: "🇵🇼" },
  { code: "+688", country: "Tuvalu", flag: "🇹🇻" },
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