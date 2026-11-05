/** Inline <head> script: applies the saved novice mode before first paint (no flash). Kept outside "use client" files. */
export const NOVICE_BOOT = "try{if(localStorage.getItem('pr:novice')==='1')document.documentElement.dataset.novice='1'}catch(e){}";
