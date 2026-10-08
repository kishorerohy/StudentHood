import React from 'react';
import {Alert,Linking,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {signOut} from '../auth';
import {LEGAL_URLS} from '../config';

const NAV={
 menu:[
  ['Privacy','lock','Profile visibility and campus discovery','privacy'],
  ['Safety','shield','Age assurance and teen protections','safety'],
  ['Notifications','bell','Drops and app activity','notifications'],
  ['Account & security','key','Account details and sign out','account'],
  ['Platform age signal','clock','Device age information','platform'],
  ['Legal documents','file-text','Safety, privacy and terms','legal']
 ],
 legal:[
  ['Safety policy','shield','Read StudentHood safety policies','safety_document'],
  ['Privacy policy','lock','Read how StudentHood protects data','privacy_document'],
  ['Terms of service','file-text','Read StudentHood terms','terms_document']
 ]
};

export default function ProfileMenuScreen({page='menu',theme,profile,safety,onBack,onNavigate,onDrops}){
  const titleMap={menu:'Profile menu',privacy:'Privacy',safety:'Safety',notifications:'Notifications',account:'Account & security',platform:'Platform age signal',legal:'Legal documents'};
  const label=titleMap[page]||'Profile settings';
  const intro={
    menu:'Manage your StudentHood account and preferences.',
    privacy:'Your profile and campus discovery preferences.',
    safety:'Your StudentHood safety protections.',
    notifications:'Activity notifications are collected in Drops.',
    account:'Manage your StudentHood sign-in.',
    platform:'The age information provided by your device.',
    legal:'Policies and legal documents for StudentHood.'
  };
  async function openLegal(kind){
    try{
      const url=kind==='safety_document'?LEGAL_URLS.safety:kind==='privacy_document'?LEGAL_URLS.privacy:LEGAL_URLS.terms;
      await Linking.openURL(url);
    }catch(e){Alert.alert('Cannot open document',e?.message||'Please try again.')}
  }
  async function exit(){
    try{await signOut()}catch(e){Alert.alert('Could not sign out',e?.message||'Please try again.')}
  }

  return <View style={[styles.root,{backgroundColor:theme.bg}]}>
    <View style={[styles.header,{borderBottomColor:theme.line}]}>
      <Pressable onPress={onBack} accessibilityLabel="Back to profile" style={styles.back}>
        <Feather name="arrow-left" size={22} color={theme.text}/>
      </Pressable>
      <Text style={[styles.headerTitle,{color:theme.text}]}>{label}</Text>
      <View style={{width:42}}/>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.intro,{color:theme.muted}]}>{intro[page]}</Text>
      {(NAV[page]||[]).map(([name,icon,copy,destination])=><Pressable
        key={destination} onPress={()=>destination.endsWith('_document')?openLegal(destination):onNavigate(destination)}
        accessibilityRole="button"
        style={[styles.row,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          <View style={[styles.rowIcon,{backgroundColor:theme.accentSoft}]}>
            <Feather name={icon} size={19} color={theme.accent}/>
          </View>
          <View style={{flex:1}}>
            <Text style={[styles.rowTitle,{color:theme.text}]}>{name}</Text>
            <Text style={[styles.rowCopy,{color:theme.muted}]}>{copy}</Text>
          </View>
          <Feather name="chevron-right" size={19} color={theme.muted}/>
        </Pressable>
      ))}
      {page==='privacy'&&<>
        <Summary theme={theme} title="Profile visibility" value={profile?.profile_visibility||'Default privacy settings'}/>
        <Summary theme={theme} title="Location sharing" value={profile?.location_visibility||'Not shared'}/>
        <Text style={[styles.note,{color:theme.muted}]}>Your date of birth and sensitive safety details are not displayed to other users.</Text>
        <Pressable onPress={()=>openLegal('privacy_document')} style={styles.link}><Text style={[styles.linkText,{color:theme.accent}]}>Read privacy policy</Text></Pressable>
      </>}
      {page==='safety'&&<>
        <Summary theme={theme} title="Age protections" value={safety?.youth_account?'Teen Mode enabled':'Age and regional safety rules active'}/>
        <Summary theme={theme} title="Adult assurance" value={safety?.adult_access_verified?'Independently verified':'Adult-only content stays restricted until verification'}/>
        <Summary theme={theme} title="Age information review" value={safety?.age_conflict?'Review required':'No conflict reported'}/>
        <Pressable onPress={()=>openLegal('safety_document')} style={styles.link}><Text style={[styles.linkText,{color:theme.accent}]}>Read safety policy</Text></Pressable>
      </>}
      {page==='platform'&&<>
        <Summary theme={theme} title="Provider" value={profile?.platform_age_provider||'Not available'}/>
        <Summary theme={theme} title="Platform status" value={profile?.platform_age_status||'No age signal shared'}/>
        <Text style={[styles.note,{color:theme.muted}]}>StudentHood applies safer age restrictions when platform and declared age signals conflict.</Text>
      </>}
      {page==='notifications'&&<>
        <View style={[styles.noteCard,{backgroundColor:theme.surface,borderColor:theme.line}]}>
          <Feather name="bell" size={24} color={theme.accent}/>
          <Text style={[styles.note,{color:theme.muted}]}>All non-message activity appears directly under Drops. Conversations and message alerts remain within Ping.</Text>
          <Pressable onPress={onDrops} accessibilityRole="button" style={[styles.action,{backgroundColor:theme.accent}]}>
            <Text style={styles.actionText}>Open Drops</Text>
          </Pressable>
        </View>
      </>}
      {page==='account'&&<>
        <Summary theme={theme} title="Username" value={profile?.username?'@'+profile.username:'Not set'}/>
        <Summary theme={theme} title="Student ID" value={profile?.id||'Unavailable'}/>
        <Text style={[styles.note,{color:theme.muted}]}>For account deletion and data requests, contact StudentHood support. We will not delete an account automatically without an authorized request.</Text>
        <Pressable onPress={exit} accessibilityRole="button" style={[styles.signOut,{borderColor:theme.line,backgroundColor:theme.surface}]}>
          <Feather name="log-out" size={18} color={theme.danger}/>
          <Text style={[styles.signOutText,{color:theme.danger}]}>Sign out</Text>
        </Pressable>
      </>}
    </ScrollView>
  </View>;
}

