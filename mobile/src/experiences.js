import {supabase} from './supabase';

export const EXPERIENCE_KEYS=Object.freeze([
 'freshers','crews_hq','gigs_plus','passport','partner_hub','collaborations'
]);

export const EXPERIENCE_LABELS=Object.freeze({
 freshers:'Freshers Journey',
 crews_hq:'Crews HQ',
 gigs_plus:'Gigs Plus',
 passport:'StudentHood Passport',
 partner_hub:'Campus Partner Hub',
 collaborations:'Cross-Campus Collaborations'
});

// Client flags only control presentation. Every sensitive action must be
// authorised again in Postgres, not by this module or a user-supplied flag.
export async function getExperienceFlags(){
 const {data,error}=await supabase.from('studenthood_experience_flags')
   .select('feature_key,enabled,min_age,allowed_campus_keys');
 if(error)throw new Error('StudentHood experiences are not available yet.');
 const flags={};
 for(const name of EXPERIENCE_KEYS)flags[name]=false;
 for(const item of data||[]) {
   if(EXPERIENCE_KEYS.includes(item.feature_key)){
     flags[item.feature_key]=item.enabled===true;
   }
 }
 return flags;
}

export async function getFreshersStatus(){
 const {data,error}=await supabase.rpc('studenthood_freshers_my_status');
 if(error)throw new Error('Could not load Freshers Journey. Please try again.');
 return data||{enabled:false};
}

const ALLOWED_INTERESTS=[
 'Arts','Books','Business','Culture','Design','Gaming','Music',
 'Science','Sports','Study','Technology','Volunteering'
];
export const FRESHERS_INTERESTS=Object.freeze(ALLOWED_INTERESTS);

export async function saveFreshersPreferences({optedIn,interestTags=[],dismissed=false}){
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)throw new Error('Sign in to update your journey.');
 if(!Array.isArray(interestTags)||interestTags.length>8
   ||interestTags.some(item=>!ALLOWED_INTERESTS.includes(item)))
   throw new Error('Choose up to eight suggested interests.');
 const {error}=await supabase.from('studenthood_freshers_preferences')
   .upsert({
      user_id:user.id,opted_in:optedIn===true,
      interest_tags:[...new Set(interestTags)],
      dismissed_at:dismissed?new Date().toISOString():null,
      updated_at:new Date().toISOString()
   },{onConflict:'user_id'});
 if(error)throw new Error('Could not save your Freshers preferences. Please try again.');
 return getFreshersStatus();
}
