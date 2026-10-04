export const palettes={
  dark:{
    bg:'#090B0D',surface:'#121518',surface2:'#1A1E22',surface3:'#22272C',
    text:'#F4F5F6',muted:'#92999F',line:'#282D32',
    accent:'#F08A72',accentSoft:'#2B1C18',danger:'#FF7373',success:'#62C997'
  },
  light:{
    bg:'#F4F3F0',surface:'#FFFFFF',surface2:'#EEECE8',surface3:'#E3E0DB',
    text:'#171717',muted:'#706E6B',line:'#D9D6D1',
    accent:'#E8755D',accentSoft:'#F9E3DD',danger:'#C84343',success:'#21845D'
  }
};

export function themeForScheme(scheme){
  return palettes[scheme==='light'?'light':'dark'];
}
