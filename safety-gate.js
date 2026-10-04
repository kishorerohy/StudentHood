const params=new URLSearchParams(location.search);
const reason=params.get('reason')||'safety_restriction';
const title=document.querySelector('#gateTitle');
const copy=document.querySelector('#gateCopy');
const note=document.querySelector('#gateNote');
const kicker=document.querySelector('#gateKicker');

const messages={
  quiet_hours:{
    title:'Taking a break for tonight.',
    copy:'Under-18 StudentHood accounts pause at 7:00 PM in the account’s saved local time zone.',
    note:'Access reopens at 7:00 AM. This limit is enforced by StudentHood, not only by the screen you are viewing.'
  },
  guardian_consent_required:{
    title:'A parent or guardian needs to approve this account.',
    copy:'Your region requires additional permission before StudentHood can activate this under-18 account.',
    note:'Your signup progress is saved. StudentHood will continue once the required guardian-verification flow is completed.'
  },
  regional_age_restriction:{
    title:'StudentHood is not available for this age in your region.',
    copy:'Local rules can set a higher minimum age for social-media accounts.',
    note:'We apply the local requirement even when StudentHood allows younger users in other countries.'
  },
  safety_setup_required:{
    title:'Finish your safety setup.',
    copy:'StudentHood needs your date of birth, country or region and time zone before opening the app.',
    note:'These details are used to apply age-appropriate protections and local rules.'
  }
};
const item=messages[reason]||{
  title:'StudentHood safety check',
  copy:'This account cannot enter StudentHood right now.',
  note:'Visit Safety for more information or contact support if you think this is a mistake.'
};
title.textContent=item.title;
copy.textContent=item.copy;
note.textContent=item.note;
if(reason==='guardian_consent_required')kicker.textContent='GUARDIAN APPROVAL';
if(reason==='regional_age_restriction')kicker.textContent='REGIONAL AGE REQUIREMENT';
