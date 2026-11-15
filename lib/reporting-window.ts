/** Shared UTC reporting interval: 28 inclusive dates, ending three days ago. */
export function googleWindow(now=new Date()){
 const end=new Date(now.getTime()-3*86400000),start=new Date(end.getTime()-27*86400000);
 return {start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
}
