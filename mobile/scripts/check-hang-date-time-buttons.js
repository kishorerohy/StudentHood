const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/screens/CreateFeatureScreen.js'),'utf8');

assert(src.includes('const [dateChosen,setDateChosen]=useState(false)'), 'Date must show placeholder until chosen');
assert(src.includes('const [timeChosen,setTimeChosen]=useState(false)'), 'Time must show placeholder until chosen');
assert(src.includes("date.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})"), 'Date label must be local and readable');
assert(src.includes("date.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})"), 'Time label must be local and readable');
assert(src.includes("if(event?.type==='dismissed'||!selected||!choosing)return;"), 'Cancelled picker may not update labels');
assert(src.includes('setDateChosen(true)')&&src.includes('setTimeChosen(true)'), 'Each picker must change only its own selection flag');
assert(src.includes("onPress={()=>showDateTimePicker('date')}"), 'Date button must reopen picker');
assert(src.includes("onPress={()=>showDateTimePicker('time')}"), 'Time button must reopen picker');
assert(src.includes('>{dateLabel}</Text>')&&src.includes('>{timeLabel}</Text>'), 'Show selected values within buttons');
assert(!src.includes('{futureTime}</Text>')&&!src.includes('styles.dateNote'), 'Remove duplicated date/time beneath the buttons');
assert(src.includes('adjustsFontSizeToFit minimumFontScale={0.78}'), 'Fit dates on narrow Android screens');
assert(src.includes("set('startsAt',updated.toISOString())"), 'Submission must retain selected date/time');
assert(src.includes('Keyboard.dismiss();'), 'Dismiss typing keyboard before showing native pickers');
console.log('PASS: Hang picker labels reflect individually selected date/time inside buttons; no duplicate row.');
