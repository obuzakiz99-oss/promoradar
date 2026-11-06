/** Beginner mode (header switch) was removed on 06.11 at the owner's request: turn it off for anyone who had it on. */
export const NOVICE_BOOT = "try{localStorage.removeItem('pr:novice');delete document.documentElement.dataset.novice}catch(e){}";
