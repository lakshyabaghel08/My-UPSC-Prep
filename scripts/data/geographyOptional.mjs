// Geography Optional (UPSC CSE) — full operational syllabus
// Paper 1: Physical Geography (Principles of Physical Geography) + Human Geography
// Paper 2: Geography of India
// Structure mirrors the shared Schema: paper -> subjects -> chapters -> topics -> subtopics.
// Authored for PREPTRACK; informed by the official UPSC Geography optional syllabus.
//
// Weightage note: the numbers here are authored relative weights (chapter totals sum to
// their subject, topic totals sum to their chapter). The extraction pipeline rebalances
// them proportionally so subject totals sum exactly to the paper weightage (50 each).

export const geographyOptional = {
  papers: [
    {
      title: 'Geography Optional — Paper I',
      code: 'GEO-P1',
      description: 'Principles of Physical Geography & Human Geography · 250 Marks',
      category: 'optional',
      isOptional: true,
      weightage: 50,
      subjects: [
        {
          title: 'Geomorphology',
          description: 'Origin and evolution of landforms; earth interior; plate tectonics; erosional processes',
          weightage: 25,
          chapters: [
            {
              title: 'Earth & Its Interior',
              description: 'Spherical coordinates, earth interior, isostasy, polar wandering',
              weightage: 12,
              topics: [
                {
                  title: 'Earth as a Planet & Basic Concepts',
                  description: 'Geomorphology & its scope; earth in the solar system; latitudes and longitudes',
                  weightage: 3,
                  subtopics: [
                    { title: 'Nature & Scope of Geomorphology', description: 'Fundamental concepts, uniformitarianism vs catastrophism, geologic time scale' },
                    { title: 'Earth in the Solar System', description: 'Origin theories, shape, size, rotation and revolution effects' },
                    { title: 'Latitudes & Longitudes', description: 'Graticule, great circles, international date line, time zones' },
                    { title: 'Remote Sensing in Geomorphology', description: 'Aerial photographs, satellite imagery, GIS applications in landform studies' },
                  ],
                },
                {
                  title: 'Earth’s Interior & Isostasy',
                  description: 'Internal structure of earth, isostatic adjustment, gravity anomalies',
                  weightage: 4.5,
                  subtopics: [
                    { title: 'Sources of Information', description: 'Direct & indirect sources — seismic waves, meteorites, density and pressure data' },
                    { title: 'Structure of the Interior', description: 'Crust, mantle, core; SIAL & SIMA; discontinuities (Moho, Gutenberg, Lehmann)' },
                    { title: 'Isostasy Theories', description: 'Airy, Pratt & Hayford–Bowie concepts; Vening Meinesz flexural model' },
                    { title: 'Gravity Anomalies', description: 'Free-air & Bouguer anomalies, isostatic compensation' },
                  ],
                },
                {
                  title: 'Polar Wandering & Continental Drift',
                  description: 'Preludes to plate tectonics — early mobilism',
                  weightage: 2.5,
                  subtopics: [
                    { title: 'Polar Wandering', description: 'Apparent & true polar wander, palaeomagnetic evidence' },
                    { title: 'Wegener’s Continental Drift', description: 'Evidence — jigsaw fit, geology, fossils, palaeoclimate; criticisms' },
                    { title: 'Sea-floor Spreading', description: 'Harry Hess’ concept, magnetic stripes, palaeomagnetism, Vine–Matthews hypothesis' },
                  ],
                },
                {
                  title: 'Plate Tectonics',
                  description: 'The unifying theory — plates, boundaries, mechanisms',
                  weightage: 5.5,
                  subtopics: [
                    { title: 'Lithosphere & Plates', description: 'Major, minor & micro plates; plate margins and their characteristics' },
                    { title: 'Divergent Boundaries', description: 'Mid-oceanic ridges, rift valleys, constructives margins' },
                    { title: 'Convergent Boundaries', description: 'Ocean–ocean, ocean–continent, continent–continent collision; subduction & orogeny' },
                    { title: 'Transform Boundaries', description: 'Strike-slip faults, San Andreas fault system' },
                    { title: 'Driving Mechanisms & Mantle Convection', description: 'Slab pull, ridge push, convection cells, hotspots & plumes' },
                    { title: 'Mountain Building & Plate Tectonics', description: 'Andean, Cordilleran & Himalayan orogenies; island arcs' },
                  ],
                },
              ],
            },
            {
              title: 'Endogenetic Processes & Landforms',
              description: 'Diastrophism, volcanism, earthquakes; folds, faults and associated landforms',
              weightage: 14,
              topics: [
                {
                  title: 'Diastrophism',
                  description: 'Epeirogenic & orogenic movements; folding and faulting',
                  weightage: 5,
                  subtopics: [
                    { title: 'Epeirogeny & Orogeny', description: 'Vertical vs horizontal movements, upliftment & subsidence' },
                    { title: 'Folding', description: 'Anticlines, synclines, fold types & geometry, fold mountains' },
                    { title: 'Faulting', description: 'Normal, reverse, thrust & strike-slip faults; rift valleys, block mountains' },
                    { title: 'Joints & Unconformities', description: 'Types of joints; angular & disconformities' },
                  ],
                },
                {
                  title: 'Volcanism',
                  description: 'Volcanic activity, products, landforms and distribution',
                  weightage: 4.5,
                  subtopics: [
                    { title: 'Types of Volcanoes', description: 'Shield, composite, cinder cone, caldera; fissure eruptions, flood basalts' },
                    { title: 'Volcanic Products', description: 'Lava types (aa, pahoehoe), pyroclastics, gases; geysers & hot springs' },
                    { title: 'Intrusive Forms', description: 'Batholiths, laccoliths, lopoliths, phacoliths, sills & dykes' },
                    { title: 'Global Distribution', description: 'Ring of Fire, mid-oceanic volcanism, hot-spot volcanism (Hawaii), island arcs' },
                    { title: 'Volcanic Hazards & Benefits', description: 'Eruption hazards, volcanic soils, geothermal energy, mineralisation' },
                  ],
                },
                {
                  title: 'Earthquakes',
                  description: 'Seismicity, waves, measurement and distribution',
                  weightage: 4.5,
                  subtopics: [
                    { title: 'Causes & Types', description: 'Tectonic, volcanic, collapse & explosion earthquakes; foreshocks & aftershocks' },
                    { title: 'Seismic Waves & Measurement', description: 'P, S & surface waves; Richter & Mercalli scales; seismographs; focus & epicentre' },
                    { title: 'Global Distribution', description: 'Circum-Pacific belt, Alpine–Himalayan belt, mid-oceanic ridges' },
                    { title: 'Seismic Hazard & Mitigation', description: 'Tsunamis, liquefaction, earthquake-resistant design, seismic zoning of India' },
                  ],
                },
              ],
            },
            {
              title: 'Exogenetic Processes & Landforms',
              description: 'Weathering, mass wasting, erosion cycles and work of geomorphic agents',
              weightage: 16,
              topics: [
                {
                  title: 'Weathering & Mass Movement',
                  description: 'Rock decay, denudation chronology, slope evolution',
                  weightage: 4.5,
                  subtopics: [
                    { title: 'Physical Weathering', description: 'Frost wedging, thermal expansion, salt weathering, pressure release' },
                    { title: 'Chemical Weathering', description: 'Hydrolysis, oxidation, carbonation, solution; karst pre-conditioning' },
                    { title: 'Biological Weathering', description: 'Root action, burrowing, chelation, lichen activity' },
                    { title: 'Mass Wasting', description: 'Creep, landslides, slumping, debris flows; slope stability & factor of safety' },
                    { title: 'Slope Evolution Models', description: 'Davis (declining slope), Penck (waxing/waning), King (parallel retreat)' },
                  ],
                },
                {
                  title: 'Cyclic & Non-cyclic Geomorphology',
                  description: 'Davis cycle, Penck model, fluvial dominance debates',
                  weightage: 3,
                  subtopics: [
                    { title: 'Geographical Cycle (Davis)', description: 'Youth, maturity, old age; peneplanation; critique' },
                    { title: 'Penck’s Model', description: 'Primarrumpf, aufsteigende & absteigende Entwicklung' },
                    { title: 'Alternatives to the Cycle', description: 'Hack dynamic equilibrium, magnitude–frequency concepts' },
                  ],
                },
                {
                  title: 'Fluvial Geomorphology',
                  description: 'Drainage systems, channel processes and landforms',
                  weightage: 5,
                  subtopics: [
                    { title: 'Drainage Systems', description: 'Dendritic, trellis, radial, centripetal, annular patterns; drainage density & texture' },
                    { title: 'Channel Morphology', description: 'Long profile, knick points, meanders, braiding, terraces, alluvial fans & deltas' },
                    { title: 'Fluvial Erosion & Deposition', description: 'Hydraulic action, corrasion, corrosion; potholes, gorges, waterfalls, floodplains, levees' },
                    { title: 'River Rejuvenation', description: 'Eustatic & static rejuvenation, valley-in-valley, incised meanders' },
                    { title: 'Applied Fluvial Geomorphology', description: 'Flood management, river training, reservoir sedimentation' },
                  ],
                },
                {
                  title: 'Glacial, Periglacial & Aeolian Geomorphology',
                  description: 'Cold and arid landform assemblages',
                  weightage: 5,
                  subtopics: [
                    { title: 'Glacial Erosion & Deposition', description: 'Cirques, arêtes, horns, U-valleys, moraines, drumlins, eskers, outwash plains' },
                    { title: 'Periglacial Processes', description: 'Frost action, patterned ground, solifluction, pingos, permafrost' },
                    { title: 'Aeolian Processes', description: 'Deflation & abrasion; yardangs, zeugens, mushroom rocks; dunes (barchan, seif, parabolic), loess' },
                  ],
                },
                {
                  title: 'Karst, Coastal & Applied Geomorphology',
                  description: 'Solution landforms, marine processes, applied perspectives',
                  weightage: 3.5,
                  subtopics: [
                    { title: 'Karst Landforms', description: 'Sinkholes, dolines, uvalas, poljes, caves, stalactites & stalagmites' },
                    { title: 'Coastal Landforms', description: 'Cliffs, wave-cut platforms, sea caves, arches, stacks; beaches, spits, bars, tombolos; coral reefs (fringing, barrier, atoll — Darwin & Daly theories)' },
                    { title: 'Applied Geomorphology', description: 'Geomorphic hazards, urban geomorphology, mineral & groundwater prospecting, engineering projects' },
                    { title: 'Geomorphology & Climate Change', description: 'Response of landform systems to global warming; cryosphere changes' },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Climatology',
          description: 'Atmosphere, insolation, circulation, world climates and climate change',
          weightage: 25,
          chapters: [
            {
              title: 'Atmosphere — Fundamentals',
              description: 'Composition, structure, insolation and heat budget',
              weightage: 11,
              topics: [
                {
                  title: 'Composition & Structure of Atmosphere',
                  description: 'Gaseous composition; thermal layering',
                  weightage: 3.5,
                  subtopics: [
                    { title: 'Composition', description: 'Nitrogen, oxygen, argon, CO₂, ozone, water vapour, aerosols, particulates' },
                    { title: 'Thermal Structure', description: 'Troposphere, stratosphere, mesosphere, thermosphere, exosphere; lapse rate & tropopause' },
                    { title: 'Weather vs Climate', description: 'Elements of weather & climate; scope of climatology' },
                  ],
                },
                {
                  title: 'Insolation & Heat Budget',
                  description: 'Solar radiation, temperature distribution, heat budget of the earth',
                  weightage: 4,
                  subtopics: [
                    { title: 'Insolation Factors', description: 'Angle of incidence, day length, transparency; albedo' },
                    { title: 'Heat Budget', description: 'Budget of atmosphere & earth, greenhouse effect, energy balance' },
                    { title: 'Horizontal & Vertical Temperature Distribution', description: 'Latitudinal, seasonal and altitude variations; temperature inversion' },
                    { title: 'Temperature Controls', description: 'Latitude, altitude, distance from sea, ocean currents, slope, winds' },
                  ],
                },
                {
                  title: 'Pressure & Winds',
                  description: 'Atmospheric pressure belts and planetary wind systems',
                  weightage: 3.5,
                  subtopics: [
                    { title: 'Pressure Belts', description: 'Equatorial low, subtropical highs, subpolar lows, polar highs; seasonal shifting' },
                    { title: 'Planetary Winds', description: 'Trade winds, westerlies, polar easterlies; Coriolis effect; doldrums & horse latitudes' },
                    { title: 'Secondary & Local Winds', description: 'Cyclonic & anticyclonic winds; land & sea breezes, mountain & valley winds, foehn, chinook, mistral, bora, loo' },
                    { title: 'Jet Streams', description: 'Subtropical & polar-front jets, seasonal migration, role in Indian monsoon' },
                  ],
                },
              ],
            },
            {
              title: 'Moisture, Air Masses & Disturbances',
              description: 'Humidity, precipitation, air masses, fronts and cyclones',
              weightage: 9,
              topics: [
                {
                  title: 'Atmospheric Moisture',
                  description: 'Humidity, condensation and precipitation forms',
                  weightage: 4,
                  subtopics: [
                    { title: 'Evaporation & Humidity', description: 'Absolute, specific & relative humidity; dew point; factors controlling evaporation' },
                    { title: 'Condensation Forms', description: 'Dew, frost, fog (radiation, advection), mist, smog; cloud classification (Stratus, Cumulus, Cirrus, Nimbus families)' },
                    { title: 'Precipitation Types', description: 'Convectional, orographic & cyclonic/frontal rainfall; rain shadow effect' },
                    { title: 'World Distribution of Precipitation', description: 'Zonal & seasonal patterns; reliability of rainfall' },
                  ],
                },
                {
                  title: 'Air Masses, Fronts & Cyclones',
                  description: 'Synoptic climatology of middle latitudes & tropics',
                  weightage: 5,
                  subtopics: [
                    { title: 'Air Masses', description: 'Source regions; cP, mP, cT, mT, equatorial; modification' },
                    { title: 'Fronts', description: 'Warm, cold, stationary & occluded fronts; frontogenesis' },
                    { title: 'Tropical Cyclones', description: 'Formation conditions, structure (eye, eye-wall), distribution, naming; hurricane, typhoon, Willy-Willy' },
                    { title: 'Temperate (Wave) Cyclones', description: 'Polar front theory, life cycle, associated weather' },
                    { title: 'Thunderstorms & Tornadoes', description: 'Local severe storms, lightning, hail; global distribution' },
                  ],
                },
              ],
            },
            {
              title: 'World Climates & Climate Change',
              description: 'Classification schemes and contemporary climate dynamics',
              weightage: 5,
              topics: [
                {
                  title: 'Climatic Classification',
                  description: 'Köppen, Thornthwaite and Trewartha schemes',
                  weightage: 2.5,
                  subtopics: [
                    { title: 'Köppen Classification', description: 'A, B, C, D, E types & subtypes; merits & demerits; world distribution' },
                    { title: 'Thornthwaite Classification', description: 'PE index, moisture index, thermal efficiency; 1931 vs 1948 schemes' },
                    { title: 'Trewartha & Other Schemes', description: 'Modified Köppen–Trewartha; application to India' },
                  ],
                },
                {
                  title: 'Climate Change',
                  description: 'Past climates, forcing factors, evidence and responses',
                  weightage: 2.5,
                  subtopics: [
                    { title: 'Climates of Geological Past', description: 'Ice ages, glacial–interglacial cycles, Milankovitch cycles, Little Ice Age' },
                    { title: 'Global Warming', description: 'Greenhouse gases, radiative forcing, IPCC assessment summaries, observed trends' },
                    { title: 'Impacts & Adaptation', description: 'Sea-level rise, glacier retreat, extreme events, impacts on agriculture & monsoon' },
                    { title: 'Mitigation & Policy', description: 'UNFCCC, Paris Agreement, carbon budgets, net-zero pathways, El Niño/La Niña (ENSO)' },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Oceanography',
          description: 'Ocean bottom relief, temperature & salinity, currents, marine resources, coral reefs, sea-level change',
          weightage: 20,
          chapters: [
            {
              title: 'Ocean Basins & Hydrography',
              description: 'Relief of ocean floors, physical & chemical properties of sea water',
              weightage: 10,
              topics: [
                {
                  title: 'Bottom Relief of Oceans',
                  description: 'Continental shelf to deep sea; major ocean ridges',
                  weightage: 4,
                  subtopics: [
                    { title: 'Continental Shelf & Slope', description: 'Width, resources, shelf seas; continental rise; submarine canyons & turbidity currents' },
                    { title: 'Abyssal Plains & Trenches', description: 'Deep-sea plains, guyots & seamounts, hadal trenches, ring of fire connection' },
                    { title: 'Mid-Oceanic Ridges', description: 'Global ridge system, transform faults, hydrothermal vents & chemosynthesis' },
                    { title: 'Coral & Non-coral Relief', description: 'Bank, shoal, reef platforms; comparison of Atlantic, Pacific & Indian Ocean floors' },
                  ],
                },
                {
                  title: 'Temperature & Salinity of Oceans',
                  description: 'Horizontal & vertical distribution; thermocline & halocline',
                  weightage: 6,
                  subtopics: [
                    { title: 'Ocean Temperature', description: 'Factors — latitude, currents, depth; horizontal & vertical (thermocline) distribution; diurnal & annual range' },
                    { title: 'Ocean Salinity', description: 'Sources of salts; factors — evaporation, precipitation, river influx, ice; horizontal & vertical distribution' },
                    { title: 'Density Stratification', description: 'Pycnocline, T–S diagrams, water masses of the oceans' },
                    { title: 'Sea Ice', description: 'Pack ice, icebergs, ice shelves; polar oceanography' },
                  ],
                },
              ],
            },
            {
              title: 'Ocean Dynamics & Resources',
              description: 'Currents, tides, marine resources and their exploitation',
              weightage: 10,
              topics: [
                {
                  title: 'Ocean Currents & Tides',
                  description: 'Circulation of ocean waters; causes, types and effects',
                  weightage: 4,
                  subtopics: [
                    { title: 'Current Systems', description: 'Gyres, equatorial currents, Gulf Stream–North Atlantic Drift, Kuroshio, Humboldt, Benguela, Agulhas, Somali current' },
                    { title: 'Causes & Effects of Currents', description: 'Wind-driven vs thermohaline circulation (global conveyor belt); effects on climate & fisheries' },
                    { title: 'Ocean Tides', description: 'Origin (gravitational), spring & neap tides, tidal bores; tidal energy potential & sites' },
                    { title: 'Ocean Waves', description: 'Wave generation & motion, tsunami waves, wave energy' },
                  ],
                },
                {
                  title: 'Marine Resources & Law of the Sea',
                  description: 'Biotic, mineral and energy resources; maritime governance',
                  weightage: 3.5,
                  subtopics: [
                    { title: 'Biotic Resources', description: 'Major fishing grounds (Grand Banks, Dogger, Japanese coast), upwelling & productivity, aquaculture, mariculture' },
                    { title: 'Mineral & Energy Resources', description: 'Offshore oil & gas, placer deposits, manganese nodules, gas hydrates, polymetallic sulphides; deep-sea mining issues' },
                    { title: 'UNCLOS & Maritime Zones', description: 'Territorial sea, EEZ, continental shelf, high seas, ISA; Blue Economy concept' },
                  ],
                },
                {
                  title: 'Coral Reefs & Sea-Level Change',
                  description: 'Reef formation theories and marine transgression',
                  weightage: 2.5,
                  subtopics: [
                    { title: 'Coral Reef Formation', description: 'Conditions for coral growth, fringing–barrier–atoll succession' },
                    { title: 'Reef Theories', description: 'Darwin subsidence theory, Daly glacial-control theory; coral bleaching & ocean acidification' },
                    { title: 'Sea-Level Changes', description: 'Eustatic, isostatic & tectonic changes; submerged & emergent coastlines, marine terraces; Indian Ocean sea-level trends' },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Biogeography',
          description: 'Soil genesis & classification; plant & animal distribution; ecosystem dynamics',
          weightage: 15,
          chapters: [
            {
              title: 'Soil Geography',
              description: 'Soil-forming processes, profiles, classifications and erosion',
              weightage: 7,
              topics: [
                {
                  title: 'Genesis & Classification of Soils',
                  description: 'Pedogenic processes and taxonomies',
                  weightage: 4,
                  subtopics: [
                    { title: 'Soil-forming Factors & Processes', description: 'Parent material, climate, biota, relief, time; podzolisation, laterisation, calcification, salinisation, gleisation' },
                    { title: 'Soil Profile', description: 'Horizons (O, A, E, B, C, R), solum, diagnostic horizons' },
                    { title: 'USDA Soil Taxonomy', description: '12 orders, key characteristics, world distribution' },
                    { title: 'Indian Soils', description: 'ICAR classification — alluvial, black, red, laterite, forest, arid, peaty & marshy; problems of Indian soils' },
                  ],
                },
                {
                  title: 'Soil Degradation & Conservation',
                  description: 'Erosion, degradation and management',
                  weightage: 3,
                  subtopics: [
                    { title: 'Soil Erosion', description: 'Water & wind erosion, gully & rill erosion, universal soil loss equation (USLE)' },
                    { title: 'Degradation Processes', description: 'Salinisation, alkalinisation, waterlogging, desertification, nutrient depletion' },
                    { title: 'Conservation Measures', description: 'Contour bunding, terracing, agroforestry, watershed management, soil health initiatives' },
                  ],
                },
              ],
            },
            {
              title: 'Biogeography & Ecosystems',
              description: 'Plant and animal world; ecological balance; biomes',
              weightage: 8,
              topics: [
                {
                  title: 'Biomes & Floral/Faunal Realms',
                  description: 'Major world biomes; zoogeographic regions',
                  weightage: 4,
                  subtopics: [
                    { title: 'Concept of Biome', description: 'Climate–vegetation relationships, ecotone, succession (prisere, seral stages)' },
                    { title: 'Major Terrestrial Biomes', description: 'Tropical rainforest, savanna, desert, Mediterranean, temperate grassland, deciduous & coniferous forest, tundra' },
                    { title: 'Zoogeographic Realms', description: 'Wallace’s realms, faunal distribution, island biogeography theory' },
                  ],
                },
                {
                  title: 'Ecosystem Dynamics',
                  description: 'Energy flow, nutrient cycles, biodiversity and human impacts',
                  weightage: 4,
                  subtopics: [
                    { title: 'Ecosystem Structure & Function', description: 'Producers, consumers, decomposers; food chains & webs, trophic levels, ecological pyramids' },
                    { title: 'Biogeochemical Cycles', description: 'Carbon, nitrogen, phosphorus, water & sulphur cycles' },
                    { title: 'Biodiversity', description: 'Hotspots, endemism, latitudinal gradients, threats, conservation strategies' },
                    { title: 'Ecological Balance & Human Impact', description: 'Deforestation, invasive species, pollution, Ramsar & biosphere reserves, rewilding' },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Environmental Geography',
          description: 'Human–ecological perspective; hazards & disasters; environmental management',
          weightage: 15,
          chapters: [
            {
              title: 'Environment–Ecology Interface',
              description: 'Concepts of environment, ecology and human adaptation',
              weightage: 7,
              topics: [
                {
                  title: 'Man–Environment Relationships',
                  description: 'Paradigms and contemporary sustainability debates',
                  weightage: 3.5,
                  subtopics: [
                    { title: 'Determinism & Possibilism', description: 'Ratzel, Semple, Huntington vs Febvre, Brunhes; neo-determinism (Griffith Taylor)' },
                    { title: 'Human Ecology & Adaptation', description: 'Cultural ecology, resource use systems, carrying capacity' },
                    { title: 'Sustainability Concepts', description: 'Sustainable development, SDGs, ecological footprint, planetary boundaries, doughnut economics' },
                    { title: 'Environmental Justice & Ethics', description: 'Distributional equity, deep ecology, stewardship, indigenous rights' },
                  ],
                },
                {
                  title: 'Global Environmental Issues',
                  description: 'Climate governance, biodiversity loss, pollution regimes',
                  weightage: 3.5,
                  subtopics: [
                    { title: 'Climate Governance', description: 'Kyoto, Paris, COP processes, common but differentiated responsibilities, climate finance' },
                    { title: 'Biodiversity Governance', description: 'CBD, Nagoya protocol, 30x30, REDD+' },
                    { title: 'Pollution & Waste', description: 'Transboundary pollution, plastic waste, e-waste, Stockholm & Basel conventions' },
                    { title: 'Environmental Movements', description: 'Chipko, Narmada Bachao Andolan, global environmentalism; EIA & public participation' },
                  ],
                },
              ],
            },
            {
              title: 'Hazards, Disasters & Management',
              description: 'Natural and human-induced hazards; frameworks of mitigation',
              weightage: 8,
              topics: [
                {
                  title: 'Hazards & Disasters — Framework',
                  description: 'Typology, vulnerability, resilience and risk',
                  weightage: 4,
                  subtopics: [
                    { title: 'Concepts & Typology', description: 'Hazard, disaster, risk, vulnerability, exposure, capacity, resilience; natural vs human-induced' },
                    { title: 'Geo-physical Hazards', description: 'Earthquakes, tsunamis, volcanic eruptions, landslides, avalanches' },
                    { title: 'Hydro-metrological Hazards', description: 'Floods, droughts, cyclones, heatwaves, sea-level rise' },
                    { title: 'Biological & Technological Hazards', description: 'Epidemics/pandemics, wildfires, industrial accidents, urban fires' },
                    { title: 'Disaster Profiles', description: 'Global & Indian disaster profile, disaster–development nexus, climate change as threat multiplier' },
                  ],
                },
                {
                  title: 'Disaster Management & Case Studies',
                  description: 'Cycles, institutions, and illustrative cases',
                  weightage: 4,
                  subtopics: [
                    { title: 'Management Cycle', description: 'Preparedness, mitigation, response, recovery, rehabilitation; Sendai Framework' },
                    { title: 'Institutional Architecture (India)', description: 'DM Act 2005, NDMA/SDMA/DDMA, NDRF/SDRF, early warning systems' },
                    { title: 'Case Studies', description: 'Bhuj & Bihar earthquakes, 2004 Indian Ocean tsunami, Kerala floods 2018, Odisha cyclones, Uttarakhand Kedarnath 2013' },
                    { title: 'Community-based DRR', description: 'Indigenous knowledge, last-mile warning, insurance & risk transfer' },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Perspectives in Human Geography',
          description: 'Evolution of geographic thought; paradigms and key concepts',
          weightage: 15,
          chapters: [
            {
              title: 'Evolution of Geographical Thought',
              description: 'From classical geography to modern paradigms',
              weightage: 7,
              topics: [
                {
                  title: 'Early & Classical Geography',
                  description: 'Contributions of ancient and pre-modern geographers',
                  weightage: 2.5,
                  subtopics: [
                    { title: 'Ancient Contributions', description: 'Greeks (Eratosthenes, Ptolemy, Strabo), Roman & Indian (Puranic, Kalidasa) traditions, Arab geographers (Al-Biruni, Ibn-Battuta)' },
                    { title: 'Age of Discoveries', description: 'Voyages, mercator, Varenius, Kant’s contributions' },
                    { title: 'Foundations of Modern Geography', description: 'Humboldt & Ritter, Ratzel & anthropogeography, regional geography (Vidal de la Blache, pays)' },
                  ],
                },
                {
                  title: 'Modern Paradigms & Concepts',
                  description: 'Quantitative revolution to critical geography',
                  weightage: 4.5,
                  subtopics: [
                    { title: 'Dualisms in Geography', description: 'Systematic vs regional, physical vs human, idiographic vs nomothetic' },
                    { title: 'Quantitative Revolution & Spatial Analysis', description: 'Schaefer’s critique, locational analysis, models in geography' },
                    { title: 'Behavioural & Humanistic Geography', description: 'Perception, cognitive maps, place & space, welfare geography' },
                    { title: 'Radical & Critical Geography', description: 'Marxist geography, structuration (Giddens), postmodernism, feminist geography' },
                    { title: 'Recent Directions', description: 'GIScience, digital humanities, geography of sustainability, ontological turns' },
                  ],
                },
              ],
            },
            {
              title: 'Core Concepts in Human Geography',
              description: 'Space, region, and society — organizing ideas',
              weightage: 8,
              topics: [
                {
                  title: 'Space & Society',
                  description: 'Fundamental concepts structuring human geography',
                  weightage: 4,
                  subtopics: [
                    { title: 'Concept of Space & Time', description: 'Absolute/relative space, time-space compression, distance decay' },
                    { title: 'Region Concept', description: 'Formal, functional & vernacular regions; regional synthesis & regionalization methods' },
                    { title: 'Areral Differentiation', description: 'Hartshorne’s perspective, chorology, areal differentiation debates' },
                    { title: 'Society–Space Interaction', description: 'Social spatialization, segregation, sense of place, topophilia' },
                  ],
                },
                {
                  title: 'Human Adaptation & World Development',
                  description: 'Cultural, economic and developmental perspectives',
                  weightage: 4,
                  subtopics: [
                    { title: 'Cultural Realms & Diffusion', description: 'World cultural realms, cultural diffusion (Sauer, Hägerstrand), cultural landscape' },
                    { title: 'Human Races & Tribes', description: 'Race concept critique, world tribal societies (Bushmen, Pygmy, Bedouin, Inuit, Kirghiz), habits & habitat' },
                    { title: 'Economic Activity Perspectives', description: 'Primary–quinary activities, stages of economic growth (Rostow), core–periphery (Wallerstein)' },
                    { title: 'Development & Underdevelopment', description: 'Indicators, HDI & alternatives, dependency & world-systems, globalization debates' },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Human Geography',
          description: 'Settlement, population, economic activities and transport geography',
          weightage: 15,
          chapters: [
            {
              title: 'Settlement & Population Geography',
              description: 'Rural–urban settlement patterns; demographic structures',
              weightage: 7,
              topics: [
                {
                  title: 'Settlement Geography',
                  description: 'Rural & urban settlement forms and functions',
                  weightage: 3.5,
                  subtopics: [
                    { title: 'Rural Settlement Types & Patterns', description: 'Compact, dispersed, linear, circular, star-like; factors — physical, ethnic & historical' },
                    { title: 'Rural House Types & Site', description: 'Building materials, morphology of villages, functional classification of rural settlements' },
                    { title: 'Urban Settlements', description: 'Urbanisation process, functional classification of towns (Harris), central place theory (Christaller & Lösch)' },
                    { title: 'Urban Morphology', description: 'CBD, zones, models of city structure (Burgess, Hoyt, Harris–Ullman), primate city, world cities' },
                  ],
                },
                {
                  title: 'Population Geography',
                  description: 'World population growth, distribution, migration and demographic transition',
                  weightage: 3.5,
                  subtopics: [
                    { title: 'Growth & Distribution', description: 'World population growth phases, density patterns, demographic of major regions' },
                    { title: 'Demographic Transition Theory', description: 'Stages, critiques, applicability to developing world, second demographic transition' },
                    { title: 'Migration', description: 'Types, Ravenstein’s laws, push–pull (Lee), Zelinsky hypothesis, consequences & remittances' },
                    { title: 'Population Composition & Policies', description: 'Age–sex structure, dependency ratio, ageing, over/under-population, population policies & optimal population' },
                  ],
                },
              ],
            },
            {
              title: 'Economic, Transport & Political Geography',
              description: 'Locational theories of industry & agriculture; transport networks; geopolitics',
              weightage: 8,
              topics: [
                {
                  title: 'Agricultural & Industrial Geography',
                  description: 'Locational analysis of primary and secondary activities',
                  weightage: 3.5,
                  subtopics: [
                    { title: 'Agricultural Location Theory', description: 'Von Thünen model & modifications, intensity & cropping patterns' },
                    { title: 'Agricultural Systems of the World', description: 'Shifting cultivation, plantation, dairy, Mediterranean, collective & state farms, green revolution' },
                    { title: 'Industrial Location Theory', description: 'Weber’s least-cost theory, Isard, Losch, behavioural & institutional approaches, industrial inertia' },
                    { title: 'Industrial Regions & Worlds of Production', description: 'Major industrial regions, deindustrialisation, new industrial spaces, technology parks, flexible production' },
                  ],
                },
                {
                  title: 'Transport & Trade Geography',
                  description: 'Networks, flows and economic integration',
                  weightage: 2.5,
                  subtopics: [
                    { title: 'Transport Networks', description: 'Graph-theoretic measures, accessibility & connectivity, transport cost curves, Ullman’s interaction theory' },
                    { title: 'Modes & Corridors', description: 'Rail, road, sea lanes, canals (Suez, Panama), straits, air transport; trans-continental corridors' },
                    { title: 'International Trade', description: 'Trade theories (absolute & comparative advantage), trade blocs, ports & hinterlands, free trade debates' },
                  ],
                },
                {
                  title: 'Political Geography & Contemporary Themes',
                  description: 'State, nation and emerging human-geographic issues',
                  weightage: 2,
                  subtopics: [
                    { title: 'State & Nation Concepts', description: 'Nation-state, frontiers & boundaries classification, heartland (Mackinder) & rimland (Spykman) theories' },
                    { title: 'Electoral & Geopolitics', description: 'Electoral geography, geopolitics of resources, contemporary geopolitical conflicts' },
                    { title: 'Social & Cultural Geography Issues', description: 'Language & religion distribution, ethnic enclaves, urban social problems, gender geography' },
                    { title: 'Contemporary Themes', description: 'Sustainable development geography, environmental justice, digital divide, pandemic geography' },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Regional Planning',
          description: 'Growth pole theory, growth centres, planning for backward/hill/tribal areas, sustainable development & environmental planning',
          weightage: 6.5,
          chapters: [
            {
              title: 'Growth Theories, Growth Centres & Regional Imbalance',
              description: 'Growth pole theory & growth centres; problems of regional imbalance',
              weightage: 2.5,
              topics: [
                {
                  title: 'Growth Pole Theory & Growth Centres',
                  description: 'Theoretical foundations of growth-focused regional development',
                  weightage: 1.3,
                  subtopics: [
                    { title: 'Growth Pole Theory', description: 'Perroux’s growth poles, propulsive industries, polarization & spread effects' },
                    { title: 'Growth Centres & Growth Corridors', description: 'Types & hierarchy of growth centres, growth corridors & development axes' },
                    { title: 'Trickle-Down & Backwash Effects', description: 'Myrdal’s backwash & spread, Hirschman’s trickle-down, cumulative causation' },
                  ],
                },
                {
                  title: 'Problems of Regional Imbalance & Planning',
                  description: 'Concepts, indicators and approaches to regional planning',
                  weightage: 1.2,
                  subtopics: [
                    { title: 'Concepts & Objectives of Regional Planning', description: 'Planning regions (nodal, homogeneous), objectives & types of regional planning' },
                    { title: 'Regional Imbalance — Indicators & Patterns', description: 'Regional disparities, per-capita indicators, core–periphery contrasts' },
                    { title: 'Approaches to Regional Planning', description: 'Top-down & bottom-up planning, regionalization for planning, decentralised planning' },
                  ],
                },
              ],
            },
            {
              title: 'Area-Specific & Environmental Planning',
              description: 'Planning for backward, hill & tribal areas; sustainable development & environmental planning',
              weightage: 2,
              topics: [
                {
                  title: 'Planning for Backward, Hill & Tribal Areas',
                  description: 'Targeted planning for disadvantaged regions',
                  weightage: 1,
                  subtopics: [
                    { title: 'Backward Area Planning & Programmes', description: 'Identification of backward areas, BPDP, backward region grants, outcomes' },
                    { title: 'Hill & Mountain Area Development', description: 'Fragile ecosystems, hill area development programmes, infrastructure constraints' },
                    { title: 'Tribal Area Development', description: 'Tribal sub-plans, PESA, livelihoods & forest rights, displacement issues' },
                    { title: 'Drought-Prone & Desert Area Planning', description: 'DPAP, watershed development, water harvesting & desertification control' },
                  ],
                },
                {
                  title: 'Sustainable Development & Environmental Planning',
                  description: 'Sustainability-led planning frameworks',
                  weightage: 1,
                  subtopics: [
                    { title: 'Concept of Sustainable Development', description: 'Brundtland definition, SDGs, carrying capacity & green growth' },
                    { title: 'Environmental Planning & Impact Assessment', description: 'EIA process, environmental zoning, pollution & land-use planning' },
                    { title: 'Settlement Planning & Growth Centres', description: 'Settlement hierarchies, service provision thresholds, growth-centre based settlement planning' },
                  ],
                },
              ],
            },
            {
              title: 'Regional Planning in Practice',
              description: 'Institutions, policies and contemporary issues of regional development',
              weightage: 2,
              topics: [
                {
                  title: 'Institutions & Policy Instruments',
                  description: 'Machinery and policies for regional development',
                  weightage: 1,
                  subtopics: [
                    { title: 'Regional Planning Institutions', description: 'Planning Commission era to NITI Aayog, regional boards & councils' },
                    { title: 'Government Policies for Regional Development', description: 'Industrial location policy, incentive regimes, aspirational districts' },
                    { title: 'Development Corridors & Industrial Regions', description: 'Industrial corridors, DMIC-style development nodes, SEZs & clusters' },
                  ],
                },
                {
                  title: 'Contemporary Issues in Regional Planning',
                  description: 'Emerging challenges in regional planning',
                  weightage: 1,
                  subtopics: [
                    { title: 'Urban–Rural Disparities & Migration', description: 'Rural–urban migration, regional divergence, metropolitan growth pressures' },
                    { title: 'Special Economic Zones & Regional Impacts', description: 'SEZ performance, land controversies, regional spread effects' },
                    { title: 'Climate-Resilient Regional Planning', description: 'Climate vulnerability mapping, adaptation planning, disaster-resilient regions' },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Models, Theories & Laws in Human Geography',
          description: 'System analysis; Malthusian, Marxian & demographic transition theories; central place theory; gravity model; core–periphery; laws in geography',
          weightage: 6.5,
          chapters: [
            {
              title: 'Population & Development Theories',
              description: 'Malthusian, Marxian and demographic transition theories',
              weightage: 2,
              topics: [
                {
                  title: 'Malthusian & Marxian Theories',
                  description: 'Classical population theories and critiques',
                  weightage: 1,
                  subtopics: [
                    { title: 'Malthusian Theory of Population', description: 'Positive & preventive checks, arithmetic vs geometric growth, critiques & relevance' },
                    { title: 'Marxian Perspective on Population', description: 'Surplus population & modes of production, Marxist critique of Malthus' },
                    { title: 'Population–Resources Debate', description: 'Overpopulation vs resource optimists, carrying capacity, demographic dividend' },
                  ],
                },
                {
                  title: 'Demographic Transition Theory',
                  description: 'Stages and applicability of the transition model',
                  weightage: 1,
                  subtopics: [
                    { title: 'Stages of Demographic Transition', description: 'Five-stage model, fertility & mortality dynamics, population momentum' },
                    { title: 'Applicability to the Developing World', description: 'Euro-centric assumptions, stalled transitions, regional variations' },
                    { title: 'Critiques & Extensions', description: 'Second demographic transition, policy influences, limits of the model' },
                  ],
                },
              ],
            },
            {
              title: 'Spatial Organization Theories & Models',
              description: 'Central place theory, primate city, rank-size rule, gravity model & core–periphery',
              weightage: 2.5,
              topics: [
                {
                  title: 'Central Place Theory & City Systems',
                  description: 'Settlement hierarchy and spatial organization models',
                  weightage: 1.3,
                  subtopics: [
                    { title: 'Christaller’s Central Place Theory', description: 'Threshold & range, K=3/4/7 principles, hexagonal hinterlands' },
                    { title: 'Lösch’s Central Place Model', description: 'Demand-based formulation, Löschian landscapes, comparison with Christaller' },
                    { title: 'Primate City & Rank-Size Rule', description: 'Jefferson’s primate city, Zipf’s rank-size rule, deviations & explanations' },
                    { title: 'Applicability & Critiques', description: 'Empirical tests, behavioural & institutional critiques, modern relevance' },
                  ],
                },
                {
                  title: 'Gravity Model, Distance Decay & Core–Periphery',
                  description: 'Spatial interaction and regional polarization models',
                  weightage: 1.2,
                  subtopics: [
                    { title: 'Gravity Model & its Applicability', description: 'Reilly’s law, model calibration, migration & trade flow applications' },
                    { title: 'Distance Decay Concept', description: 'Decay functions, friction of distance, transport & communication effects' },
                    { title: 'Core–Periphery Concept', description: 'Friedmann’s core–periphery, polarisation & diffusion, global & national examples' },
                  ],
                },
              ],
            },
            {
              title: 'Quantitative Revolution & Laws in Geography',
              description: 'System analysis, quantitative revolution and law-making in human geography',
              weightage: 2,
              topics: [
                {
                  title: 'System Analysis in Human Geography',
                  description: 'Systems thinking applied to human-geographic phenomena',
                  weightage: 1,
                  subtopics: [
                    { title: 'Systems Approach in Geography', description: 'Open & closed systems, inputs–outputs, feedback & equilibrium' },
                    { title: 'Structure, Function & Process', description: 'System morphology, cascading systems, process-response analysis' },
                    { title: 'Applications of System Analysis', description: 'Urban & regional systems, transport networks, modelling human-environment systems' },
                  ],
                },
                {
                  title: 'Quantitative Revolution & Laws in Geography',
                  description: 'Theoretical geography, model-building and laws',
                  weightage: 1,
                  subtopics: [
                    { title: 'Quantitative Revolution & Theoretical Geography', description: 'Schaefer vs Hartshorne, models/statistics turn, nomothetic geography' },
                    { title: 'Models & Model-Building', description: 'Types of models, abstraction & validation, critiques of modelling' },
                    { title: 'Laws in Geography', description: 'Spatial laws & regularities (e.g., Tobler’s first law), status of law-making in geography' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: 'Geography Optional — Paper II',
      code: 'GEO-P2',
      description: 'Geography of India · 250 Marks',
      category: 'optional',
      isOptional: true,
      weightage: 50,
      subjects: [
        {
          title: 'Physical Setting of India',
          description: 'Structure, relief, drainage, climate, soils and natural vegetation',
          weightage: 25,
          chapters: [
            {
              title: 'Structure, Relief & Drainage',
              description: 'Geological framework and morphological regions',
              weightage: 8,
              topics: [
                {
                  title: 'Geological Structure & Morphology',
                  description: 'Tectonic framework and physiographic divisions',
                  weightage: 4,
                  subtopics: [
                    { title: 'Geological Evolution', description: 'Aravalli craton, Gondwana basins, Tethys closure, Deccan volcanism, Himalayan orogeny' },
                    { title: 'Physiographic Divisions', description: 'Himalayas, Northern Plains, Peninsular Plateau, Thar, Coasts, Islands — characteristics & sub-regions' },
                    { title: 'Morphological Regions', description: 'Concept & mapping of morpho-regions of India' },
                  ],
                },
                {
                  title: 'Drainage Systems',
                  description: 'Himalayan & Peninsular systems, watershed issues',
                  weightage: 4,
                  subtopics: [
                    { title: 'Himalayan Drainage', description: 'Indus, Ganga & Brahmaputra systems; antecedent drainage, gorges, course evolution' },
                    { title: 'Peninsular Drainage', description: 'Godavari, Krishna, Kaveri, Narmada, Tapi; east vs west flowing rivers; superimposed drainage' },
                    { title: 'Interlinking of Rivers', description: 'Ken–Betwa, Damanganga–Pinjal, benefits & ecological concerns' },
                    { title: 'Water Issues', description: 'Interstate disputes, pollution, groundwater depletion, flood-prone & drought-prone areas' },
                  ],
                },
              ],
            },
            {
              title: 'Climate, Soils & Vegetation',
              description: 'Indian monsoon system and natural resource endowment',
              weightage: 17,
              topics: [
                {
                  title: 'Climate of India',
                  description: 'Mechanism, seasons and climatic regions',
                  weightage: 6,
                  subtopics: [
                    { title: 'Monsoon Mechanism', description: 'Differential heating, Tibetan plateau, jet streams, ITCZ shift, Indian Ocean Dipole, onset & withdrawal' },
                    { title: 'Seasons', description: 'Cold weather, hot weather, advancing & retreating monsoon; western disturbances, norwesters, mango showers' },
                    { title: 'Rainfall Distribution', description: 'Spatial pattern, rain shadow zones, variability & drought frequency' },
                    { title: 'Climatic Regions', description: 'Stamp & Koppen-based classification of India; agro-climatic regions' },
                    { title: 'ENSO & Indian Climate', description: 'El Niño/La Niña links to monsoon, MJO, climate change impacts on monsoon' },
                  ],
                },
                {
                  title: 'Soils & Natural Vegetation',
                  description: 'Distribution, characteristics, problems and conservation',
                  weightage: 5,
                  subtopics: [
                    { title: 'Soil Types & Distribution', description: 'Alluvial, black cotton, red, laterite, mountain, desert, saline & peaty soils — regional distribution' },
                    { title: 'Soil Problems', description: 'Erosion, degradation, salinity & waterlogging; soil health card scheme' },
                    { title: 'Natural Vegetation Types', description: 'Tropical evergreen, deciduous, thorn, montane, littoral & swamp forests; forest cover data & FSM reports' },
                    { title: 'Wildlife & Conservation', description: 'Biosphere reserves, national parks, tiger/elephant corridors, social forestry, compensatory afforestation' },
                  ],
                },
                {
                  title: 'Natural Resources & Environment',
                  description: 'Water, minerals, energy and environmental quality',
                  weightage: 6,
                  subtopics: [
                    { title: 'Water Resources', description: 'Surface & groundwater potential, irrigation development, rainwater harvesting, national water policy' },
                    { title: 'Mineral & Energy Resources', description: 'Iron, coal, bauxite, mica distribution; conventional vs non-conventional energy geography, solar & wind potential zones' },
                    { title: 'Environment & Health', description: 'Air & water quality, river rejuvenation (Namami Gange), Swachh Bharat, disease ecology, nutrition security' },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Human & Economic Geography of India',
          description: 'Agriculture, industry, settlements, transport, trade and population',
          weightage: 30,
          chapters: [
            {
              title: 'Agriculture & Rural Development',
              description: 'Cropping patterns, land reforms, rural institutions',
              weightage: 10,
              topics: [
                {
                  title: 'Agricultural Geography of India',
                  description: 'Systems, performance and policies',
                  weightage: 5.5,
                  subtopics: [
                    { title: 'Infrastructure & Irrigation', description: 'Irrigation systems (canal, tank, well), command areas, micro-irrigation, agricultural markets (APMC, e-NAM)' },
                    { title: 'Cropping Patterns', description: 'Food & non-food crops, crop combinations, agricultural regionalisation, green revolution legacies' },
                    { title: 'Agro & Food Processing', description: 'Agro-industrial linkages, cold chains, MSP, buffer stocks & PDS geography' },
                    { title: 'Land Reforms', description: 'Zamindari abolition, tenancy reforms, land ceiling, land records digitalization' },
                    { title: 'Agricultural Problems & Policies', description: 'Farmer distress, fragmentation, credit, insurance (PMFBY), farm laws debate, sustainable agriculture, natural farming' },
                  ],
                },
                {
                  title: 'Rural Development & Institutions',
                  description: 'Decentralized planning and rural transformation',
                  weightage: 4.5,
                  subtopics: [
                    { title: 'Panchayati Raj', description: '73rd Amendment, PESA, Gram Sabha, devolution & finance' },
                    { title: 'Rural Development Programmes', description: 'MGNREGA, PMAY-G, NRLM, watershed programmes, rural connectivity' },
                    { title: 'Sericulture, Fisheries & Allied', description: 'Blue revolution, dairy (Operation Flood), poultry, apiculture, FPOs' },
                    { title: 'Tribal & Backward Area Development', description: 'Tribal sub-plan, aspirational districts, forest rights act' },
                  ],
                },
              ],
            },
            {
              title: 'Industry, Transport & Trade',
              description: 'Industrial locational patterns, transport networks, external trade',
              weightage: 10,
              topics: [
                {
                  title: 'Industrial Geography of India',
                  description: 'Locational patterns, industrial complexes and policy',
                  weightage: 5.5,
                  subtopics: [
                    { title: 'Industrial Evolution & Policy', description: 'LPG reforms, Make in India, PLI schemes, industrial corridors (DMIC, chennai-bengaluru), dedicated freight corridors' },
                    { title: 'Major Industries', description: 'Cotton textiles, iron & steel (Chhotanagpur, VISL), sugar, paper, cement, petrochemicals, IT & electronics' },
                    { title: 'Industrial Complexes & Clusters', description: 'Agro, marine & mineral-based complexes, SEZ/NIMZ, industrial clusters & MSME geography' },
                    { title: 'Regional Imbalances', description: 'Core–periphery within India, backward area industrialisation, freight equalisation critique' },
                  ],
                },
                {
                  title: 'Transport, Communication & Trade',
                  description: 'Networks, flows and gateways',
                  weightage: 4.5,
                  subtopics: [
                    { title: 'Roads & Railways', description: 'Golden quadrilateral, NH network, railway zones, dedicated freight corridors, metro systems' },
                    { title: 'Water & Air Transport', description: 'Major & minor ports, Sagarmala, inland waterways (NW-1, NW-2), civil aviation, UDAN' },
                    { title: 'Communication Networks', description: 'Digital India, telecom expansion, postal geography, internet penetration' },
                    { title: 'International Trade', description: 'Composition & direction of trade, major gateways, FTAs, Act East policy, trade deficits' },
                    { title: 'Special Economic Zones', description: 'SEZ performance, coastal economic zones, labour & land issues' },
                  ],
                },
              ],
            },
            {
              title: 'Settlements & Population of India',
              description: 'Urbanisation and demographic landscape',
              weightage: 10,
              topics: [
                {
                  title: 'Settlement Geography of India',
                  description: 'Rural patterns and urban systems',
                  weightage: 4.5,
                  subtopics: [
                    { title: 'Rural Settlement Types', description: 'Regional patterns — nucleated in plains, dispersed in hills, linear along roads; morphogenesis of settlement' },
                    { title: 'Urbanisation Trends', description: 'Census definitions, urban growth phases, million-plus cities, census towns, urban sprawl' },
                    { title: 'Urban Functional Classification', description: 'Function-based typologies, smart cities mission, AMRUT, urban governance & finance' },
                    { title: 'Urban Problems', description: 'Slums & squatters, transport congestion, water supply & sanitation, urban flooding, peri-urban agriculture' },
                  ],
                },
                {
                  title: 'Population Geography of India',
                  description: 'Growth, composition, migration and policies',
                  weightage: 5.5,
                  subtopics: [
                    { title: 'Growth & Distribution', description: 'State-level density & growth, demographic dividend, sex ratio & child sex ratio issues' },
                    { title: 'Population Composition', description: 'Age structure, literacy, religious & linguistic composition, SC/ST distribution' },
                    { title: 'Migration in India', description: 'Census & NSSO migration streams, rural–urban migration, remittance economics (Kerala model), displacement' },
                    { title: 'Population Policy', description: 'NPP 2000, family planning, ageing, urban health missions, population & development debates' },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Regional Planning & Contemporary Issues',
          description: 'Planning frameworks, regional development and political aspects',
          weightage: 25,
          chapters: [
            {
              title: 'Regional Planning & Development',
              description: 'Concepts, typologies and Indian planning experience',
              weightage: 12,
              topics: [
                {
                  title: 'Concepts & Experience of Regional Planning',
                  description: 'Theory and Indian practice',
                  weightage: 6,
                  subtopics: [
                    { title: 'Regional Planning Concepts', description: 'Types of regions (planning regions), growth pole/foci concepts, regionalization for planning' },
                    { title: 'Five-year Plans to NITI Aayog', description: 'Evolution of planning, indicative planning, cooperative & competitive federalism' },
                    { title: 'Regional Planning in India', description: 'Block & district level planning, metropolitan planning, regional imbalance committees' },
                    { title: 'Area-based Approaches', description: 'River valley projects, drought-prone area programme, hill area development, border area development' },
                  ],
                },
                {
                  title: 'Regional Development Issues',
                  description: 'Case-study oriented regional problems',
                  weightage: 6,
                  subtopics: [
                    { title: 'Tribal & Hilly Areas', description: 'North-east development, left-wing extremism districts, island (AND & Laccadive) development' },
                    { title: 'Drought & Desert Prone Areas', description: 'Arid zone development, command area development, desert national programme' },
                    { title: 'Regional Disparities', description: 'Inter-state income & HDI disparities, special category states, finance commission devolution' },
                  ],
                },
              ],
            },
            {
              title: 'Political Aspects & Contemporary Issues',
              description: 'Geography of Indian polity and current debates',
              weightage: 13,
              topics: [
                {
                  title: 'Political Geography of India',
                  description: 'Reorganisation, boundaries and geopolitics',
                  weightage: 6.5,
                  subtopics: [
                    { title: 'State Reorganisation', description: 'Linguistic reorganisation, new states (2000, 2014-19), statehood demands' },
                    { title: 'International Boundaries', description: 'India–China, India–Pakistan, India–Bangladesh, India–Nepal disputes; enclaves & LBA' },
                    { title: 'Geopolitics of India', description: 'Indian Ocean geopolitics, neighbourhood policy, China–Pakistan Economic Corridor implications' },
                    { title: 'Internal Issues', description: 'Centre–state relations, regionalism, insurgency, cross-border terrorism geography' },
                  ],
                },
                {
                  title: 'Contemporary Geographic Issues',
                  description: 'Environment, hazards, and sustainability in India',
                  weightage: 6.5,
                  subtopics: [
                    { title: 'Environmental Issues in India', description: 'Deforestation, river pollution, urban air quality, waste management, climate vulnerability (Himalaya, coasts, deltas)' },
                    { title: 'Disaster Profile of India', description: 'Multi-hazard zones, tsunami & cyclone vulnerability, GLOFs, heat action plans' },
                    { title: 'Population & Development Issues', description: 'Demographic dividend vs burden, migration pressures, urban stress' },
                    { title: 'Sustainable Development in India', description: 'SDG localisation, NDC commitments, renewable energy targets, circular economy, environmental governance (NGT, EIA 2020)' },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Geography of India — Integrative Themes',
          description: 'Cross-cutting themes and synoptic perspectives',
          weightage: 20,
          chapters: [
            {
              title: 'Cross-cutting Themes',
              description: 'Linking physical & human geography of India',
              weightage: 20,
              topics: [
                {
                  title: 'Physical–Human Interface',
                  description: 'Resources, development and sustainability linkages',
                  weightage: 10,
                  subtopics: [
                    { title: 'Physiography & Economy Linkages', description: 'Relief–agriculture, minerals–industry, rivers–irrigation linkages' },
                    { title: 'Climate & Society', description: 'Monsoon dependence, droughts & agrarian distress, heat & productivity' },
                    { title: 'Regional Identity & Geography', description: 'Physical basis of cultural regions, linguistic geography, cuisine & geography' },
                  ],
                },
                {
                  title: 'Model Answers & Synthesis',
                  description: 'Answer frameworks for India geography',
                  weightage: 10,
                  subtopics: [
                    { title: 'Map-based Answer Skills', description: 'India map marking, locating resources, prepared outline maps' },
                    { title: 'Diagrams & Data', description: 'Census data use, NSSO, FSM reports, Economic Survey references' },
                    { title: 'Current Linkages', description: 'Linking current affairs with static India geography' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
