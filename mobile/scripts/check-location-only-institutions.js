const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const onboarding=read('src/screens/OnboardingScreen.js');
const edit=read('src/screens/EditProfileScreen.js');
const api=read('src/api.js');
const backend=read('../supabase/functions/institution-search/index.ts');
for(const [screen,name] of [[onboarding,'Onboarding'],[edit,'Edit Profile']]){
  for(const label of ["label:'Nearby'","label:'Country'","label:'Worldwide'"]){
    assert(!screen.includes(label),name+' must not show scope tabs: '+label);
  }
  assert(!screen.includes("Try country or worldwide"),name+' must not recommend removed tabs');
  assert(screen.includes('findInstitutionsByCity'),name+' must use city-based institution search');
  assert(screen.includes('filteredInstitutions.map('),name+' must display city results');
}
assert(!edit.includes('institutionMode'), 'Edit Profile must have no global scope modes');
assert(edit.includes('Location.requestForegroundPermissionsAsync()'),
  "Profile institution picker should detect the student's current location");
assert(edit.includes('Location.reverseGeocodeAsync(coords)'),
  'Profile picker must resolve the real city and country of travel');
assert(edit.includes('searchInstitutions(detectedCity,detectedCountry)'),
  'Travel to Chicago/London should use current GPS country, not stored safety country');
assert(edit.includes('setCity(directoryCity)'),
  'Selecting a new campus should save the city used for its lookup');
assert(edit.includes('if(request!==directoryRequest.current)return;'),
  'Old city search responses must not overwrite newer detected location');

assert(!edit.includes('searchGlobalInstitutions'), 'Edit Profile must not expose global name search');
assert(onboarding.includes("const lookupCountry=/^[A-Z]{2}$/.test(detectedCountry)?detectedCountry:country;"),
  'GPS-derived city must use the detected ISO country without rewriting age/safety region');
assert(onboarding.includes('detectedCityLocation.current={city:detectedCity,country:lookupCountry,coords}'),
  'GPS and city/country context must remain linked');
assert(onboarding.includes('loadCityInstitutions(detectedCity,lookupCountry)'),
  'GPS city query must use detected location country');
assert(api.includes('export async function searchInstitutionsByName('),
  'Preserve worldwide data provider for backend or future legitimate workflows');
assert(backend.includes('async function searchRorByName('),
  'Do not delete the global university database provider');
assert(backend.includes('studenthood_institution_catalog'),
  'Use verified records from the server-side catalog');
assert(backend.includes('.eq("country_code",countryCode).ilike("city",city)'),
  'Catalog must be filtered to the same country and city');
assert(backend.includes('nameKey(clean(item.city,90))===nameKey(city)'),
  'Registry locality must be verified after query');
assert(backend.includes('queryRorEducation(city,countryCode)'),
  'Globally sourced ROR universities must be limited to selected city/country');
assert(backend.includes('Promise.allSettled(['),
  'Global verified and physical local sources should merge independently');
assert(backend.includes('institutions:combineCityResponse(directory.institutions,verifiedCatalog,countryCode)'),
  'Return city-filtered combined institutions');
assert(backend.includes('if(mergedCache&&age<CACHE_MS)'),
  'Retain rate-limited city caching and merge verified catalog');
console.log('PASS: single city-based institution picker globally with hidden catalog and safe GPS country.');
