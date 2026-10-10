import {useCallback,useEffect,useRef,useState} from 'react';
import {Keyboard,TextInput} from 'react-native';

// Keyboard awareness for ScrollViews inside full-screen pages and slide
// overlays. RN's onFocus.nativeEvent.target is a *native tag*, not a measurable
// TextInput ref. Always use the actual focused TextInput instance instead.
export default function useKeyboardAwareForm(){
  const scrollRef=useRef(null);
  const focusedInput=useRef(null);
  const scrollY=useRef(0);
  const keyboardTop=useRef(null);
  const timers=useRef([]);
  const [keyboardPadding,setKeyboardPadding]=useState(0);

  const clearTimers=useCallback(()=>{
    timers.current.forEach(clearTimeout);
    timers.current=[];
  },[]);

  const currentInput=useCallback(()=>{
    const node=TextInput.State?.currentlyFocusedInput?.();
    if(node?.measureInWindow)focusedInput.current=node;
    return focusedInput.current;
  },[]);

  const revealFocusedInput=useCallback(()=>{
    const scroll=scrollRef.current;
    const input=currentInput();
    if(!scroll||!input?.measureInWindow)return;
    const scrollNode=scroll.getNativeScrollRef?.()||scroll;
    if(!scrollNode?.measureInWindow)return;

    scrollNode.measureInWindow((sx,sy,sw,sh)=>{
      if(!Number.isFinite(sy)||!Number.isFinite(sh)||sh<=0)return;
      // If an Android window does not shrink for the keyboard (e.g. some
      // OEM keyboards), insert just enough extra scrollable space.
      const metrics=Keyboard.metrics?.();
      const top=keyboardTop.current??(metrics?.screenY??null);
      const overlap=top===null?0:Math.max(0,sy+sh-top);
      setKeyboardPadding(value=>Math.abs(value-overlap)<3?value:Math.ceil(overlap));

      const visibleBottom=Math.min(sy+sh,top??Infinity)-20;
      const visibleTop=sy+18;
      input.measureInWindow((ix,iy,iw,ih)=>{
        if(!Number.isFinite(iy)||!Number.isFinite(ih)||ih<=0)return;
        // Keep the field's label visible as well as its editable text.
        const bottomDelta=(iy+ih)-visibleBottom;
        const topDelta=(iy-34)-visibleTop;
        let delta=bottomDelta>0?bottomDelta:topDelta<0?topDelta:0;
        if(Math.abs(delta)>3){
          scroll.scrollTo({y:Math.max(0,scrollY.current+delta),animated:true});
        }
      });
    });
  },[currentInput]);

  const scheduleReveal=useCallback(()=>{
    clearTimers();
    // Focus, resize, and keyboard events can all arrive before the final
    // Android layout. Re-measure after both animation and layout settle.
    requestAnimationFrame(revealFocusedInput);
    timers.current=[
      setTimeout(revealFocusedInput,90),
      setTimeout(revealFocusedInput,260)
    ];
  },[clearTimers,revealFocusedInput]);

  useEffect(()=>{
    const show=Keyboard.addListener('keyboardDidShow',event=>{
      keyboardTop.current=event?.endCoordinates?.screenY??null;
      scheduleReveal();
    });
    const frame=Keyboard.addListener('keyboardDidChangeFrame',event=>{
      keyboardTop.current=event?.endCoordinates?.screenY??null;
      scheduleReveal();
    });
    const hide=Keyboard.addListener('keyboardDidHide',()=>{
      keyboardTop.current=null;
      focusedInput.current=null;
      clearTimers();
      setKeyboardPadding(0);
    });
    return()=>{
      show.remove();frame.remove();hide.remove();
      clearTimers();
    };
  },[clearTimers,scheduleReveal]);

  const onFieldFocus=useCallback(()=>{
    const input=TextInput.State?.currentlyFocusedInput?.();
    if(input?.measureInWindow)focusedInput.current=input;
    // A fresh native TextInput becomes available just after focus callback.
    requestAnimationFrame(()=>{
      currentInput();
      scheduleReveal();
    });
  },[currentInput,scheduleReveal]);

  const onScroll=useCallback(event=>{
    scrollY.current=Number(event.nativeEvent?.contentOffset?.y)||0;
  },[]);

  const onScrollLayout=useCallback(()=>{
    if(Keyboard.isVisible?.()||keyboardTop.current!==null)scheduleReveal();
  },[scheduleReveal]);

  return {scrollRef,onFieldFocus,onScrollLayout,onScroll,keyboardPadding};
}
