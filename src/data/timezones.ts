export interface TimezoneOption {
  value: string;
  label: string;
  keywords: string;
}

export interface TimezoneGroup {
  label: string;
  options: TimezoneOption[];
}

export const TIMEZONE_GROUPS: TimezoneGroup[] = [
  {
    label: 'Africa',
    options: [
      {
        value: 'Africa/Abidjan',
        label: 'West Africa GMT (UTC+0) — Accra, Dakar, Monrovia, Freetown',
        keywords: 'ghana accra senegal dakar liberia monrovia sierra leone freetown ivory coast abidjan gambia banjul guinea conakry togo lome burkina faso ouagadougou gmt utc+0',
      },
      {
        value: 'Africa/Lagos',
        label: 'West Africa Time (WAT / UTC+1) — Nigeria, Lagos, Abuja, Cameroon',
        keywords: 'nigeria lagos abuja kano port harcourt ibadan cameroon douala yaounde niger niamey chad ndjamena benin cotonou gabon libreville congo kinshasa brazzaville angola luanda wat utc+1',
      },
      {
        value: 'Africa/Casablanca',
        label: 'Morocco Time (UTC+1) — Casablanca, Rabat, Marrakech',
        keywords: 'morocco casablanca rabat marrakech tangier fes utc+1',
      },
      {
        value: 'Africa/Algiers',
        label: 'Central European Time (CET / UTC+1) — Algiers, Tunis',
        keywords: 'algeria algiers tunisia tunis cet utc+1',
      },
      {
        value: 'Africa/Johannesburg',
        label: 'South Africa Standard Time (SAST / UTC+2) — Johannesburg, Cape Town, Harare, Lusaka, Gaborone',
        keywords: 'south africa johannesburg cape town durban pretoria zimbabwe harare zambia lusaka botswana gaborone namibia windhoek malawi lilongwe mozambique maputo lesotho maseru eswatini mbabane sast utc+2',
      },
      {
        value: 'Africa/Cairo',
        label: 'Eastern European Time (EET / UTC+2) — Cairo, Khartoum, Kigali',
        keywords: 'egypt cairo alexandria sudan khartoum rwanda kigali burundi bujumbura libya tripoli eet utc+2',
      },
      {
        value: 'Africa/Nairobi',
        label: 'East Africa Time (EAT / UTC+3) — Nairobi, Kampala, Dar es Salaam, Addis Ababa',
        keywords: 'kenya nairobi mombasa uganda kampala tanzania dar es salaam dodoma zanzibar ethiopia addis ababa somalia mogadishu eritrea asmara djibouti south sudan juba madagascar antananarivo eat utc+3',
      },
      {
        value: 'Indian/Mauritius',
        label: 'Mauritius & Seychelles Time (UTC+4) — Port Louis, Victoria',
        keywords: 'mauritius port louis seychelles victoria reunion mut sct utc+4',
      },
    ],
  },
  {
    label: 'Americas & Caribbean',
    options: [
      {
        value: 'Pacific/Honolulu',
        label: 'Hawaii Time (HST / UTC-10) — Honolulu',
        keywords: 'usa united states hawaii honolulu hst utc-10',
      },
      {
        value: 'America/Anchorage',
        label: 'Alaska Time (AKST / UTC-9) — Anchorage',
        keywords: 'usa united states alaska anchorage juneau akst utc-9',
      },
      {
        value: 'America/Los_Angeles',
        label: 'Pacific Time (PT / UTC-8) — Los Angeles, Vancouver, Seattle',
        keywords: 'usa united states canada california los angeles san francisco san diego seattle portland las vegas vancouver british columbia pt pst pdt utc-8',
      },
      {
        value: 'America/Denver',
        label: 'Mountain Time (MT / UTC-7) — Denver, Calgary, Phoenix',
        keywords: 'usa united states canada colorado denver arizona phoenix utah salt lake city alberta calgary edmonton mt mst mdt utc-7',
      },
      {
        value: 'America/Chicago',
        label: 'Central Time (CT / UTC-6) — Chicago, Dallas, Houston, Winnipeg',
        keywords: 'usa united states canada illinois chicago texas dallas houston austin manitoba winnipeg mexico city belize costa rica guatemala ct cst cdt utc-6',
      },
      {
        value: 'America/Jamaica',
        label: 'Caribbean EST (UTC-5) — Kingston (Jamaica), Nassau (Bahamas), Cayman Islands',
        keywords: 'jamaica kingston montego bay bahamas nassau cayman islands george town panama bogota colombia lima peru est utc-5',
      },
      {
        value: 'America/New_York',
        label: 'Eastern Time (ET / UTC-5) — New York, Toronto, Washington DC, Miami',
        keywords: 'usa united states canada new york washington dc miami florida atlanta boston philadelphia toronto ottawa montreal ontario quebec et est edt utc-5',
      },
      {
        value: 'America/Port_of_Spain',
        label: 'Atlantic / Eastern Caribbean (AST / UTC-4) — Trinidad & Tobago, Barbados, Guyana, St. Lucia',
        keywords: 'trinidad and tobago port of spain barbados bridgetown guyana georgetown saint lucia castries antiguabarbuda grenada dominica saint vincent virgin islands puerto rico san juan ast utc-4',
      },
      {
        value: 'America/Halifax',
        label: 'Atlantic Time (AT / UTC-4) — Halifax, Nova Scotia, Bermuda',
        keywords: 'canada halifax nova scotia new brunswick prince edward island bermuda hamilton at ast adt utc-4',
      },
      {
        value: 'America/St_Johns',
        label: "Newfoundland Time (NT / UTC-3:30) — St. John's",
        keywords: 'canada newfoundland labrador st johns nt nst ndt utc-3:30',
      },
      {
        value: 'America/Sao_Paulo',
        label: 'Brasilia Time (BRT / UTC-3) — São Paulo, Rio de Janeiro, Buenos Aires',
        keywords: 'brazil sao paulo rio de janeiro brasilia argentina buenos aires santiago chile uruguay montevideo brt utc-3',
      },
    ],
  },
  {
    label: 'UK, Europe & UTC',
    options: [
      {
        value: 'UTC',
        label: 'Coordinated Universal Time (UTC+0)',
        keywords: 'utc gmt universal time greenwich utc+0',
      },
      {
        value: 'Europe/London',
        label: 'United Kingdom (GMT/BST / UTC+0) — London, Manchester, Edinburgh, Belfast',
        keywords: 'uk united kingdom england britain great britain london manchester birmingham liverpool leeds scotland edinburgh glasgow wales cardiff northern ireland belfast lisbon portugal gmt bst utc+0',
      },
      {
        value: 'Europe/Dublin',
        label: 'Ireland (GMT/IST / UTC+0) — Dublin, Cork, Galway',
        keywords: 'ireland dublin cork galway limerick gmt ist utc+0',
      },
      {
        value: 'Europe/Paris',
        label: 'Central Europe (CET / UTC+1) — Paris, Berlin, Rome, Malta, Amsterdam, Madrid',
        keywords: 'europe france paris germany berlin frankfurt munich italy rome milan malta valletta netherlands amsterdam spain madrid barcelona belgium brussels switzerland zurich geneva austria vienna sweden stockholm norway oslo denmark copenhagen poland warsaw cet cest utc+1',
      },
      {
        value: 'Europe/Athens',
        label: 'Eastern Europe (EET / UTC+2) — Athens, Nicosia (Cyprus), Helsinki, Bucharest',
        keywords: 'greece athens cyprus nicosia limassol finland helsinki romania bucharest bulgaria sofia ukraine kyiv estonia tallinn latvia riga lithuania vilnius eet eest utc+2',
      },
      {
        value: 'Europe/Istanbul',
        label: 'Turkey Time (TRT / UTC+3) — Istanbul, Ankara',
        keywords: 'turkey turkiye istanbul ankara izmir trt utc+3',
      },
    ],
  },
  {
    label: 'Asia & Middle East',
    options: [
      {
        value: 'Asia/Jerusalem',
        label: 'Israel Time (IST / UTC+2) — Jerusalem, Tel Aviv',
        keywords: 'israel jerusalem tel aviv haifa amman jordan beirut lebanon ist utc+2',
      },
      {
        value: 'Asia/Riyadh',
        label: 'Arabia Standard Time (AST / UTC+3) — Riyadh, Jeddah, Doha, Kuwait, Bahrain',
        keywords: 'saudi arabia riyadh jeddah mecca dammam qatar doha kuwait city bahrain manama iraq baghdad yemen sanaa ast utc+3',
      },
      {
        value: 'Asia/Dubai',
        label: 'Gulf Standard Time (GST / UTC+4) — Dubai, Abu Dhabi, Muscat',
        keywords: 'uae united arab emirates dubai abu dhabi sharjah oman muscat gst utc+4',
      },
      {
        value: 'Asia/Karachi',
        label: 'Pakistan Standard Time (PKT / UTC+5) — Karachi, Islamabad, Lahore',
        keywords: 'pakistan karachi islamabad lahore rawalpindi faisalabad peshawar multan uzbekistan tashkent maldives male pkt utc+5',
      },
      {
        value: 'Asia/Kolkata',
        label: 'India & Sri Lanka Time (IST / UTC+5:30) — Mumbai, New Delhi, Bengaluru, Colombo',
        keywords: 'india mumbai new delhi bangalore bengaluru hyderabad chennai kolkata pune ahmedabad jaipur sri lanka colombo ist utc+5:30',
      },
      {
        value: 'Asia/Kathmandu',
        label: 'Nepal Time (NPT / UTC+5:45) — Kathmandu',
        keywords: 'nepal kathmandu pokhara npt utc+5:45',
      },
      {
        value: 'Asia/Dhaka',
        label: 'Bangladesh Standard Time (BST / UTC+6) — Dhaka, Chittagong',
        keywords: 'bangladesh dhaka chittagong sylhet bhutan thimphu almaty kazakhstan bst utc+6',
      },
      {
        value: 'Asia/Yangon',
        label: 'Myanmar Time (MMT / UTC+6:30) — Yangon',
        keywords: 'myanmar burma yangon rangoon mandalay mmt utc+6:30',
      },
      {
        value: 'Asia/Bangkok',
        label: 'Indochina & Western Indonesia Time (ICT / UTC+7) — Bangkok, Jakarta, Ho Chi Minh City',
        keywords: 'thailand bangkok phuket chiang mai indonesia jakarta bali surabaya vietnam ho chi minh city hanoi cambodia phnom penh laos vientiane ict wib utc+7',
      },
      {
        value: 'Asia/Singapore',
        label: 'Singapore Time (SGT / UTC+8) — Singapore',
        keywords: 'singapore sgt utc+8',
      },
      {
        value: 'Asia/Kuala_Lumpur',
        label: 'Malaysia & Brunei Time (MYT / UTC+8) — Kuala Lumpur, Penang, Bandar Seri Begawan',
        keywords: 'malaysia kuala lumpur penang johor bahru kuching kota kinabalu brunei bandar seri begawan myt utc+8',
      },
      {
        value: 'Asia/Manila',
        label: 'Philippine Time (PHT / UTC+8) — Manila, Cebu, Davao',
        keywords: 'philippines manila quezon city cebu davao makati pht pst utc+8',
      },
      {
        value: 'Asia/Hong_Kong',
        label: 'Hong Kong Time (HKT / UTC+8) — Hong Kong, Macau',
        keywords: 'hong kong macau hkt utc+8',
      },
      {
        value: 'Asia/Shanghai',
        label: 'China & Taiwan Time (CST / UTC+8) — Beijing, Shanghai, Shenzhen, Taipei',
        keywords: 'china beijing shanghai shenzhen guangzhou chengdu hangzhou taiwan taipei kaohsiung cst utc+8',
      },
      {
        value: 'Asia/Seoul',
        label: 'Korea Standard Time (KST / UTC+9) — Seoul, Busan',
        keywords: 'south korea seoul busan incheon kst utc+9',
      },
      {
        value: 'Asia/Tokyo',
        label: 'Japan Standard Time (JST / UTC+9) — Tokyo, Osaka, Yokohama',
        keywords: 'japan tokyo osaka kyoto yokohama nagoya sapporo jst utc+9',
      },
    ],
  },
  {
    label: 'Australia, New Zealand & Pacific',
    options: [
      {
        value: 'Australia/Perth',
        label: 'Australian Western Time (AWST / UTC+8) — Perth',
        keywords: 'australia western australia perth awst utc+8',
      },
      {
        value: 'Australia/Darwin',
        label: 'Australian Central Standard Time (ACST / UTC+9:30) — Darwin',
        keywords: 'australia northern territory darwin acst utc+9:30',
      },
      {
        value: 'Australia/Adelaide',
        label: 'Australian Central Time (ACST/ACDT / UTC+9:30) — Adelaide',
        keywords: 'australia south australia adelaide acst acdt utc+9:30',
      },
      {
        value: 'Australia/Brisbane',
        label: 'Australian Eastern Standard Time (AEST / UTC+10) — Brisbane, Gold Coast, Port Moresby',
        keywords: 'australia queensland brisbane gold coast cairns papua new guinea port moresby guam aest utc+10',
      },
      {
        value: 'Australia/Sydney',
        label: 'Australian Eastern Time (AEST/AEDT / UTC+10) — Sydney, Melbourne, Canberra, Hobart',
        keywords: 'australia new south wales sydney victoria melbourne canberra tasmania hobart aest aedt utc+10',
      },
      {
        value: 'Pacific/Fiji',
        label: 'Fiji & Pacific Islands Time (FJT / UTC+12) — Suva, Solomon Islands, Vanuatu',
        keywords: 'fiji suva nadi solomon islands honiara vanuatu port vila tuvalu kiribati fjt utc+12',
      },
      {
        value: 'Pacific/Auckland',
        label: 'New Zealand Time (NZST/NZDT / UTC+12) — Auckland, Wellington, Christchurch',
        keywords: 'new zealand auckland wellington christchurch hamilton queenstown samoa apia tonga nzst nzdt utc+12',
      },
    ],
  },
];

export const ALL_TIMEZONES: (TimezoneOption & { group: string })[] = TIMEZONE_GROUPS.flatMap((g) =>
  g.options.map((opt) => ({ ...opt, group: g.label }))
);
