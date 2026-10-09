import React,{useMemo,useState} from 'react';
import {
  ActivityIndicator,Image,KeyboardAvoidingView,Platform,Pressable,ScrollView,
  StyleSheet,Text,TextInput,View
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import {Feather} from '@expo/vector-icons';
import {submitStudentCreation} from '../creation';
import useKeyboardAwareForm from '../hooks/useKeyboardAwareForm';

const SETTINGS={
  Pulse:{heading:'Add to Pulse',subheading:'A quick moment with your campus circle.',cta:'Submit Pulse'},
  Hangs:{heading:'Start a Hang',subheading:'Bring your campus together, safely.',cta:'Submit Hang'},
  Crews:{heading:'Create a Crew',subheading:'Build a community around what you love.',cta:'Submit Crew'},
  Gigs:{heading:'Post a Gig',subheading:'Share a genuine opportunity with students.',cta:'Submit Gig'}
};
const OPTIONS={
  Hangs:['Social','Study','Sports','Culture','Other'],
  Crews:['Study','Arts','Tech','Sports','Other'],
  Gigs:['Part-time','Internship','Campus','Remote','Other']
};
function nextHour(){
  const date=new Date();
  date.setHours(date.getHours()+2,0,0,0);
  return date;
}
export default function CreateFeatureScreen({kind,theme,profile,onBack,onSaved}){
  const config=SETTINGS[kind]||SETTINGS.Hangs;
  const [values,setValues]=useState({
    title:'',name:'',body:'',description:'',employerName:'',
    category:OPTIONS[kind]?.[0]||'',
    visibility:kind==='Pulse'?'peeps':'campus',
    locationHint:'',capacity:'',payAmount:'',payCurrency:'',payUnit:'hour',
    startsAt:nextHour().toISOString()
  });
  const [date,setDate]=useState(nextHour);
  const [picker,setPicker]=useState(null);
  const [media,setMedia]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const {scrollRef,onFieldFocus,onScrollLayout,onScroll,keyboardPadding}=useKeyboardAwareForm();
  const [submitted,setSubmitted]=useState(null);
  const set=(field,value)=>setValues(current=>({...current,[field]:value}));
  const isPulse=kind==='Pulse';
  const canUseMedia=isPulse;
  const futureTime=date.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
  const sections=OPTIONS[kind]||[];
  const info=kind==='Gigs'
    ?'Gig applications and payments will be enabled only after employer review and eligibility checks.'
    :kind==='Crews'?'A Crew will become visible only after community safety review.'
    :kind==='Pulse'?'Pulse is submitted privately for moderation before reaching your selected audience.'
    :'Attendees and RSVPs will be available after event safety review.';

  async function chooseMedia(){
    setError('');
    try{
      const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
      if(!permission.granted)throw new Error('Allow media library access to add a Pulse photo or video.');
      const result=await ImagePicker.launchImageLibraryAsync({
        mediaTypes:['images','videos'],quality:0.9,videoMaxDuration:60,allowsMultipleSelection:false
      });
      if(!result.canceled&&result.assets?.[0])setMedia(result.assets[0]);
    }catch(e){setError(e?.message||'Unable to select media.')}
  }
  async function submit(){
    if(busy||submitted)return;
    setBusy(true);
    setError('');
    try{
      const saved=await submitStudentCreation(kind,{...values,startsAt:date.toISOString()},media);
      setSubmitted(saved);
      await onSaved?.(kind,saved);
    }catch(e){
      setError(e?.message||'Could not save your submission.');
    }finally{
      setBusy(false);
    }
  }
  function updateDate(_,selected){
    if(Platform.OS==='android')setPicker(null);
    if(selected){
      const updated=new Date(date);
      if(picker==='date')updated.setFullYear(selected.getFullYear(),selected.getMonth(),selected.getDate());
      else updated.setHours(selected.getHours(),selected.getMinutes(),0,0);
      setDate(updated);
      set('startsAt',updated.toISOString());
    }
  }

  return <KeyboardAvoidingView style={[styles.root,{backgroundColor:theme.bg}]} behavior={Platform.OS==='ios'?'padding':undefined}>
    <View style={[styles.header,{borderBottomColor:theme.line}]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Create" onPress={onBack} style={styles.back}>
        <Feather name="arrow-left" size={21} color={theme.text}/>
      </Pressable>
      <Text style={[styles.headerTitle,{color:theme.text}]}>{config.heading}</Text>
      <View style={{width:43}}/>
    </View>
    <ScrollView ref={scrollRef} onLayout={onScrollLayout} onScroll={onScroll} scrollEventThrottle={16} automaticallyAdjustKeyboardInsets={Platform.OS==='ios'} contentContainerStyle={[styles.content,{paddingBottom:200+keyboardPadding}]} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS==='ios'?'interactive':'none'} showsVerticalScrollIndicator={false}>
      {!!submitted?<View style={[styles.confirm,{backgroundColor:theme.surface,borderColor:theme.line}]}>
        <View style={[styles.confirmIcon,{backgroundColor:theme.accentSoft}]}><Feather name="check-circle" color={theme.success} size={34}/></View>
        <Text style={[styles.confirmTitle,{color:theme.text}]}>Saved for review</Text>
        <Text style={[styles.info,{color:theme.muted}]}>Your {kind==='Pulse'?'Pulse':kind==='Hangs'?'Hang':kind==='Crews'?'Crew':'Gig'} was saved successfully. It isn't public yet. You can find it under My submissions.</Text>
        <Pressable onPress={onBack} style={[styles.submit,{backgroundColor:theme.accent}]} accessibilityRole="button">
          <Text style={styles.submitText}>Back to Create</Text>
        </Pressable>
      </View>:
      <>
        <Text style={[styles.eyebrow,{color:theme.accent}]}>STUDENTHOOD · CREATE</Text>
        <Text style={[styles.intro,{color:theme.muted}]}>{config.subheading}</Text>
        {!!profile?.campus_name&&<View style={[styles.campus,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          <Feather name="book-open" color={theme.accent} size={16}/>
          <View style={{flex:1}}>
            <Text style={[styles.campusLabel,{color:theme.muted}]}>Your campus</Text>
            <Text style={[styles.campusName,{color:theme.text}]}>{profile.campus_name}</Text>
          </View>
          <Feather name="shield" color={theme.muted} size={16}/>
        </View>}

        {kind==='Pulse'&&<>
          <Field theme={theme} onFocus={onFieldFocus} label="What's happening?" value={values.body} onChangeText={text=>set('body',text)} maxLength={500} multiline placeholder="A moment worth sharing…" />
          <Pressable onPress={chooseMedia} style={[styles.mediaButton,{backgroundColor:theme.surface,borderColor:theme.line}]} accessibilityRole="button">
            <Feather name="image" color={theme.accent} size={20}/>
            <Text style={[styles.mediaText,{color:theme.text}]}>{media?'Change photo or video':'Add photo or video'}</Text>
            <Feather name="chevron-right" color={theme.muted} size={18}/>
          </Pressable>
          {!!media&&<View style={[styles.preview,{backgroundColor:theme.surface,borderColor:theme.line}]}>
            {media.type==='image'?<Image source={{uri:media.uri}} style={styles.previewImage}/>:<Text style={[styles.info,{color:theme.text}]}>Video selected: {media.fileName||'Pulse video'}</Text>}
            <Pressable accessibilityLabel="Remove media" onPress={()=>setMedia(null)} style={styles.removeMedia}><Feather name="x" color="#fff" size={18}/></Pressable>
          </View>}
          <Choices theme={theme} label="Who can view your Pulse?" options={[['peeps','Peeps'],['campus','Campus']]} value={values.visibility} onChange={value=>set('visibility',value)}/>
        </>}

        {kind==='Hangs'&&<>
          <Field theme={theme} onFocus={onFieldFocus} label="Hang title" value={values.title} onChangeText={text=>set('title',text)} maxLength={100} placeholder="Coffee and study afternoon"/>
          <Choices theme={theme} label="Type of Hang" options={sections.map(x=>[x,x])} value={values.category} onChange={v=>set('category',v)}/>
          <Field theme={theme} onFocus={onFieldFocus} label="What's the plan?" value={values.description} onChangeText={text=>set('description',text)} multiline maxLength={2000} placeholder="Tell students what they'll do and who can join…"/>
          <View style={styles.dual}>
            <Pressable accessibilityRole="button" onPress={()=>setPicker('date')} style={[styles.dateButton,{backgroundColor:theme.surface,borderColor:theme.line}]}><Feather name="calendar" color={theme.accent} size={18}/><Text style={{color:theme.text,fontWeight:'700'}}>Choose date</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={()=>setPicker('time')} style={[styles.dateButton,{backgroundColor:theme.surface,borderColor:theme.line}]}><Feather name="clock" color={theme.accent} size={18}/><Text style={{color:theme.text,fontWeight:'700'}}>Choose time</Text></Pressable>
          </View>
          <Text style={[styles.dateNote,{color:theme.muted}]}>{futureTime}</Text>
          {!!picker&&<DateTimePicker value={date} mode={picker} minimumDate={picker==='date'?new Date():undefined} display={Platform.OS==='ios'?'spinner':'default'} onChange={updateDate}/>}
          {Platform.OS==='ios'&&!!picker&&<Pressable onPress={()=>setPicker(null)}><Text style={[styles.done,{color:theme.accent}]}>Done</Text></Pressable>}
          <Field theme={theme} onFocus={onFieldFocus} label="Meeting point" value={values.locationHint} onChangeText={text=>set('locationHint',text)} maxLength={120} placeholder="Library lobby or a public campus location"/>
          <Field theme={theme} onFocus={onFieldFocus} label="Maximum attendees (optional)" value={values.capacity} onChangeText={text=>set('capacity',text)} keyboardType="number-pad" placeholder="Leave empty for no set limit"/>
          <Choices theme={theme} label="Audience" options={[['campus','Campus'],['peeps','Peeps']]} value={values.visibility} onChange={v=>set('visibility',v)}/>
        </>}

        {kind==='Crews'&&<>
          <Field theme={theme} onFocus={onFieldFocus} label="Crew name" value={values.name} onChangeText={text=>set('name',text)} maxLength={80} placeholder="Campus photography circle"/>
          <Choices theme={theme} label="Crew category" options={sections.map(x=>[x,x])} value={values.category} onChange={v=>set('category',v)}/>
          <Field theme={theme} onFocus={onFieldFocus} label="About your Crew" value={values.description} onChangeText={text=>set('description',text)} multiline maxLength={1500} placeholder="Describe your interests, purpose and who can join…"/>
          <Choices theme={theme} label="Visibility" options={[['campus','Campus'],['invite_only','Invite only']]} value={values.visibility} onChange={v=>set('visibility',v)}/>
        </>}

        {kind==='Gigs'&&<>
          <View style={[styles.note,{borderColor:theme.line,backgroundColor:theme.surface2}]}><Feather name="shield" color={theme.accent} size={17}/><Text style={[styles.info,{color:theme.muted,flex:1}]}>Gig submission is restricted to adults, with review before publishing. No employer is labeled verified without verification.</Text></View>
          <Field theme={theme} onFocus={onFieldFocus} label="Role / Gig title" value={values.title} onChangeText={text=>set('title',text)} maxLength={100} placeholder="Weekend research assistant"/>
          <Field theme={theme} onFocus={onFieldFocus} label="Employer or organisation" value={values.employerName} onChangeText={text=>set('employerName',text)} maxLength={120} placeholder="Official business name"/>
          <Choices theme={theme} label="Opportunity type" options={sections.map(x=>[x,x])} value={values.category} onChange={v=>set('category',v)}/>
          <Field theme={theme} onFocus={onFieldFocus} label="Job description and requirements" value={values.description} onChangeText={text=>set('description',text)} multiline maxLength={2500} placeholder="Describe duties, hours, eligibility and conditions…"/>
          <Field theme={theme} onFocus={onFieldFocus} label="Work location" value={values.locationHint} onChangeText={text=>set('locationHint',text)} maxLength={120} placeholder="City, campus or Remote"/>
          <Field theme={theme} onFocus={onFieldFocus} label="Pay amount" value={values.payAmount} onChangeText={text=>set('payAmount',text)} keyboardType="decimal-pad" placeholder="e.g. 15.50"/>
          <Field theme={theme} onFocus={onFieldFocus} label="Pay currency (ISO code)" value={values.payCurrency} onChangeText={text=>set('payCurrency',text.toUpperCase())} maxLength={3} autoCapitalize="characters" placeholder="GBP, INR, USD…"/>
          <Choices theme={theme} label="Pay period" options={[['hour','Per hour'],['day','Per day'],['project','Per project']]} value={values.payUnit} onChange={v=>set('payUnit',v)}/>
        </>}

        <View style={[styles.note,{borderColor:theme.line,backgroundColor:theme.surface2}]}>
          <Feather name="shield" size={18} color={theme.accent}/>
          <Text style={[styles.info,{color:theme.muted,flex:1}]}>{info} Submissions are private while pending. StudentHood safety restrictions remain active.</Text>
        </View>
        {!!error&&<Text accessibilityRole="alert" style={[styles.error,{color:theme.danger}]}>{error}</Text>}
        <Pressable onPress={submit} disabled={busy} accessibilityRole="button" accessibilityState={{disabled:busy}} style={[styles.submit,{backgroundColor:theme.accent,opacity:busy?0.6:1}]}>
          {busy?<ActivityIndicator color="#fff"/>:<><Text style={styles.submitText}>{config.cta}</Text><Feather name="arrow-right" size={18} color="#fff"/></>}
        </Pressable>
      </>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

function Field({theme,label,multiline=false,...rest}){
  return <View style={styles.fieldGroup}>
    <Text style={[styles.fieldLabel,{color:theme.text}]}>{label}</Text>
    <TextInput {...rest} multiline={multiline} placeholderTextColor={theme.muted}
      style={[styles.input,multiline&&styles.multiline,{backgroundColor:theme.surface,borderColor:theme.line,color:theme.text}]}/>
  </View>;
}
function Choices({theme,label,options,value,onChange}){
  return <View style={styles.fieldGroup}>
    <Text style={[styles.fieldLabel,{color:theme.text}]}>{label}</Text>
    <View style={styles.choiceRow}>{options.map(([key,title])=><Pressable
      key={key} onPress={()=>onChange(key)} accessibilityRole="button" accessibilityState={{selected:key===value}}
      style={[styles.choice,{backgroundColor:key===value?theme.accentSoft:theme.surface,borderColor:key===value?theme.accent:theme.line}]}>
      <Text style={[styles.choiceText,{color:key===value?theme.accent:theme.text}]}>{title}</Text>
    </Pressable>)}</View>
  </View>;
}
const styles=StyleSheet.create({
  root:{flex:1},
  header:{height:64,borderBottomWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:15},
  back:{height:43,width:43,alignItems:'center',justifyContent:'center'},
  headerTitle:{fontSize:18,fontWeight:'800'},
  content:{maxWidth:830,width:'100%',alignSelf:'center',padding:18,paddingBottom:200},
  eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.4},
  intro:{fontSize:13,lineHeight:20,marginTop:9,marginBottom:17},
  campus:{minHeight:64,borderRadius:16,borderWidth:1,flexDirection:'row',alignItems:'center',gap:12,padding:12,marginBottom:9},
  campusLabel:{fontSize:10,marginBottom:4},
  campusName:{fontSize:13,fontWeight:'800'},
  fieldGroup:{marginTop:17},
  fieldLabel:{fontSize:12,fontWeight:'800',marginBottom:9},
  input:{borderWidth:1,borderRadius:15,minHeight:49,paddingHorizontal:14,fontSize:14},
  multiline:{height:130,textAlignVertical:'top',paddingTop:14},
  choiceRow:{flexDirection:'row',flexWrap:'wrap',gap:8},
  choice:{minHeight:43,borderWidth:1,borderRadius:16,paddingHorizontal:13,alignItems:'center',justifyContent:'center'},
  choiceText:{fontSize:11,fontWeight:'800'},
  mediaButton:{borderWidth:1,borderRadius:16,padding:15,marginTop:15,flexDirection:'row',alignItems:'center',gap:11},
  mediaText:{flex:1,fontWeight:'700',fontSize:12},
  preview:{borderWidth:1,borderRadius:15,marginTop:14,padding:9,minHeight:80},
  previewImage:{height:225,width:'100%',borderRadius:8},
  removeMedia:{position:'absolute',top:14,right:14,backgroundColor:'rgba(0,0,0,0.65)',borderRadius:20,padding:8},
  dual:{flexDirection:'row',gap:10,marginTop:18},
  dateButton:{flex:1,minHeight:51,borderRadius:14,borderWidth:1,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8},
  dateNote:{fontSize:13,marginTop:12},
  done:{fontWeight:'800',textAlign:'right',padding:14},
  note:{flexDirection:'row',borderWidth:1,borderRadius:16,padding:14,gap:11,marginTop:20},
  info:{fontSize:11,lineHeight:18},
  error:{fontSize:12,marginTop:16,lineHeight:19},
  submit:{minHeight:52,borderRadius:17,marginTop:23,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:12},
  submitText:{fontSize:14,fontWeight:'900',color:'#fff'},
  confirm:{borderRadius:24,borderWidth:1,padding:30,marginTop:35,alignItems:'center',gap:16},
  confirmIcon:{height:72,width:72,borderRadius:36,alignItems:'center',justifyContent:'center'},
  confirmTitle:{fontSize:25,fontWeight:'900',textAlign:'center'}
});
