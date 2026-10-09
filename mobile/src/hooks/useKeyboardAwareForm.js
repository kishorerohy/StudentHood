import {useCallback,useEffect,useRef} from 'react';
import {Keyboard} from 'react-native';

// Scroll the focused input into view once the keyboard is actually shown.
// This complements Android adjustResize and iOS KeyboardAvoidingView rather
// than relying on Android's inconsistent automatic focus scrolling.
export default function useKeyboardAwareForm(){
  const scrollRef=useRef(null);
  const focusedInput=useRef(null);

  const revealFocusedInput=useCallback(()=>{
    const node=focusedInput.current;
    if(!node)return;
    scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard?.(node,110,true);
  },[]);

  useEffect(()=>{
    const show=Keyboard.addListener('keyboardDidShow',revealFocusedInput);
    const hide=Keyboard.addListener('keyboardDidHide',()=>{
      focusedInput.current=null;
    });
    return()=>{show.remove();hide.remove();};
  },[revealFocusedInput]);

  const onFieldFocus=useCallback(event=>{
    focusedInput.current=event?.nativeEvent?.target||null;
    requestAnimationFrame(revealFocusedInput);
  },[revealFocusedInput]);

  // If the viewport changes while the keyboard is up, keep the current field
  // visible. No aggressive scroll-to-top on keyboard dismissal.
  const onScrollLayout=useCallback(()=>{
    if(Keyboard.isVisible?.())requestAnimationFrame(revealFocusedInput);
  },[revealFocusedInput]);

  return {scrollRef,onFieldFocus,onScrollLayout};
}
