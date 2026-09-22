// Authored updates applied by scripts/extract-reference-syllabus.mjs on top of the
// prelims/mains seed data extracted from the reference bundles.
//
// The official UPSC Mains GS syllabus covers more ground than the reference seed:
//   - GS1 also includes "Salient features of world's physical geography" and the
//     distribution of natural resources / location of industries → subject "Geography".
//   - GS2 also includes welfare schemes, vulnerable sections, health/education and
//     poverty & hunger → subject "Social Justice".
//   - GS3 also includes extremism, cyber security, money laundering, border security
//     and security forces & agencies → subject "Internal Security".
//
// Weights are authored on the same scale as the surrounding subjects; the extraction
// script rebalances every paper so subject weights sum exactly to the paper weightage
// (cascading proportionally into chapters → topics → subtopics).
// Structure mirrors the shared Schema: subject -> chapters -> topics -> subtopics.

export const mainsSubjectUpdates = {
  GS1: {
    title: 'Geography',
    description: "Salient features of world's physical geography; natural resources; location of industries",
    weightage: 3.5,
    chapters: [
      {
        title: "World's Physical Geography",
        description: 'Salient physical features of the world and geophysical phenomena',
        weightage: 1.8,
        topics: [
          {
            title: 'Geomorphic Hazards & Earth Dynamics',
            description: 'Earthquakes, tsunamis, volcanic activity and tectonics',
            weightage: 0.9,
            subtopics: [
              { title: 'Earthquakes', description: 'Causes, waves, measurement, belts, impacts & mitigation', weightage: 0.23 },
              { title: 'Tsunamis', description: 'Generation, propagation, 2004 Indian Ocean tsunami, warning systems', weightage: 0.22 },
              { title: 'Volcanic Activity', description: 'Types of volcanoes & eruptions, volcanic landforms, Ring of Fire', weightage: 0.23 },
              { title: 'Plate Tectonics & Landforms', description: 'Continental drift, plate boundaries, mountain building, major landforms', weightage: 0.22 },
            ],
          },
          {
            title: 'Climate & Weather Systems',
            description: 'Atmospheric circulation and climatic phenomena',
            weightage: 0.9,
            subtopics: [
              { title: 'Cyclones', description: 'Tropical & temperate cyclones, formation, naming, Indian coasts', weightage: 0.23 },
              { title: 'Pressure Belts & Winds', description: 'Planetary winds, monsoons, jet streams, El Niño & La Niña', weightage: 0.22 },
              { title: 'Climate Regions', description: 'Salient features of world climate zones, climate change signals', weightage: 0.23 },
              { title: 'Hydrological Features', description: 'Major rivers, lakes, ocean currents & their geographical significance', weightage: 0.22 },
            ],
          },
        ],
      },
      {
        title: 'Natural Resources & Location of Industries',
        description: 'Resource distribution and factors locating economic activity',
        weightage: 1.7,
        topics: [
          {
            title: 'Distribution of Key Natural Resources',
            description: 'World-wide distribution including South Asia & the Indian sub-continent',
            weightage: 0.9,
            subtopics: [
              { title: 'Mineral Resources', description: 'Iron, coal, petroleum & other minerals — global & Indian belts', weightage: 0.3 },
              { title: 'Energy Resources', description: 'Conventional & renewable energy sources, distribution & transition', weightage: 0.3 },
              { title: 'Water, Soil & Land Resources', description: 'Freshwater reserves, soil types, land use & degradation', weightage: 0.3 },
            ],
          },
          {
            title: 'Location of Industries',
            description: 'Primary, secondary & tertiary sector location across the world (incl. India)',
            weightage: 0.8,
            subtopics: [
              { title: 'Sector-wise Location Patterns', description: 'Primary, secondary & tertiary industries — global distribution', weightage: 0.27 },
              { title: 'Factors Responsible for Location', description: 'Raw material, market, labour, transport, capital & policy factors', weightage: 0.27 },
              { title: 'Industrial Location in India', description: 'Major industrial regions, shifts & contemporary locational changes', weightage: 0.26 },
            ],
          },
        ],
      },
    ],
  },

  GS2: {
    title: 'Social Justice',
    description: 'Welfare schemes, vulnerable sections, health & education, poverty and hunger',
    weightage: 4,
    chapters: [
      {
        title: 'Welfare Schemes & Vulnerable Sections',
        description: 'Central & State schemes and mechanisms protecting vulnerable populations',
        weightage: 1.4,
        topics: [
          {
            title: 'Welfare Schemes for Vulnerable Sections',
            description: 'Schemes by Centre and States and their performance',
            weightage: 0.7,
            subtopics: [
              { title: 'Major Central Sector Schemes', description: 'Flagship welfare programmes for women, children, elderly & disabled', weightage: 0.24 },
              { title: 'State Welfare Initiatives', description: 'State-level schemes, cooperative federalism in welfare delivery', weightage: 0.23 },
              { title: 'Performance of Schemes', description: 'Outcomes, implementation gaps, DBT, social audit & evaluation', weightage: 0.23 },
            ],
          },
          {
            title: 'Protective Mechanisms & Institutions',
            description: 'Laws, institutions and bodies for protection & betterment',
            weightage: 0.7,
            subtopics: [
              { title: 'Protective Laws', description: 'Legislation for SC/ST, women, children, elderly, disabled & transgenders', weightage: 0.24 },
              { title: 'Constitutional & Statutory Bodies', description: 'Commissions & authorities — mandates and functioning', weightage: 0.23 },
              { title: 'Role of Civil Society', description: 'NGOs, SHGs, community participation in empowerment', weightage: 0.23 },
            ],
          },
        ],
      },
      {
        title: 'Health, Education & Human Resources',
        description: 'Development & management of social sector services',
        weightage: 1.4,
        topics: [
          {
            title: 'Health Sector Issues',
            description: 'Health challenges, infrastructure and programmes',
            weightage: 0.7,
            subtopics: [
              { title: 'Health Challenges', description: 'Communicable & lifestyle diseases, maternal & child health', weightage: 0.24 },
              { title: 'Health Infrastructure & Human Resources', description: 'Hospitals, doctor–population ratios, health workforce', weightage: 0.23 },
              { title: 'Health Programmes & Policy', description: 'National Health Mission, Ayushman Bharat, health financing', weightage: 0.23 },
            ],
          },
          {
            title: 'Education & Skill Development',
            description: 'Education access, quality and human resource development',
            weightage: 0.7,
            subtopics: [
              { title: 'School Education', description: 'Access, learning outcomes, mid-day scheme, dropout issues', weightage: 0.24 },
              { title: 'Higher Education & Skill Development', description: 'Universities, vocational training, Skill India, employability', weightage: 0.23 },
              { title: 'Education Policy & Literacy', description: 'National Education Policy, literacy missions, digital education', weightage: 0.23 },
            ],
          },
        ],
      },
      {
        title: 'Poverty, Hunger & Food Security',
        description: 'Poverty and hunger — measurement, causes and interventions',
        weightage: 1.2,
        topics: [
          {
            title: 'Poverty & Hunger',
            description: 'Estimation, trends and dimensions of deprivation',
            weightage: 0.6,
            subtopics: [
              { title: 'Poverty Estimation & Trends', description: 'Poverty lines, multidimensional poverty, committees & debates', weightage: 0.3 },
              { title: 'Hunger & Malnutrition', description: 'Global Hunger Index, stunting & wasting, hidden hunger', weightage: 0.3 },
            ],
          },
          {
            title: 'Food Security & PDS',
            description: 'Institutional responses to hunger',
            weightage: 0.6,
            subtopics: [
              { title: 'National Food Security Act', description: 'NFSA entitlements, coverage and implementation issues', weightage: 0.3 },
              { title: 'PDS & Buffer Management', description: 'Targeted PDS, procurement, buffer stocks, grain storage challenges', weightage: 0.3 },
            ],
          },
        ],
      },
    ],
  },

  GS3: {
    title: 'Internal Security',
    description: 'Extremism, cyber security, money laundering, border security and security forces',
    weightage: 3.5,
    chapters: [
      {
        title: 'Extremism & Insurgency',
        description: 'Development–extremism linkages and internal disturbances',
        weightage: 0.9,
        topics: [
          {
            title: 'Development & Spread of Extremism',
            description: 'Linkages between development and spread of extremism',
            weightage: 0.5,
            subtopics: [
              { title: 'Development–Extremism Linkages', description: 'Governance deficits, displacement & deprivation as drivers', weightage: 0.25 },
              { title: 'Left Wing Extremism (Naxalism)', description: 'Origins, spread, affected districts & government strategy', weightage: 0.25 },
            ],
          },
          {
            title: 'Insurgency & Radicalization',
            description: 'Regional insurgencies and radicalization trends',
            weightage: 0.4,
            subtopics: [
              { title: 'North-East Insurgency', description: 'Causes, groups, peace accords & AFSPA debate', weightage: 0.2 },
              { title: 'Radicalization & Counter-Radicalization', description: 'Online radicalization, de-radicalization programmes', weightage: 0.2 },
            ],
          },
        ],
      },
      {
        title: 'Cyber, Media & Financial Threats',
        description: 'Security challenges through communication networks, media and money flows',
        weightage: 1.2,
        topics: [
          {
            title: 'External Actors & Communication Networks',
            description: 'Role of external state & non-state actors',
            weightage: 0.4,
            subtopics: [
              { title: 'External State & Non-State Actors', description: 'Proxy war, terror financing & subversion by external actors', weightage: 0.2 },
              { title: 'Challenges via Communication Networks', description: 'Encrypted platforms, dark web, surveillance frameworks', weightage: 0.2 },
            ],
          },
          {
            title: 'Cyber Security & Social Media',
            description: 'Basics of cyber security and media-related challenges',
            weightage: 0.4,
            subtopics: [
              { title: 'Cyber Security Basics', description: 'Cyber attacks, critical infrastructure protection, cyber command', weightage: 0.2 },
              { title: 'Media & Social Networking Sites', description: 'Fake news, propaganda, social media regulation & fact-checking', weightage: 0.2 },
            ],
          },
          {
            title: 'Money Laundering & Its Prevention',
            description: 'Financial crime threatening internal security',
            weightage: 0.4,
            subtopics: [
              { title: 'Money Laundering & PMLA', description: 'Stages of laundering, Prevention of Money Laundering Act, ED', weightage: 0.2 },
              { title: 'Hawala & Global Frameworks', description: 'Hawala networks, FATF, terror financing linkages', weightage: 0.2 },
            ],
          },
        ],
      },
      {
        title: 'Border Security & Organized Crime',
        description: 'Security challenges in border areas and crime syndicates',
        weightage: 0.7,
        topics: [
          {
            title: 'Border Area Security Challenges',
            description: 'Security challenges and their management in border areas',
            weightage: 0.35,
            subtopics: [
              { title: 'Border Management', description: 'Porous borders, infiltration, fencing, CIBMS & border roads', weightage: 0.18 },
              { title: 'Border-Crime & Terror Linkages', description: 'Narcotics & arms smuggling, cross-border terrorism', weightage: 0.17 },
            ],
          },
          {
            title: 'Organized Crime & Terrorism Nexus',
            description: 'Linkages of organized crime with terrorism',
            weightage: 0.35,
            subtopics: [
              { title: 'Organized Crime Syndicates', description: 'Structure, operations & urban crime networks', weightage: 0.18 },
              { title: 'Crime–Terror Nexus', description: 'Convergence of crime and terror financing, MCOCA & UAPA', weightage: 0.17 },
            ],
          },
        ],
      },
      {
        title: 'Security Forces & Agencies',
        description: 'Various security forces and agencies and their mandate',
        weightage: 0.7,
        topics: [
          {
            title: 'Forces, Agencies & Coordination',
            description: 'Architecture of India’s internal security apparatus',
            weightage: 0.7,
            subtopics: [
              { title: 'Central Armed Police Forces', description: 'CRPF, BSF, CISF, ITB & SSB — mandates and deployment', weightage: 0.24 },
              { title: 'Intelligence & Investigation Agencies', description: 'IB, RAW, NIA, ED — roles and accountability', weightage: 0.23 },
              { title: 'Coordination & Reforms', description: 'Centre–State coordination, NATGRID, police reforms', weightage: 0.23 },
            ],
          },
        ],
      },
    ],
  },
};
