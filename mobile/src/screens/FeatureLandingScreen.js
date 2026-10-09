import React,{useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {SceneIcon} from '../icons';

// UI shells with honest empty states. Hangs, Gigs, Crews and authored Pulse
// do not yet have a released data service; never fabricate entries or RSVPs.
const CONFIG={
  Pulse:{
    eyebrow:'THE MOMENTS IN BETWEEN',title:'Pulse',intro:'Small moments. Your real campus circle.',
    icon:'circle',accent:'#AF91F2',
    filters:['Peeps','Campus','Your Pulse'],
    emptyTitle:'Your Pulse begins here',
    emptyText:'When Pulse sharing launches, moments from permitted Peeps and your campus will appear here.',
    action:'Create a Pulse'
  },
  Hangs:{
    eyebrow:'MEET OUTSIDE THE FEED',title:'Hangs',intro:'Make plans. Meet people. Find your next campus moment.',
    icon:'calendar',accent:'#5FC5BE',
    filters:['All','Social','Study','Sports','Culture'],
    emptyTitle:'Hangs are coming to campus',
    emptyText:'Campus meetups will appear here after events, RSVPs, and safety moderation are ready.',
    action:'Start a Hang'
  },
  Crews:{
    eyebrow:'FIND YOUR COMMUNITY',title:'Crews',intro:'Real communities, real campus life.',
    icon:'users',accent:'#9D96EE',
    filters:['Explore','Joined','Study','Arts','Tech','Sports'],
    emptyTitle:'A place for every Crew',
    emptyText:'Student communities and their member-only conversations will appear when Crews launches.',
    action:'Create a Crew'
  },
  Gigs:{
    eyebrow:'YOUR NEXT OPPORTUNITY',title:'Gigs',intro:'Opportunities that fit student life.',
    icon:'briefcase',accent:'#E6AD68',
    filters:['All','Part-time','Internships','Campus','Remote'],
    emptyTitle:'Student opportunities are on the way',
    emptyText:'Verified listings, pay, hours, eligibility, and safe applications will appear when Gigs launches.',
    action:'Post a Gig'
  }
};

export default function FeatureLandingScreen({kind,theme,profile,onDiscover,onBack}){
  const config=CONFIG[kind]||CONFIG.Hangs;
  const [filter,setFilter]=useState(config.filters[0]);
  const canDiscover=typeof onDiscover==='function';
  return <ScrollView
    style={[styles.root,{backgroundColor:theme.bg}]}
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}>
    <View style={styles.heading}>
      {!!onBack&&<Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={[styles.back,{backgroundColor:theme.surface,borderColor:theme.line}]}><Feather name="arrow-left" color={theme.text} size={20}/></Pressable>}
      <Text style={[styles.eyebrow,{color:theme.accent}]}>{config.eyebrow}</Text>
      <Text style={[styles.headingText,{color:theme.text}]}>{config.title}</Text>
      <Text style={[styles.intro,{color:theme.muted}]}>{config.intro}</Text>
    </View>
    <View style={[styles.hero,{borderColor:theme.line,backgroundColor:theme.isLight?'#EDEBE9':'#192229'}]}>
      <View style={[styles.heroOrbit,{borderColor:theme.isLight?'#CBC5CE':'#38414B'}]}/>
      <View style={[styles.heroOrbitSmall,{borderColor:theme.isLight?'#C8C6D7':'#43505C'}]}/>
      <View style={[styles.heroIcon,{backgroundColor:theme.isLight?'rgba(255,255,255,0.84)':'rgba(12,18,25,0.80)',borderColor:theme.line}]}>
        {kind==='Pulse'?<SceneIcon color={config.accent} size={35}/>:<Feather name={config.icon} color={config.accent} size={34}/>}
      </View>
      <Text style={[styles.heroTitle,{color:theme.text}]}>{kind==='Hangs'?'Be part of something':kind==='Gigs'?'Make your next move':kind==='Pulse'?'Life happens between Scenes':'Belong to something'}</Text>
      <Text style={[styles.heroBody,{color:theme.muted}]}>{kind==='Hangs'?'Meetups and events shaped by your campus.':kind==='Gigs'?'Find real opportunities with clear details.':kind==='Pulse'?'Only moments shared with you will appear here.':'Find students who share your interests.'}</Text>
      <View style={[styles.privacyTag,{borderColor:theme.line,backgroundColor:theme.isLight?'rgba(255,255,255,0.68)':'rgba(8,12,18,0.48)'}]}>
        <Feather name="shield" color={theme.muted} size={13}/>
        <Text style={[styles.privacyText,{color:theme.muted}]}>Campus and privacy controls respected</Text>
      </View>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {config.filters.map(name=><Pressable
        key={name}
        accessibilityRole="button"
        accessibilityState={{selected:filter===name}}
        onPress={()=>setFilter(name)}
        style={[styles.filter,{backgroundColor:filter===name?theme.accent:theme.surface,borderColor:filter===name?theme.accent:theme.line}]}>
        <Text style={[styles.filterText,{color:filter===name?'#fff':theme.text}]}>{name}</Text>
      </Pressable>)}
    </ScrollView>
    <View style={[styles.empty,{backgroundColor:theme.surface,borderColor:theme.line}]}>
      <View style={[styles.emptyBadge,{backgroundColor:theme.accentSoft}]}>
        <Feather name="clock" color={theme.accent} size={22}/>
      </View>
      <Text style={[styles.emptyTitle,{color:theme.text}]}>{config.emptyTitle}</Text>
      <Text style={[styles.emptyText,{color:theme.muted}]}>{config.emptyText}</Text>
      <View style={[styles.pending,{borderColor:theme.line,backgroundColor:theme.surface2}]}>
        <Feather name="lock" color={theme.muted} size={14}/>
        <Text style={[styles.pendingText,{color:theme.muted}]}>{config.action} · Available after launch</Text>
      </View>
    </View>
    {canDiscover&&kind!=='Pulse'&&<Pressable
      accessibilityRole="button"
      onPress={onDiscover}
      style={[styles.discoverLink,{borderColor:theme.line,backgroundColor:theme.surface}]}>
      <Feather name="compass" size={18} color={theme.accent}/>
      <Text style={[styles.linkText,{color:theme.text}]}>Explore students through Discover</Text>
      <Feather name="chevron-right" size={17} color={theme.muted}/>
    </Pressable>}
    {!!profile?.campus_name&&<View style={styles.campusRow}>
      <Feather name="map-pin" size={14} color={theme.muted}/>
      <Text style={[styles.campusText,{color:theme.muted}]} numberOfLines={1}>{profile.campus_name}</Text>
    </View>}
  </ScrollView>;
}
const styles=StyleSheet.create({
  root:{flex:1},
  content:{maxWidth:900,width:'100%',alignSelf:'center',paddingHorizontal:14,paddingTop:20,paddingBottom:120},
  heading:{marginBottom:22},
  back:{borderRadius:14,borderWidth:1,height:43,width:43,alignItems:'center',justifyContent:'center',marginBottom:14},
  eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.4,marginBottom:6},
  headingText:{fontSize:36,fontWeight:'900',letterSpacing:-1.2},
  intro:{fontSize:13,lineHeight:20,marginTop:6},
  hero:{minHeight:265,overflow:'hidden',borderWidth:1,borderRadius:25,padding:23,justifyContent:'center',alignItems:'center',gap:12},
  heroOrbit:{position:'absolute',height:340,width:340,borderRadius:170,borderWidth:1,top:-125,right:-95},
  heroOrbitSmall:{position:'absolute',height:250,width:250,borderRadius:125,borderWidth:1,bottom:-160,left:-90},
  heroIcon:{height:74,width:74,borderRadius:27,alignItems:'center',justifyContent:'center',borderWidth:1},
  heroTitle:{fontSize:23,fontWeight:'800',textAlign:'center',marginTop:4},
  heroBody:{fontSize:12,lineHeight:20,textAlign:'center',maxWidth:290},
  privacyTag:{borderWidth:1,borderRadius:20,flexDirection:'row',gap:7,paddingHorizontal:11,paddingVertical:7,alignItems:'center',marginTop:5},
  privacyText:{fontSize:10},
  filters:{paddingVertical:20,gap:8},
  filter:{minHeight:37,borderRadius:25,borderWidth:1,paddingHorizontal:16,alignItems:'center',justifyContent:'center'},
  filterText:{fontSize:11,fontWeight:'800'},
  empty:{borderWidth:1,borderRadius:23,padding:26,alignItems:'center',minHeight:240,justifyContent:'center'},
  emptyBadge:{height:52,width:52,borderRadius:26,alignItems:'center',justifyContent:'center'},
  emptyTitle:{fontSize:18,fontWeight:'900',textAlign:'center',marginTop:15},
  emptyText:{fontSize:12,lineHeight:19,textAlign:'center',marginTop:9,maxWidth:380},
  pending:{borderWidth:1,borderRadius:22,paddingHorizontal:14,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:8,marginTop:17},
  pendingText:{fontSize:10,fontWeight:'700'},
  discoverLink:{borderWidth:1,borderRadius:18,padding:17,marginTop:13,flexDirection:'row',alignItems:'center',gap:12},
  linkText:{flex:1,fontWeight:'800',fontSize:12},
  campusRow:{alignSelf:'center',flexDirection:'row',alignItems:'center',gap:7,marginTop:20,maxWidth:'90%'},
  campusText:{fontSize:11,flexShrink:1}
});