function Summary({theme,title,value}){
 return <View style={[styles.summary,{borderColor:theme.line,backgroundColor:theme.surface}]}>
  <Text style={[styles.summaryTitle,{color:theme.muted}]}>{title}</Text>
  <Text style={[styles.summaryValue,{color:theme.text}]}>{value}</Text>
 </View>;
}

const styles=StyleSheet.create({
 root:{flex:1},
 header:{height:64,borderBottomWidth:StyleSheet.hairlineWidth,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 back:{width:42,height:42,alignItems:'center',justifyContent:'center'},
 headerTitle:{fontWeight:'900',fontSize:19},
 content:{padding:18,paddingBottom:60,maxWidth:800,width:'100%',alignSelf:'center',gap:10},
 intro:{fontSize:12,lineHeight:19,marginBottom:7},
 row:{flexDirection:'row',alignItems:'center',borderWidth:1,borderRadius:15,padding:13,minHeight:74,gap:12},
 rowIcon:{width:42,height:42,borderRadius:13,alignItems:'center',justifyContent:'center'},
 rowTitle:{fontSize:13,fontWeight:'800'},
 rowCopy:{fontSize:10,marginTop:4,lineHeight:15},
 summary:{borderWidth:1,borderRadius:15,padding:17,marginTop:5},
 summaryTitle:{fontSize:10},
 summaryValue:{fontSize:13,fontWeight:'800',marginTop:7},
 note:{fontSize:11,lineHeight:18,marginTop:9},
 link:{paddingVertical:15},
 linkText:{fontWeight:'800',fontSize:13},
 noteCard:{borderWidth:1,borderRadius:19,padding:22,alignItems:'center',gap:9},
 action:{paddingVertical:13,paddingHorizontal:24,borderRadius:13,marginTop:10},
 actionText:{color:'#fff',fontSize:12,fontWeight:'800'},
 signOut:{height:53,borderWidth:1,borderRadius:14,flexDirection:'row',gap:10,alignItems:'center',justifyContent:'center',marginTop:18},
 signOutText:{fontSize:13,fontWeight:'900'}
});